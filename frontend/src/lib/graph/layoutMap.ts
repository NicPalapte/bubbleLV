// Layout des Bubble-Graphen (docs/decisions/0035-graph-gliederung.md).
//
// Zwei Gliederungen, eine Bildsprache: Gruppen sind Kreise, deren Fläche der
// Anzahl ihrer Positionen folgt; die Positionen liegen als Punkte darin.
//  - „nach LV": eine Gruppe je Abschnitt der untersten Ebene (der Elternknoten
//    der Position), die Lose als gestrichelte Hülle darum.
//  - „frei": Zeilen sind die Werte eines Merkmals, Spalten optional die eines
//    zweiten — eine Matrix. Ohne Spalten liegen die Gruppen gepackt.
//
// Reine Funktion über dem Positions-Index: kein DOM, kein Zoom. Die Gruppenlage
// hängt nur an Datei, Gliederung, Größe und — beim Ausblenden oder in „frei" —
// an der Treffermenge, nie am Ausschnitt.

import { GROUP_GAP, HULL_GAP, HULL_PAD, groupRadius } from './constants';
import { packCircles, type Circle } from './pack';
import { isPauschal } from './sizes';
import { FACETS, facetOptionLabel, type Facet } from '../facets';
import { formatNumber } from '../format';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

export type GraphLayoutId = 'lv' | 'frei';

/**
 * Merkmale, nach denen „frei" gliedern kann: nur solche mit genau einem Wert je
 * Position. Bei Normen oder Expositionsklassen stünde eine Position in mehreren
 * Zellen zugleich — der Punkt wäre dann nicht mehr eindeutig.
 */
export const AXIS_FACETS: readonly string[] = [
  'einheit',
  'gewerk',
  'positionsart',
  'bauteiltyp',
  'positionstyp',
  'beton',
];

/** Sammelwert für Positionen, denen das Merkmal fehlt. */
export const NO_VALUE = 'ohne Angabe';

export interface MapOptions {
  layout: GraphLayoutId;
  /** Facetten-ID der Zeilen bzw. Spalten (nur „frei"). */
  rows: string;
  cols: string | null;
  /** Radius je Indexeintrag (sizes.ts). */
  radii: Float64Array;
  /** Treffer je Indexeintrag; `null` = es wird nicht gefiltert. */
  mask: Uint8Array | null;
  /** Nicht-Treffer fallen aus dem Layout statt gedämpft zu bleiben. */
  hide: boolean;
  /** Gewählte Filterwerte je Facette — sie bestimmen die Achsen in „frei". */
  selected: Readonly<Record<string, ReadonlySet<string>>>;
}

export interface MapGroup {
  key: string;
  /** Abschnitt im LV-Baum; in „frei" `null` — die Gruppe ist kein Knoten. */
  nodeId: string | null;
  /** Titel über dem Kreis; leer in der Matrix, dort tragen die Achsen ihn. */
  title: string;
  /** Übergeordnete Ebene, klein über dem Titel („nach LV"). */
  context: string;
  /** Mengensumme, wenn die Gruppe genau eine Einheit hat. */
  sum: string;
  x: number;
  y: number;
  r: number;
  /** Indexeinträge der Positionen in dieser Gruppe. */
  slots: number[];
  /** Sammelgruppe der Nicht-Treffer in „frei". */
  rest: boolean;
}

export interface MapHull {
  id: string;
  title: string;
  x: number;
  y: number;
  r: number;
  /** Indexeinträge aller Positionen im Los. */
  slots: number[];
}

export interface MapAxes {
  rowKey: string;
  colKey: string;
  rows: ReadonlyArray<{ label: string; y: number }>;
  cols: ReadonlyArray<{ label: string; x: number }>;
  x0: number;
  y0: number;
}

export interface MapLayout {
  groups: MapGroup[];
  hulls: MapHull[];
  axes: MapAxes | null;
  /** Lage je Indexeintrag; `NaN` = die Position steht nicht im Graphen. */
  px: Float64Array;
  py: Float64Array;
  /** Gruppe je Indexeintrag; -1 = keine. */
  groupOf: Int32Array;
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

/** Platz über einem Kreis für Titel und Kennzeile. */
const LABEL_SPACE = 40;
const GOLDEN_ANGLE = 2.39996;

function isHit(mask: Uint8Array | null, slot: number): boolean {
  return mask === null || mask[slot] === 1;
}

function sumLabel(index: PositionIndex, slots: readonly number[]): string {
  let unit: string | null = null;
  let total = 0;
  for (const slot of slots) {
    const raw = index.positions[slot].unit;
    if (isPauschal(raw)) return '';
    const key = canonicalUnit(raw);
    if (key === null) return '';
    if (unit !== null && unit !== key) return '';
    unit = key;
    const value = index.quantity[slot];
    if (Number.isFinite(value)) total += value;
  }
  if (unit === null) return '';
  return `Σ ${formatNumber(Math.round(total))} ${unitLabel(unit)}`;
}

function newGroup(key: string, title: string, slots: number[]): MapGroup {
  return {
    key,
    nodeId: null,
    title,
    context: '',
    sum: '',
    x: 0,
    y: 0,
    r: groupRadius(slots.length),
    slots,
    rest: false,
  };
}

/** Positionen als Sonnenblume in den Gruppenkreis setzen — die größten innen. */
function placeCloud(group: MapGroup, radii: Float64Array, px: Float64Array, py: Float64Array) {
  const n = group.slots.length;
  const order = [...group.slots].sort((a, b) => radii[b] - radii[a] || a - b);
  const spread = group.r - 12;
  order.forEach((slot, i) => {
    const rr = n === 1 ? 0 : spread * Math.sqrt((i + 0.5) / n);
    const angle = i * GOLDEN_ANGLE;
    px[slot] = group.x + rr * Math.cos(angle);
    py[slot] = group.y + rr * Math.sin(angle);
  });
}

/** Gruppen um den Ursprung packen (größte innen); liefert den Hüllradius. */
function packGroups(groups: readonly MapGroup[]): number {
  const circles: Array<Circle & { group: MapGroup }> = groups
    .map((group) => ({ r: group.r + GROUP_GAP / 2, x: 0, y: 0, group }))
    .sort((a, b) => b.r - a.r);
  const radius = packCircles(circles);
  for (const circle of circles) {
    circle.group.x = circle.x;
    circle.group.y = circle.y;
  }
  return radius - GROUP_GAP / 2;
}

/** Titel eines Abschnitts. `short` nimmt nur die eigene Nummer — die Ebene darüber steht daneben. */
function nodeTitle(node: LVNode, short = false): string {
  const label = node.label ?? 'Ohne Bezeichnung';
  const code = short ? node.ownCode : node.code;
  return code === '' ? label : `${code}  ${label}`;
}

function layoutByLv(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  options: MapOptions,
): { groups: MapGroup[]; hulls: MapHull[] } {
  // Gruppe = Elternknoten der Position, Hülle = nächstes Los darüber.
  const groupByParent = new Map<string, MapGroup>();
  const lotOfGroup = new Map<MapGroup, LVNode | null>();
  for (let slot = 0; slot < index.size; slot++) {
    if (options.hide && !isHit(options.mask, slot)) continue;
    const parent = parents.get(index.nodes[slot].id) ?? null;
    const key = parent?.id ?? '';
    let group = groupByParent.get(key);
    if (group === undefined) {
      group = newGroup(key, parent === null ? 'Ohne Abschnitt' : nodeTitle(parent), []);
      group.nodeId = parent?.id ?? null;
      let lot: LVNode | null = null;
      let up = parent;
      while (up !== null && up !== undefined) {
        if (up.kind === 'lot') {
          lot = up;
          break;
        }
        up = parents.get(up.id) ?? null;
      }
      const above = parent === null ? null : (parents.get(parent.id) ?? null);
      if (parent !== null && above !== null && above.kind === 'section') {
        group.context = nodeTitle(above);
        group.title = nodeTitle(parent, true);
      }
      groupByParent.set(key, group);
      lotOfGroup.set(group, lot);
    }
    group.slots.push(slot);
  }

  const groups = [...groupByParent.values()];
  for (const group of groups) {
    group.r = groupRadius(group.slots.length);
    group.sum = sumLabel(index, group.slots);
  }

  // Lose in Dokumentreihenfolge; Gruppen ohne Los bilden einen eigenen Block ohne Hülle.
  const buckets = new Map<string, { lot: LVNode | null; groups: MapGroup[] }>();
  for (const group of groups) {
    const lot = lotOfGroup.get(group) ?? null;
    const key = lot?.id ?? '';
    const bucket = buckets.get(key) ?? { lot, groups: [] };
    bucket.groups.push(group);
    buckets.set(key, bucket);
  }

  const blocks: Array<Circle & { lot: LVNode | null; groups: MapGroup[] }> = [];
  for (const bucket of buckets.values()) {
    const inner = packGroups(bucket.groups);
    const r = bucket.lot === null ? inner : inner + HULL_PAD;
    blocks.push({ r: r + HULL_GAP / 2, x: 0, y: 0, lot: bucket.lot, groups: bucket.groups });
  }
  if (blocks.length > 1) packCircles(blocks);

  const hulls: MapHull[] = [];
  for (const block of blocks) {
    for (const group of block.groups) {
      group.x += block.x;
      group.y += block.y;
    }
    if (block.lot === null) continue;
    hulls.push({
      id: block.lot.id,
      title: block.lot.label ?? block.lot.code,
      x: block.x,
      y: block.y,
      r: block.r - HULL_GAP / 2,
      slots: block.groups.flatMap((group) => group.slots),
    });
  }
  return { groups, hulls };
}

function facetSlot(id: string): number {
  return FACETS.findIndex((facet) => facet.id === id);
}

function valueOf(index: PositionIndex, slot: number, facetIndex: number): string {
  return index.facts[slot].facetValues[facetIndex][0] ?? NO_VALUE;
}

/** Achsenwerte: gewählte Filterwerte, sonst alle Werte mit Treffern. */
function axisValues(
  index: PositionIndex,
  facet: Facet,
  facetIndex: number,
  options: MapOptions,
): string[] {
  const chosen = options.selected[facet.id];
  const present = new Set<string>();
  for (let slot = 0; slot < index.size; slot++) {
    if (isHit(options.mask, slot)) present.add(valueOf(index, slot, facetIndex));
  }
  const values = chosen !== undefined && chosen.size > 0 ? [...chosen] : [...present];
  const known = values.filter((value) => value !== NO_VALUE);
  const sorted =
    facet.sortValues === undefined
      ? known.sort((a, b) => a.localeCompare(b, 'de'))
      : facet.sortValues(known);
  return values.includes(NO_VALUE) ? [...sorted, NO_VALUE] : sorted;
}

function axisLabel(facet: Facet, value: string): string {
  return value === NO_VALUE ? NO_VALUE : facetOptionLabel(facet, value);
}

function layoutFree(
  index: PositionIndex,
  options: MapOptions,
): { groups: MapGroup[]; axes: MapAxes | null } {
  const rowIndex = facetSlot(options.rows);
  const rowFacet = FACETS[rowIndex];
  const colIndex = options.cols === null ? -1 : facetSlot(options.cols);
  const colFacet = colIndex < 0 ? null : FACETS[colIndex];
  const rowValues = axisValues(index, rowFacet, rowIndex, options);
  const colValues = colFacet === null ? [null] : axisValues(index, colFacet, colIndex, options);

  // Eine Position kann bei einem Merkmal mehrere Werte haben; sie zählt in der
  // Zelle des ersten Werts, der auf der Achse steht. Steht keiner darauf (etwa
  // weil der Filter über einen anderen Wert getroffen hat), kommt ihr erster
  // Wert als neue Zeile/Spalte dazu — kein Treffer fällt stillschweigend heraus.
  const pick = (slot: number, facetIndex: number, values: string[]): string => {
    const own = index.facts[slot].facetValues[facetIndex];
    const onAxis = own.find((value) => values.includes(value));
    if (onAxis !== undefined) return onAxis;
    const value = own[0] ?? NO_VALUE;
    if (!values.includes(value)) values.push(value);
    return value;
  };

  const cells = new Map<string, MapGroup & { row: string; col: string | null }>();
  const rest = newGroup('rest', 'übrige', []);
  rest.rest = true;
  for (let slot = 0; slot < index.size; slot++) {
    if (!isHit(options.mask, slot)) {
      if (!options.hide) rest.slots.push(slot);
      continue;
    }
    const row = pick(slot, rowIndex, rowValues);
    const col = colFacet === null ? null : pick(slot, colIndex, colValues as string[]);
    const key = `${row}|${col ?? ''}`;
    let cell = cells.get(key);
    if (cell === undefined) {
      const title = colFacet === null ? axisLabel(rowFacet, row) : '';
      cell = { ...newGroup(key, title, []), row, col };
      cells.set(key, cell);
    }
    cell.slots.push(slot);
  }

  // Leere Zellen nur für im Filter gewählte Werte: „gewählt, aber nichts drin"
  // bleibt sichtbar, ohne dass Zeilen × Spalten tausende leere Kreise erzeugen.
  const rowChosen = options.selected[rowFacet.id];
  const colChosen = colFacet === null ? undefined : options.selected[colFacet.id];
  const cellGroups: Array<MapGroup & { row: number; col: number }> = [];
  rowValues.forEach((row, i) =>
    colValues.forEach((col, j) => {
      const key = `${row}|${col ?? ''}`;
      const found = cells.get(key);
      const chosen =
        (rowChosen?.has(row) ?? false) || (col !== null && (colChosen?.has(col) ?? false));
      if (found === undefined && !chosen) return;
      const group = found ?? newGroup(key, colFacet === null ? axisLabel(rowFacet, row) : '', []);
      cellGroups.push({ ...group, row: i, col: j });
    }),
  );

  for (const group of [...cellGroups, rest]) {
    group.r = groupRadius(group.slots.length);
    group.sum = sumLabel(index, group.slots);
  }

  let axes: MapAxes | null = null;
  let groups: MapGroup[];
  if (colFacet !== null && cellGroups.length > 0) {
    const maxR = Math.max(...cellGroups.map((group) => group.r));
    const width = 2 * maxR + 70;
    const height = 2 * maxR + 50;
    for (const group of cellGroups) {
      group.x = group.col * width;
      group.y = group.row * height;
    }
    axes = {
      rowKey: rowFacet.label,
      colKey: colFacet.label,
      rows: rowValues.map((value, i) => ({ label: axisLabel(rowFacet, value), y: i * height })),
      cols: colValues.map((value, j) => ({
        label: value === null ? '' : axisLabel(colFacet, value),
        x: j * width,
      })),
      x0: -maxR - 30,
      y0: -maxR - 40,
    };
    groups = cellGroups;
    if (rest.slots.length > 0) {
      rest.x = (colValues.length - 1) * width + maxR + rest.r + 120;
      rest.y = ((rowValues.length - 1) * height) / 2;
      groups = [...cellGroups, rest];
    }
  } else {
    // Leer kann ein Wert hier nur sein, wenn er im Filter gewählt ist — er bleibt
    // als leerer Kreis stehen, damit „gewählt, aber nichts drin" sichtbar ist.
    const extent = packGroups(cellGroups);
    groups = cellGroups;
    if (rest.slots.length > 0) {
      rest.x = extent + rest.r + 120;
      rest.y = 0;
      groups = [...cellGroups, rest];
    }
  }
  return { groups, axes };
}

export function layoutMap(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  options: MapOptions,
): MapLayout {
  const px = new Float64Array(index.size).fill(Number.NaN);
  const py = new Float64Array(index.size).fill(Number.NaN);
  const groupOf = new Int32Array(index.size).fill(-1);

  let groups: MapGroup[];
  let hulls: MapHull[] = [];
  let axes: MapAxes | null = null;
  if (options.layout === 'frei' && facetSlot(options.rows) >= 0) {
    ({ groups, axes } = layoutFree(index, options));
  } else {
    ({ groups, hulls } = layoutByLv(index, parents, options));
  }

  groups.forEach((group, i) => {
    placeCloud(group, options.radii, px, py);
    for (const slot of group.slots) groupOf[slot] = i;
  });

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const extend = (x: number, y: number, r: number, top: number): void => {
    x0 = Math.min(x0, x - r);
    x1 = Math.max(x1, x + r);
    y0 = Math.min(y0, y - r - top);
    y1 = Math.max(y1, y + r);
  };
  for (const group of groups) extend(group.x, group.y, group.r, LABEL_SPACE);
  for (const hull of hulls) extend(hull.x, hull.y, hull.r, 16);
  if (axes !== null) {
    x0 = Math.min(x0, axes.x0 - 190);
    y0 = Math.min(y0, axes.y0 - 50);
  }
  if (!Number.isFinite(x0)) {
    x0 = -100;
    y0 = -100;
    x1 = 100;
    y1 = 100;
  }

  return { groups, hulls, axes, px, py, groupOf, bounds: { x0, y0, x1, y1 } };
}
