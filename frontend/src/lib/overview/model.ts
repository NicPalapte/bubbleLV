// Kennzahlen des Überblicks (WP-L, Schritt 3). Rechnet einmal je Filterwechsel
// über dem flachen Positions-Index — nie im Render und nie über dem Baum
// (WP-I, docs/decisions/0010-positions-index-und-aggregate.md).
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gezählt wird, was
// der aktive Filter durchlässt. Ohne Filter steht hier dieselbe Summe wie im
// Tabellenkopf.
//
// **Ohne Preise** (x83) trägt die Menge die Aussage: die Treemap misst dann
// Positionen statt Euro, und die Pareto-Auswertung entfällt ausdrücklich,
// statt Nullwerte zu zeigen (WP-L, Schritt 4).

import { attrString } from '../attributes';
import { headingOf } from '../tree/heading';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

/** Sammelname für Positionen, denen die Klassifizierung kein Gewerk zuordnet. */
export const NO_GEWERK = 'Ohne Gewerk';

/** Womit die Treemap misst. */
export type Measure = 'preis' | 'anzahl';

/** Schlüssel der Sammelgruppe — kein Gewerk-Name, deshalb nicht filterbar. */
export const REST_GROUP = 'rest';

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

export interface TreemapCell {
  /** Knoten-ID des Abschnitts — Sprungziel und Schlüssel zugleich. */
  key: string;
  label: string;
  value: number;
  count: number;
  /** Kachel steht für mehrere kleine Abschnitte, nicht für einen einzelnen. */
  collected: boolean;
}

export interface TreemapGroup {
  /** Gewerk-Name; zugleich der Filterwert der Facette `gewerk`. */
  key: string;
  label: string;
  value: number;
  count: number;
  /** `false` für die Sammelkachel „Weitere Gewerke" und „Ohne Gewerk". */
  filterable: boolean;
  cells: TreemapCell[];
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
  units: UnitTotal[];
}

/** Anteil, ab dem die Pareto-Auswertung abliest (80/20-Regel). */
const PARETO_SHARE = 0.8;

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/**
 * Abschnitt, unter dem eine Position in Tabelle und Baum steht — ihr direkter
 * Elternknoten. Gleiche Überschrift wie die Gruppenzeile der Tabelle, damit man
 * die Kachel dort wiederfindet.
 */
function sectionOf(
  node: LVNode,
  parents: ReadonlyMap<string, LVNode | null>,
): { key: string; label: string } {
  const parent = parents.get(node.id) ?? null;
  if (parent === null) return { key: node.id, label: headingOf(node) };
  return { key: parent.id, label: headingOf(parent) };
}

interface Bucket {
  key: string;
  label: string;
  value: number;
  count: number;
  cells: Map<string, TreemapCell>;
}

function bucketOf(buckets: Map<string, Bucket>, key: string, label: string): Bucket {
  const found = buckets.get(key);
  if (found !== undefined) return found;
  const created: Bucket = { key, label, value: 0, count: 0, cells: new Map() };
  buckets.set(key, created);
  return created;
}

/**
 * Kacheln kürzen: die größten einzeln, der Rest als **eine** Sammelkachel.
 *
 * Der Schlüssel der Sammelkachel trägt den Gruppenschlüssel. Ohne ihn hießen
 * die Sammelkacheln zweier Gewerke gleich, und beim Zusammenfassen mehrerer
 * Gewerke ständen zwei Kacheln mit demselben Schlüssel nebeneinander — React
 * ordnet sie dann falsch zu oder zeichnet sie gar nicht.
 */
function trimCells(cells: Iterable<TreemapCell>, groupKey: string): TreemapCell[] {
  const sorted = [...cells].sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_CELLS_PER_GROUP) return sorted;
  const kept = sorted.slice(0, MAX_CELLS_PER_GROUP - 1);
  const rest = sorted.slice(MAX_CELLS_PER_GROUP - 1);
  kept.push({
    key: `rest:${groupKey}`,
    label: `Weitere ${rest.length} Abschnitte`,
    value: rest.reduce((sum, cell) => sum + cell.value, 0),
    count: rest.reduce((sum, cell) => sum + cell.count, 0),
    collected: true,
  });
  return kept;
}

/**
 * Kacheln mehrerer Gewerke zu einer Liste zusammenführen. Derselbe Abschnitt
 * kann Positionen aus mehreren Gewerken enthalten — dann gehört er in **eine**
 * Kachel mit der Summe beider, nicht zweimal in dieselbe Gruppe.
 */
function mergeCells(groups: readonly TreemapGroup[]): TreemapCell[] {
  const merged = new Map<string, TreemapCell>();
  for (const group of groups) {
    for (const cell of group.cells) {
      const found = merged.get(cell.key);
      if (found === undefined) merged.set(cell.key, { ...cell });
      else {
        found.value += cell.value;
        found.count += cell.count;
      }
    }
  }
  return [...merged.values()];
}

/**
 * Gruppen kürzen und erst danach ihre Kacheln: die Sammelgruppe führt die
 * Abschnitte ihrer Gewerke zusammen, bevor gekürzt wird. Andersherum stünden in
 * ihr die bereits gekürzten Listen mehrerer Gewerke — mit doppelten Abschnitten
 * und doppelten Sammelkacheln.
 */
function trimGroups(groups: TreemapGroup[]): TreemapGroup[] {
  const sorted = groups.sort((a, b) => b.value - a.value);
  const kept = sorted.length <= MAX_GROUPS ? sorted : sorted.slice(0, MAX_GROUPS - 1);
  if (sorted.length > MAX_GROUPS) {
    const rest = sorted.slice(MAX_GROUPS - 1);
    kept.push({
      key: REST_GROUP,
      label: `Weitere ${rest.length} Gewerke`,
      value: rest.reduce((sum, group) => sum + group.value, 0),
      count: rest.reduce((sum, group) => sum + group.count, 0),
      filterable: false,
      cells: mergeCells(rest),
    });
  }
  return kept.map((group) => ({ ...group, cells: trimCells(group.cells, group.key) }));
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

    const bucket = bucketOf(buckets, gewerk ?? NO_GEWERK, gewerk ?? NO_GEWERK);
    bucket.count++;
    bucket.value += Number.isFinite(price) ? price : 0;

    const section = sectionOf(node, parents);
    const cell = bucket.cells.get(section.key) ?? {
      key: section.key,
      label: section.label,
      value: 0,
      count: 0,
      collected: false,
    };
    cell.count++;
    cell.value += Number.isFinite(price) ? price : 0;
    bucket.cells.set(section.key, cell);

    const unitKey = canonicalUnit(position.unit);
    const quantity = index.quantity[slot];
    if (unitKey !== null && Number.isFinite(quantity)) {
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
      label: bucket.key === NO_GEWERK ? 'Ohne Gewerk' : bucket.label,
      // Ohne Preise misst die Fläche die Anzahl — sonst stünde überall 0.
      value: measure === 'preis' ? bucket.value : bucket.count,
      count: bucket.count,
      filterable: bucket.key !== NO_GEWERK,
      // Ungekürzt: `trimGroups` fasst erst die Gruppen zusammen und kürzt die
      // Kacheln danach — sonst landen gekürzte Listen in der Sammelgruppe.
      cells: [...bucket.cells.values()].map((cell) => ({
        ...cell,
        value: measure === 'preis' ? cell.value : cell.count,
      })),
    })),
  );

  return {
    measure,
    groups,
    pareto: hasPrices ? paretoOf(prices, totalPrice) : null,
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
