// Layout des Bubble-Graphen (docs/decisions/0035-graph-gliederung.md).
//
// Zwei Gliederungen, eine Bildsprache: Gruppen sind Kreise, deren Fläche der
// Anzahl ihrer Positionen folgt; die Positionen liegen als Punkte darin.
//  - „nach LV": eine Gruppe je Abschnitt der untersten Ebene (der Elternknoten
//    der Position), die Lose als gestrichelte Hülle darum.
//  - „Matrix": Zeilen sind die Werte eines Merkmals, Spalten optional die eines
//    zweiten. Mit Spalten ist jede Zelle eine Kachel, die Punkte liegen darin in
//    Reihen (Entscheidung 0059). Ohne Spalten liegen die Gruppen als Kreise gepackt.
//
// Reine Funktion über dem Positions-Index: kein DOM, kein Zoom. Die Gruppenlage
// hängt nur an Datei, Gliederung, Größe und — beim Ausblenden oder in „Matrix" —
// an der Treffermenge, nie am Ausschnitt.

import { GROUP_GAP, HULL_GAP, HULL_PAD, groupRadius } from './constants';
import { packCircles, type Circle } from './pack';
import { isPauschal } from './sizes';
import { FACETS, facetOptionLabel, type Facet } from '../facets';
import { formatNumber } from '../format';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

export type GraphLayoutId = 'lv' | 'matrix';

/**
 * Merkmale, nach denen „Matrix" gliedern kann: nur solche mit genau einem Wert je
 * Position. Bei Normen oder Expositionsklassen stünde eine Position in mehreren
 * Zellen zugleich — der Punkt wäre dann nicht mehr eindeutig.
 */
export const AXIS_FACETS: readonly string[] = ['einheit', 'positionsart', 'positionstyp', 'beton'];

/**
 * Zeilen/Spalten nach dem Abschnitt der Position (ihr Elternknoten im LV) —
 * kein Filtermerkmal, sondern die Gliederung der Datei selbst. Braucht keine
 * Klassifizierung.
 */
export const SECTION_AXIS = 'abschnitt';

/**
 * Zeilen/Spalten nach der Größenordnung der Menge (Entscheidung 0053) — zusammen
 * mit „Einheit" eine Matrix „welche Mengen in welcher Einheit". Kommt aus der
 * Datei, braucht keine Klassifizierung. Pauschal und ohne Menge: ohne Angabe.
 */
export const QUANTITY_AXIS = 'mengenstufe';

/** Alle Achsen der Matrix in Anzeigereihenfolge. */
export const AXIS_IDS: readonly string[] = [
  'einheit',
  QUANTITY_AXIS,
  SECTION_AXIS,
  ...AXIS_FACETS.slice(1),
];

/** Stufen der Mengen-Achse: Untergrenze (einschließlich) und Name. */
const QUANTITY_STEPS: ReadonlyArray<readonly [number, string]> = [
  [0, 'unter 10'],
  [10, '10 bis 100'],
  [100, '100 bis 1.000'],
  [1000, '1.000 bis 10.000'],
  [10000, 'ab 10.000'],
];

/** Sammelwert für Positionen, denen das Merkmal fehlt. */
export const NO_VALUE = 'ohne Angabe';

export interface MapOptions {
  layout: GraphLayoutId;
  /** Facetten-ID der Zeilen bzw. Spalten (nur „Matrix"). */
  rows: string;
  cols: string | null;
  /** Radius je Indexeintrag (sizes.ts). */
  radii: Float64Array;
  /** Treffer je Indexeintrag; `null` = es wird nicht gefiltert. */
  mask: Uint8Array | null;
  /** Nicht-Treffer fallen aus dem Layout statt gedämpft zu bleiben. */
  hide: boolean;
  /** Gewählte Filterwerte je Facette — sie bestimmen die Achsen in „Matrix". */
  selected: Readonly<Record<string, ReadonlySet<string>>>;
}

export interface MapGroup {
  key: string;
  /** Abschnitt im LV-Baum; in „Matrix" `null` — die Gruppe ist kein Knoten. */
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
  /** Sammelgruppe der Nicht-Treffer in „Matrix". */
  rest: boolean;
  /** Kachel der Zelle (Matrix mit Spalten); sonst `null` — die Gruppe ist ein Kreis. */
  cell: MapCell | null;
}

/** Rechteck einer Kachel in Weltkoordinaten, dazu ihre Zeile und Spalte. */
export interface MapCell {
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  col: number;
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
  /** Raster der Kacheln: linke Kante und Breite je Spalte, obere Kante und Höhe je Zeile. */
  grid: { colX: number[]; colW: number[]; rowY: number[]; rowH: number[] } | null;
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
/** Kachel: Rand innen, Kopfzeile für Anzahl und Summe, Abstand zwischen Kacheln. */
const TILE_PAD = 12;
const TILE_TOP = 26;
const TILE_GAP = 10;
/** Breite einer Spaltenbeschriftung je Zeichen (14px Sans), damit Kacheln sie tragen. */
const AXIS_CHAR = 8.6;
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
    cell: null,
  };
}

/**
 * Positionen als Sonnenblume in den Gruppenkreis setzen — die größten innen.
 * Bei gleicher Punktgröße (Größe „gleich") entscheidet die Menge: so steht die
 * größte Menge einer Gruppe immer in der Mitte (Entscheidung 0053).
 */
function placeCloud(
  group: MapGroup,
  radii: Float64Array,
  quantity: Float64Array,
  px: Float64Array,
  py: Float64Array,
) {
  const n = group.slots.length;
  const order = bySize(group.slots, radii, quantity);
  const spread = group.r - 12;
  order.forEach((slot, i) => {
    const rr = n === 1 ? 0 : spread * Math.sqrt((i + 0.5) / n);
    const angle = i * GOLDEN_ANGLE;
    px[slot] = group.x + rr * Math.cos(angle);
    py[slot] = group.y + rr * Math.sin(angle);
  });
}

/** Reihenfolge in einer Gruppe: größte Punkte zuerst, bei gleicher Größe die größte Menge. */
function bySize(slots: readonly number[], radii: Float64Array, quantity: Float64Array): number[] {
  const amount = (slot: number): number => (quantity[slot] > 0 ? quantity[slot] : 0);
  return [...slots].sort((a, b) => radii[b] - radii[a] || amount(b) - amount(a) || a - b);
}

/** Positionen in Reihen in die Kachel setzen, jede Reihe mittig — die größten oben links. */
function placeTile(
  group: MapGroup & { cell: MapCell },
  perRow: number,
  pitch: number,
  radii: Float64Array,
  quantity: Float64Array,
  px: Float64Array,
  py: Float64Array,
) {
  const { cell } = group;
  const n = group.slots.length;
  bySize(group.slots, radii, quantity).forEach((slot, i) => {
    const line = Math.floor(i / perRow);
    const inLine = Math.min(perRow, n - line * perRow);
    px[slot] = cell.x + cell.w / 2 + ((i % perRow) - (inLine - 1) / 2) * pitch;
    py[slot] = cell.y + TILE_TOP + pitch / 2 + line * pitch;
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

/** Eine Achse der Matrix: Merkmal oder Abschnitt, mit Werten je Position. */
interface Axis {
  id: string;
  label: string;
  /** Werte der Position auf dieser Achse; leer = ohne Angabe. */
  values(slot: number): readonly string[];
  valueLabel(value: string): string;
  sort(values: string[]): string[];
}

function facetAxis(index: PositionIndex, id: string): Axis | null {
  const facetIndex = FACETS.findIndex((facet) => facet.id === id);
  if (facetIndex < 0) return null;
  const facet: Facet = FACETS[facetIndex];
  return {
    id,
    label: facet.label,
    values: (slot) => index.facts[slot].facetValues[facetIndex],
    valueLabel: (value) => facetOptionLabel(facet, value),
    sort: (values) =>
      facet.sortValues === undefined
        ? values.sort((a, b) => a.localeCompare(b, 'de'))
        : facet.sortValues(values),
  };
}

function sectionAxis(index: PositionIndex, parents: ReadonlyMap<string, LVNode | null>): Axis {
  // Reihenfolge wie im LV: der Index steht in Dokumentreihenfolge.
  const order = new Map<string, number>();
  const titles = new Map<string, string>();
  const ofSlot: string[] = [];
  for (let slot = 0; slot < index.size; slot++) {
    const parent = parents.get(index.nodes[slot].id) ?? null;
    const key = parent?.id ?? '';
    ofSlot.push(key);
    if (parent !== null && !order.has(key)) {
      order.set(key, order.size);
      titles.set(key, nodeTitle(parent));
    }
  }
  return {
    id: SECTION_AXIS,
    label: 'Abschnitt',
    values: (slot) => (ofSlot[slot] === '' ? [] : [ofSlot[slot]]),
    valueLabel: (value) => titles.get(value) ?? value,
    sort: (values) => values.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
  };
}

function quantityAxis(index: PositionIndex): Axis {
  return {
    id: QUANTITY_AXIS,
    label: 'Mengenstufe',
    values: (slot) => {
      const value = index.quantity[slot];
      if (!(value > 0) || isPauschal(index.positions[slot].unit)) return [];
      let step = 0;
      while (step + 1 < QUANTITY_STEPS.length && value >= QUANTITY_STEPS[step + 1][0]) step++;
      return [String(step)];
    },
    valueLabel: (value) => QUANTITY_STEPS[Number(value)]?.[1] ?? value,
    sort: (values) => values.sort((a, b) => Number(a) - Number(b)),
  };
}

function axisOf(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  id: string,
): Axis | null {
  if (id === SECTION_AXIS) return sectionAxis(index, parents);
  if (id === QUANTITY_AXIS) return quantityAxis(index);
  return facetAxis(index, id);
}

function firstValue(axis: Axis, slot: number): string {
  return axis.values(slot)[0] ?? NO_VALUE;
}

/** Achsenwerte: gewählte Filterwerte, sonst alle Werte mit Treffern. */
function axisValues(index: PositionIndex, axis: Axis, options: MapOptions): string[] {
  const chosen = options.selected[axis.id];
  const present = new Set<string>();
  for (let slot = 0; slot < index.size; slot++) {
    if (isHit(options.mask, slot)) present.add(firstValue(axis, slot));
  }
  const values = chosen !== undefined && chosen.size > 0 ? [...chosen] : [...present];
  const sorted = axis.sort(values.filter((value) => value !== NO_VALUE));
  return values.includes(NO_VALUE) ? [...sorted, NO_VALUE] : sorted;
}

function axisLabel(axis: Axis, value: string): string {
  return value === NO_VALUE ? NO_VALUE : axis.valueLabel(value);
}

/** Punkte je Reihe (je Spalte der Matrix) und Abstand zweier Punkte in einer Kachel. */
interface Tiles {
  perRow: number[];
  pitch: number;
}

function layoutFree(
  index: PositionIndex,
  rowAxis: Axis,
  colAxis: Axis | null,
  options: MapOptions,
): { groups: MapGroup[]; axes: MapAxes | null; tiles: Tiles | null } {
  const rowValues = axisValues(index, rowAxis, options);
  const colValues = colAxis === null ? [null] : axisValues(index, colAxis, options);

  // Eine Position kann bei einem Merkmal mehrere Werte haben; sie zählt in der
  // Zelle des ersten Werts, der auf der Achse steht. Steht keiner darauf (etwa
  // weil der Filter über einen anderen Wert getroffen hat), kommt ihr erster
  // Wert als neue Zeile/Spalte dazu — kein Treffer fällt stillschweigend heraus.
  const pick = (slot: number, axis: Axis, values: string[]): string => {
    const own = axis.values(slot);
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
    const row = pick(slot, rowAxis, rowValues);
    const col = colAxis === null ? null : pick(slot, colAxis, colValues as string[]);
    const key = `${row}|${col ?? ''}`;
    let cell = cells.get(key);
    if (cell === undefined) {
      const title = colAxis === null ? axisLabel(rowAxis, row) : '';
      cell = { ...newGroup(key, title, []), row, col };
      cells.set(key, cell);
    }
    cell.slots.push(slot);
  }

  // Leere Zellen nur für im Filter gewählte Werte: „gewählt, aber nichts drin"
  // bleibt sichtbar, ohne dass Zeilen × Spalten tausende leere Kreise erzeugen.
  const rowChosen = options.selected[rowAxis.id];
  const colChosen = colAxis === null ? undefined : options.selected[colAxis.id];
  const cellGroups: Array<MapGroup & { row: number; col: number }> = [];
  rowValues.forEach((row, i) =>
    colValues.forEach((col, j) => {
      const key = `${row}|${col ?? ''}`;
      const found = cells.get(key);
      const chosen =
        (rowChosen?.has(row) ?? false) || (col !== null && (colChosen?.has(col) ?? false));
      if (found === undefined && !chosen) return;
      const group = found ?? newGroup(key, colAxis === null ? axisLabel(rowAxis, row) : '', []);
      cellGroups.push({ ...group, row: i, col: j });
    }),
  );

  for (const group of [...cellGroups, rest]) {
    group.r = groupRadius(group.slots.length);
    group.sum = sumLabel(index, group.slots);
  }

  let axes: MapAxes | null = null;
  let groups: MapGroup[];
  let tiles: Tiles | null = null;
  if (colAxis !== null && cellGroups.length > 0) {
    // Kacheln: Spaltenbreite nach der vollsten Zelle der Spalte, Zeilenhöhe nach
    // der vollsten der Zeile — eine Tabelle, die nur so groß wird, wie sie muss.
    let maxR = 0;
    for (const group of cellGroups) {
      for (const slot of group.slots) maxR = Math.max(maxR, options.radii[slot]);
    }
    const pitch = 2 * (maxR || 4) + 4;
    const colLabels = colValues.map((value) => (value === null ? '' : axisLabel(colAxis, value)));
    // Vollste Zelle je Spalte, einmal über alle Zellen statt je Spalte gefiltert.
    const mostInCol = colValues.map(() => 0);
    for (const g of cellGroups) mostInCol[g.col] = Math.max(mostInCol[g.col], g.slots.length);
    const perRow = mostInCol.map((most) => Math.max(3, Math.ceil(Math.sqrt(most * 2.2))));
    const colW = perRow.map((k, j) =>
      Math.max(k * pitch + 2 * TILE_PAD, colLabels[j].length * AXIS_CHAR + 16),
    );
    const linesInRow = rowValues.map(() => 1);
    for (const g of cellGroups) {
      linesInRow[g.row] = Math.max(linesInRow[g.row], Math.ceil(g.slots.length / perRow[g.col]));
    }
    const rowH = linesInRow.map((lines) => TILE_TOP + lines * pitch + TILE_PAD - 2);
    const colX: number[] = [];
    const rowY: number[] = [];
    colW.reduce((x, width, j) => ((colX[j] = x), x + width + TILE_GAP), 0);
    rowH.reduce((y, height, i) => ((rowY[i] = y), y + height + TILE_GAP), 0);
    for (const group of cellGroups) {
      const cell: MapCell = {
        x: colX[group.col],
        y: rowY[group.row],
        w: colW[group.col],
        h: rowH[group.row],
        row: group.row,
        col: group.col,
      };
      group.cell = cell;
      group.x = cell.x + cell.w / 2;
      group.y = cell.y + cell.h / 2;
      // Für Culling und Detailstufe: der Kreis, der die Kachel umschließt.
      group.r = Math.hypot(cell.w, cell.h) / 2;
    }
    axes = {
      rowKey: rowAxis.label,
      colKey: colAxis.label,
      rows: rowValues.map((value, i) => ({
        label: axisLabel(rowAxis, value),
        y: rowY[i] + rowH[i] / 2,
      })),
      cols: colLabels.map((label, j) => ({ label, x: colX[j] + colW[j] / 2 })),
      x0: -4,
      y0: -6,
      grid: { colX, colW, rowY, rowH },
    };
    tiles = { perRow, pitch };
    groups = cellGroups;
    if (rest.slots.length > 0) {
      const width = colX[colX.length - 1] + colW[colW.length - 1];
      const height = rowY[rowY.length - 1] + rowH[rowH.length - 1];
      rest.x = width + rest.r + 120;
      rest.y = height / 2;
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
  return { groups, axes, tiles };
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
  let tiles: Tiles | null = null;
  const rowAxis = options.layout === 'matrix' ? axisOf(index, parents, options.rows) : null;
  if (rowAxis !== null) {
    const colAxis = options.cols === null ? null : axisOf(index, parents, options.cols);
    ({ groups, axes, tiles } = layoutFree(index, rowAxis, colAxis, options));
  } else {
    ({ groups, hulls } = layoutByLv(index, parents, options));
  }

  groups.forEach((group, i) => {
    const { cell } = group;
    if (cell !== null && tiles !== null) {
      const { perRow, pitch } = tiles;
      placeTile({ ...group, cell }, perRow[cell.col], pitch, options.radii, index.quantity, px, py);
    } else {
      placeCloud(group, options.radii, index.quantity, px, py);
    }
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
  for (const group of groups) {
    const { cell } = group;
    if (cell === null) extend(group.x, group.y, group.r, LABEL_SPACE);
    else {
      x0 = Math.min(x0, cell.x);
      x1 = Math.max(x1, cell.x + cell.w);
      y0 = Math.min(y0, cell.y);
      y1 = Math.max(y1, cell.y + cell.h);
    }
  }
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
