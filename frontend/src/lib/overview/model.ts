// Kennzahlen des Überblicks (WP-L, Schritt 3). Rechnet einmal je Filterwechsel
// über dem flachen Positions-Index — nie im Render und nie über dem Baum
// (WP-I, docs/decisions/0010-positions-index-und-aggregate.md).
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gezählt wird, was
// der aktive Filter durchlässt. Ohne Filter steht hier dieselbe Summe wie im
// Tabellenkopf.
//
// **Ohne Preise** (x83) trägt die Menge die Aussage: die Treemap misst dann
// Positionen statt Euro, und statt Pareto stehen die größten Mengen je Einheit
// (WP-L, Schritt 4).
//
// **Ohne Klassifizierung:** die Verteilung gliedert nach Hauptabschnitt und
// Einheit — beides steht in jeder Datei. Nach Gewerk zu gliedern hing am
// Gewerk-Abgleich, der ohne Katalog fast alles in „Ohne Gewerk" legt.

import { attrString } from '../attributes';
import { NO_GEWERK } from '../facets';
import { headingOf } from '../tree/heading';
import { isPauschal } from '../graph/sizes';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

export { NO_GEWERK };

/** Womit die Treemap misst. */
export type Measure = 'preis' | 'anzahl';

/** Mehr Kacheln liest niemand mehr ab; der Rest wird zusammengefasst. */
export const MAX_GROUPS = 10;
export const MAX_CELLS_PER_GROUP = 12;

/** Stützstellen der Pareto-Kurve — mehr Punkte sieht man auf 300 px nicht. */
const CURVE_POINTS = 120;

export interface OverviewMetrics {
  /** Positionen im aktiven Filter. */
  positions: number;
  /** Positionen im ganzen LV — Bezugsgröße, wenn gefiltert wird. */
  totalPositions: number;
  filtering: boolean;
  /** Führt die Datei überhaupt Preise? x83 tut das meist nicht. */
  hasPrices: boolean;
  /** Summe Menge × EP über die gefilterten Positionen. */
  totalPrice: number;
  /** Anzahl verschiedener Gewerke im Filter (ohne die unklassifizierten). */
  gewerke: number;
  /** Positionen ohne Einheitspreis — bei Dateien mit Preisen die Lücken. */
  withoutPrice: number;
  /** Anteil davon an `positions` (0…1); 0, wenn nichts im Filter liegt. */
  withoutPriceShare: number;
  /** Positionen ohne Menge — ohne Preise die entsprechende Lücke. */
  withoutQuantity: number;
  withoutQuantityShare: number;
}

/** Sammelwert für Positionen ohne Einheit. */
export const NO_UNIT = 'ohne Einheit';
/** Sammelgruppe für Positionen, die direkt unter Los oder LV stehen. */
export const NO_SECTION = 'Ohne Abschnitt';

/** So viele Positionen zeigt „Größte Mengen" je Einheit. */
export const LARGEST_PER_UNIT = 8;

export interface TreemapCell {
  /** Einheit (Vergleichsschlüssel wie im Filter) oder `NO_UNIT`. */
  key: string;
  label: string;
  value: number;
  count: number;
  /** Kachel steht für mehrere kleine Abschnitte, nicht für einen einzelnen. */
  collected: boolean;
}

export interface TreemapGroup {
  /** Knoten-ID des Hauptabschnitts — Sprungziel und Schlüssel zugleich. */
  key: string;
  label: string;
  value: number;
  count: number;
  /** `false` für die Sammelkachel „Weitere Abschnitte" und „Ohne Abschnitt". */
  pickable: boolean;
  /** Stelle im LV — bestimmt die Farbe, damit sie beim Filtern nicht wandert. */
  order: number;
  cells: TreemapCell[];
}

export interface LargestPosition {
  nodeId: string;
  oz: string;
  shortText: string;
  quantity: number;
}

export interface LargestByUnit {
  key: string;
  label: string;
  /** Positionen dieser Einheit im Filter. */
  count: number;
  /** Die größten Mengen, absteigend. */
  items: LargestPosition[];
}

export interface ParetoModel {
  /** Positionen, die zusammen 80 % der Summe tragen. */
  positions: number;
  /** Ihr Anteil an allen Positionen im Filter (0…1). */
  share: number;
  /** Kumulierte Kurve: x = Anteil Positionen, y = Anteil Summe (je 0…1). */
  curve: ReadonlyArray<{ x: number; y: number }>;
}

export interface UnitTotal {
  /** Vergleichsschlüssel der Einheit — derselbe wie im Filter (lib/units.ts). */
  key: string;
  label: string;
  quantity: number;
  count: number;
}

export interface OverviewModel {
  metrics: OverviewMetrics;
  measure: Measure;
  groups: TreemapGroup[];
  /** `null`, wenn die Datei keine Preise führt — dann gibt es nichts zu ordnen. */
  pareto: ParetoModel | null;
  /** Ohne Preise: größte Mengen je Einheit, Einheiten nach Anzahl Positionen. */
  largest: LargestByUnit[];
  units: UnitTotal[];
}

/** Anteil, ab dem die Pareto-Auswertung abliest (80/20-Regel). */
const PARETO_SHARE = 0.8;

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/**
 * Hauptabschnitt einer Position: der oberste Abschnitt über ihr, Lose
 * übersprungen. `null`, wenn sie direkt unter Los oder LV steht.
 */
function mainSectionOf(
  node: LVNode,
  parents: ReadonlyMap<string, LVNode | null>,
  cache: Map<string, LVNode | null>,
): LVNode | null {
  const parent = parents.get(node.id) ?? null;
  if (parent === null) return null;
  const known = cache.get(parent.id);
  if (known !== undefined) return known;
  let top: LVNode | null = null;
  for (let up: LVNode | null = parent; up !== null; up = parents.get(up.id) ?? null) {
    if (up.kind === 'section') top = up;
  }
  cache.set(parent.id, top);
  return top;
}

interface Bucket {
  key: string;
  label: string;
  value: number;
  count: number;
  order: number;
  cells: Map<string, TreemapCell>;
}

/**
 * Rang jedes Hauptabschnitts in LV-Reihenfolge, über die ganze Datei — nicht
 * über die Filtermenge, sonst rutschten Farben nach, wenn ein Abschnitt
 * herausfällt.
 */
function sectionOrder(
  index: OverviewInput['index'],
  parents: ReadonlyMap<string, LVNode | null>,
  cache: Map<string, LVNode | null>,
): Map<string, number> {
  const order = new Map<string, number>();
  for (let slot = 0; slot < index.size; slot++) {
    const key = mainSectionOf(index.nodes[slot], parents, cache)?.id ?? '';
    if (!order.has(key)) order.set(key, order.size);
  }
  return order;
}

function bucketOf(buckets: Map<string, Bucket>, key: string, label: string, order: number): Bucket {
  const found = buckets.get(key);
  if (found !== undefined) return found;
  const created: Bucket = { key, label, value: 0, count: 0, order, cells: new Map() };
  buckets.set(key, created);
  return created;
}

/** Gleiche Einheiten aus mehreren Gruppen zu einer Kachel zusammenlegen. */
function mergeCells(cells: Iterable<TreemapCell>): TreemapCell[] {
  const merged = new Map<string, TreemapCell>();
  for (const cell of cells) {
    const found = merged.get(cell.key);
    if (found === undefined) merged.set(cell.key, { ...cell });
    else {
      found.value += cell.value;
      found.count += cell.count;
    }
  }
  return [...merged.values()];
}

/** Kacheln kürzen: die größten einzeln, der Rest als eine Sammelkachel. */
function trimCells(cells: Iterable<TreemapCell>): TreemapCell[] {
  const sorted = [...cells].sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_CELLS_PER_GROUP) return sorted;
  const kept = sorted.slice(0, MAX_CELLS_PER_GROUP - 1);
  const rest = sorted.slice(MAX_CELLS_PER_GROUP - 1);
  kept.push({
    key: `rest:${kept.length}`,
    label: `Weitere ${rest.length} Einheiten`,
    value: rest.reduce((sum, cell) => sum + cell.value, 0),
    count: rest.reduce((sum, cell) => sum + cell.count, 0),
    collected: true,
  });
  return kept;
}

function trimGroups(groups: TreemapGroup[]): TreemapGroup[] {
  const sorted = groups.sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_GROUPS) return sorted;
  const kept = sorted.slice(0, MAX_GROUPS - 1);
  const rest = sorted.slice(MAX_GROUPS - 1);
  kept.push({
    key: 'rest',
    label: `Weitere ${rest.length} Abschnitte`,
    value: rest.reduce((sum, group) => sum + group.value, 0),
    count: rest.reduce((sum, group) => sum + group.count, 0),
    pickable: false,
    order: -1,
    cells: trimCells(mergeCells(rest.flatMap((group) => group.cells))),
  });
  return kept;
}

function paretoOf(values: readonly number[], total: number): ParetoModel | null {
  if (total <= 0 || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => b - a);

  let running = 0;
  let positions = sorted.length;
  const curve: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  // Ausdünnen statt jeden Punkt zu führen: die Kurve ist monoton, zwischen zwei
  // Stützstellen geht keine Aussage verloren.
  const step = Math.max(1, Math.ceil(sorted.length / CURVE_POINTS));
  let reached = false;

  for (let i = 0; i < sorted.length; i++) {
    running += sorted[i];
    if (!reached && running >= total * PARETO_SHARE) {
      positions = i + 1;
      reached = true;
    }
    if (i % step === 0 || i === sorted.length - 1) {
      curve.push({ x: (i + 1) / sorted.length, y: running / total });
    }
  }

  return { positions, share: share(positions, sorted.length), curve };
}

/**
 * Größte Mengen je Einheit. Nur innerhalb einer Einheit vergleichbar — 300 m²
 * und 12 m³ in eine Rangfolge zu bringen, wäre eine Scheinaussage.
 */
function largestOf(index: PositionIndex, slotsByUnit: Map<string, number[]>): LargestByUnit[] {
  return [...slotsByUnit]
    .map(([key, slots]) => ({
      key,
      label: unitLabel(key),
      count: slots.length,
      items: [...slots]
        .sort((a, b) => index.quantity[b] - index.quantity[a])
        .slice(0, LARGEST_PER_UNIT)
        .map((slot) => ({
          nodeId: index.nodes[slot].id,
          oz: index.positions[slot].oz,
          shortText: index.positions[slot].shortText,
          quantity: index.quantity[slot],
        })),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
}

export interface OverviewInput {
  index: PositionIndex;
  /** Trefferbitmaske des aktiven Filters; `null` = kein Filter aktiv. */
  mask: Uint8Array | null;
  parents: ReadonlyMap<string, LVNode | null>;
}

export function buildOverview({ index, mask, parents }: OverviewInput): OverviewModel {
  const buckets = new Map<string, Bucket>();
  const units = new Map<string, UnitTotal>();
  const gewerke = new Set<string>();
  const prices: number[] = [];
  const mainSections = new Map<string, LVNode | null>();
  const slotsByUnit = new Map<string, number[]>();
  const orderOf = sectionOrder(index, parents, mainSections);

  let positions = 0;
  let totalPrice = 0;
  let withoutPrice = 0;
  let withoutQuantity = 0;
  let pricedPositions = 0;

  for (let slot = 0; slot < index.size; slot++) {
    if (mask !== null && mask[slot] === 0) continue;
    positions++;

    const position = index.positions[slot];
    const node = index.nodes[slot];
    const gewerk = attrString(position.attributes, 'gewerk');
    if (gewerk !== null) gewerke.add(gewerk);

    const price = index.totalPrice[slot];
    if (Number.isFinite(index.unitPrice[slot])) pricedPositions++;
    else withoutPrice++;
    if (!Number.isFinite(index.quantity[slot])) withoutQuantity++;
    if (Number.isFinite(price)) {
      totalPrice += price;
      prices.push(price);
    }

    const unitKey = canonicalUnit(position.unit);
    const main = mainSectionOf(node, parents, mainSections);
    const key = main?.id ?? '';
    const label = main === null ? NO_SECTION : headingOf(main);
    const bucket = bucketOf(buckets, key, label, orderOf.get(key) ?? buckets.size);
    bucket.count++;
    bucket.value += Number.isFinite(price) ? price : 0;

    const cellKey = unitKey ?? NO_UNIT;
    const cell = bucket.cells.get(cellKey) ?? {
      key: cellKey,
      label: unitKey === null ? NO_UNIT : unitLabel(unitKey),
      value: 0,
      count: 0,
      collected: false,
    };
    cell.count++;
    cell.value += Number.isFinite(price) ? price : 0;
    bucket.cells.set(cellKey, cell);

    const quantity = index.quantity[slot];
    if (unitKey !== null && Number.isFinite(quantity)) {
      // Pauschalen haben die Menge 1 — eine Rangfolge darüber sagt nichts.
      if (!isPauschal(position.unit)) {
        const unitSlots = slotsByUnit.get(unitKey) ?? [];
        unitSlots.push(slot);
        slotsByUnit.set(unitKey, unitSlots);
      }
      const total = units.get(unitKey) ?? {
        key: unitKey,
        label: unitLabel(unitKey),
        quantity: 0,
        count: 0,
      };
      total.quantity += quantity;
      total.count++;
      units.set(unitKey, total);
    }
  }

  const hasPrices = pricedPositions > 0;
  const measure: Measure = hasPrices ? 'preis' : 'anzahl';

  const groups = trimGroups(
    [...buckets.values()].map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      // Ohne Preise misst die Fläche die Anzahl — sonst stünde überall 0.
      value: measure === 'preis' ? bucket.value : bucket.count,
      count: bucket.count,
      pickable: bucket.key !== '',
      order: bucket.order,
      cells: trimCells(
        [...bucket.cells.values()].map((cell) => ({
          ...cell,
          value: measure === 'preis' ? cell.value : cell.count,
        })),
      ),
    })),
  );

  return {
    measure,
    groups,
    pareto: hasPrices ? paretoOf(prices, totalPrice) : null,
    largest: hasPrices ? [] : largestOf(index, slotsByUnit),
    units: [...units.values()].sort((a, b) => b.quantity - a.quantity),
    metrics: {
      positions,
      totalPositions: index.size,
      filtering: mask !== null,
      hasPrices,
      totalPrice,
      gewerke: gewerke.size,
      withoutPrice,
      withoutPriceShare: share(withoutPrice, positions),
      withoutQuantity,
      withoutQuantityShare: share(withoutQuantity, positions),
    },
  };
}
