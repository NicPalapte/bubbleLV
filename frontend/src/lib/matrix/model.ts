// Modell der Ansicht „Matrix" (WP-O): zwei Facetten als Achsen, eine Zelle je
// Wertepaar, Zellwert Anzahl · Menge · Summe.
//
// Gerechnet wird gegen den flachen Positions-Index, einmal je Filterwechsel —
// nie im Render und nie über den Baum
// (docs/decisions/0010-positions-index-und-aggregate.md).
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gezählt wird, was
// der aktive Filter durchlässt. Ohne Filter steht in den Zellen dieselbe Menge
// wie im Tabellenkopf.
//
// Drei Regeln, die die Matrix ehrlich halten:
//  - **Leere Zellen bleiben stehen.** Eine Lücke im Raster ist die Aussage
//    („dieses Gewerk baut dieses Bauteil nicht") — sie darf nicht wegfallen.
//  - **Ohne Angabe ist ein eigener Wert**, keine stille Auslassung. Positionen,
//    denen die Klassifizierung zu einer Achse nichts zuordnet, stehen in einer
//    eigenen Zeile bzw. Spalte.
//  - **Mengen nur innerhalb einer Einheit** (docs/decisions/0019). Enthält die
//    gefilterte Menge mehrere Einheiten, fällt der Zellwert auf „Anzahl"
//    zurück; m³ und Stück zu einer Zahl zu addieren ergäbe nichts.

import { facetOptionLabel, FACETS_BY_ID } from '../facets';
import { singleUnit } from '../graph/quantities';
import type { PositionIndex } from '../index/positionIndex';

/** Womit eine Zelle misst. */
export type MatrixMeasure = 'anzahl' | 'menge' | 'summe';

/**
 * So viele Werte je Achse bleiben einzeln stehen. Mehr Zeilen liest niemand
 * mehr als Muster ab; der Rest wird zu einer Sammelzeile.
 */
export const MAX_AXIS_VALUES = 14;

/** Schlüssel der Sammelwerte — kein Facettenwert kann so heißen. */
export const NO_VALUE_KEY = '\u0000ohne';
export const COLLECTED_KEY = '\u0000weitere';

export interface AxisValue {
  /** Facettenwert; für die Sammelwerte einer der beiden Schlüssel oben. */
  key: string;
  label: string;
  /**
   * Als Filter setzbar? „Ohne Angabe" und „Weitere" sind es nicht — es gibt
   * keinen Facettenwert, der sie ausdrückt.
   */
  filterable: boolean;
  /** Positionen in dieser Zeile bzw. Spalte. */
  count: number;
  /** Wert der Zeile bzw. Spalte im gewählten Zellmaß. */
  value: number;
}

export interface MatrixCell {
  count: number;
  value: number;
}

export interface MatrixModel {
  rows: readonly AxisValue[];
  cols: readonly AxisValue[];
  /** Zellen mit Inhalt, Schlüssel `zeile|spalte` (Stellung in `rows`/`cols`). */
  cells: ReadonlyMap<string, MatrixCell>;
  /** Größter Zellwert — Bezugsgröße der Einfärbung; 0 bei leerem Raster. */
  max: number;
  /** Tatsächlich verwendetes Zellmaß (siehe Rückfall oben). */
  measure: MatrixMeasure;
  /**
   * Die eine Einheit der gefilterten Menge; `null`, sobald mehrere vorkommen.
   * Sie entscheidet, ob „Menge" als Zellwert überhaupt zur Wahl steht.
   */
  unit: string | null;
  /** Positionen im Raster (jede genau einmal, auch bei mehrwertigen Achsen). */
  positions: number;
  /**
   * Gesamtsumme im gewählten Zellmaß, jede Position **genau einmal** gezählt.
   * Bei einer mehrwertigen Achse ergeben die Randsummen mehr — dort zählt eine
   * Position in jeder Zeile mit, in die sie gehört.
   */
  total: number;
  /**
   * Trägt eine Achse mehrwertige Facetten (Exposition, Besonderheiten …)?
   * Dann zählt eine Position in jeder Zeile mit, in die sie gehört, und die
   * Summe der Zellen ist größer als die Zahl der Positionen.
   */
  multiValued: boolean;
  /** Führt die gefilterte Menge überhaupt Preise? Sonst wäre „Summe" leer. */
  hasPrices: boolean;
}

export interface MatrixInput {
  index: PositionIndex;
  /** Trefferbitmaske; `null` heißt „kein Filter aktiv". */
  mask: Uint8Array | null;
  rowFacetId: string;
  colFacetId: string;
  measure: MatrixMeasure;
}

export const EMPTY_MATRIX: MatrixModel = {
  rows: [],
  cols: [],
  cells: new Map(),
  max: 0,
  measure: 'anzahl',
  unit: null,
  positions: 0,
  total: 0,
  multiValued: false,
  hasPrices: false,
};

/** Facetten, unter denen eine Position mehrere Werte tragen kann. */
const MULTI_VALUED: ReadonlySet<string> = new Set([
  'expo',
  'keywords',
  'normen',
  'material',
  'fristen',
  'platzhalter',
]);

export function cellKey(row: number, col: number): string {
  return `${row}|${col}`;
}

/** Facettenwerte einer Position; leer heißt „Ohne Angabe". */
function valuesOf(facetId: string, index: PositionIndex, slot: number): readonly string[] {
  const facet = FACETS_BY_ID.get(facetId);
  if (facet === undefined) return [NO_VALUE_KEY];
  const values = facet.get(index.positions[slot]);
  return values.length === 0 ? [NO_VALUE_KEY] : values;
}

function labelOf(facetId: string, key: string): string {
  if (key === NO_VALUE_KEY) return 'Ohne Angabe';
  if (key === COLLECTED_KEY) return 'Weitere';
  const facet = FACETS_BY_ID.get(facetId);
  return facet === undefined ? key : facetOptionLabel(facet, key);
}

/**
 * Achsenwerte in Anzeigereihenfolge: nach Zahl der Positionen absteigend,
 * die beiden Sammelwerte hinten. Bewusst **nicht** nach dem gewählten Zellmaß
 * — sonst sprängen die Achsen beim Umschalten von Anzahl auf Summe um, und
 * man verlöre die Stelle, die man gerade ansieht.
 */
function axisValues(counts: Map<string, number>, facetId: string): AxisValue[] {
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
  const ohne = sorted.filter(([key]) => key === NO_VALUE_KEY);
  const echte = sorted.filter(([key]) => key !== NO_VALUE_KEY);

  const gezeigt = echte.slice(0, MAX_AXIS_VALUES);
  const rest = echte.slice(MAX_AXIS_VALUES);

  const out: AxisValue[] = gezeigt.map(([key, count]) => ({
    key,
    label: labelOf(facetId, key),
    filterable: true,
    count,
    value: 0,
  }));
  if (rest.length > 0) {
    out.push({
      key: COLLECTED_KEY,
      label: `Weitere (${rest.length})`,
      filterable: false,
      count: rest.reduce((sum, entry) => sum + entry[1], 0),
      value: 0,
    });
  }
  for (const [key, count] of ohne) {
    out.push({ key, label: labelOf(facetId, key), filterable: false, count, value: 0 });
  }
  return out;
}

/** Beitrag einer Position zum gewählten Zellmaß; `NaN` heißt „trägt nichts bei". */
function contribution(measure: MatrixMeasure, index: PositionIndex, slot: number): number {
  if (measure === 'anzahl') return 1;
  if (measure === 'summe') return index.totalPrice[slot];
  // Eine fehlende Menge ist keine Menge von null — sie trägt gar nichts bei.
  return index.quantity[slot];
}

export function buildMatrix({
  index,
  mask,
  rowFacetId,
  colFacetId,
  measure,
}: MatrixInput): MatrixModel {
  if (index.size === 0) return EMPTY_MATRIX;

  const multiValued = [rowFacetId, colFacetId].some((id) => MULTI_VALUED.has(id));

  // Erster Durchlauf: welche Werte kommen überhaupt vor und wie oft. Erst
  // danach steht fest, welche Werte einzeln stehen bleiben (MAX_AXIS_VALUES).
  const rowCounts = new Map<string, number>();
  const colCounts = new Map<string, number>();
  let positions = 0;
  let hasPrices = false;
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    positions++;
    if (Number.isFinite(index.unitPrice[i])) hasPrices = true;
    for (const key of valuesOf(rowFacetId, index, i)) {
      rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
    }
    for (const key of valuesOf(colFacetId, index, i)) {
      colCounts.set(key, (colCounts.get(key) ?? 0) + 1);
    }
  }

  const rows = axisValues(rowCounts, rowFacetId);
  const cols = axisValues(colCounts, colFacetId);
  const rowSlot = new Map(rows.map((entry, position) => [entry.key, position]));
  const colSlot = new Map(cols.map((entry, position) => [entry.key, position]));

  // Zellmaß festlegen — beide Rückfälle stehen oben im Dateikopf. Die Einheit
  // wird immer bestimmt, nicht nur im Mengenmodus: die Ansicht muss den Knopf
  // sperren können, **bevor** jemand ihn drückt.
  const unit = singleUnit(index, maskOrAll(index, mask));
  //
  // Ohne Treffer greift kein Rückfall: `unit` ist dann `null` und `hasPrices`
  // `false`, aber nicht weil Einheiten gemischt sind oder Preise fehlen —
  // sondern weil gar nichts da ist. Das sagt der Leerzustand, und zwei
  // widersprüchliche Begründungen nebeneinander wären schlimmer als keine.
  const effective: MatrixMeasure =
    positions === 0
      ? measure
      : (measure === 'menge' && unit === null) || (measure === 'summe' && !hasPrices)
        ? 'anzahl'
        : measure;

  const cells = new Map<string, MatrixCell>();
  let max = 0;
  let total = 0;
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    const roh = contribution(effective, index, i);
    // Eine fehlende Menge trägt nichts bei — nicht 0, sondern gar nichts.
    const beitrag = Number.isFinite(roh) ? roh : 0;
    const rowKeys = valuesOf(rowFacetId, index, i);
    const colKeys = valuesOf(colFacetId, index, i);

    // Randsummen: je Achse **einmal je Wert** dieser Position. In der
    // Zellschleife unten stünde der Beitrag so oft, wie die Gegenachse Werte
    // hat — die Gesamtspalte zeigte dann mehr, als in der Datei steht.
    for (const rowKey of rowKeys) {
      rows[rowSlot.get(rowKey) ?? (rowSlot.get(COLLECTED_KEY) as number)].value += beitrag;
    }
    for (const colKey of colKeys) {
      cols[colSlot.get(colKey) ?? (colSlot.get(COLLECTED_KEY) as number)].value += beitrag;
    }
    // Die Gesamtsumme zählt jede Position genau einmal, egal wie viele Werte
    // sie trägt. Die Randsummen daneben können mehr ergeben — das ist die
    // Mehrfachzählung, auf die die Ansicht hinweist.
    total += beitrag;

    for (const rowKey of rowKeys) {
      const row = rowSlot.get(rowKey) ?? (rowSlot.get(COLLECTED_KEY) as number);
      for (const colKey of colKeys) {
        const col = colSlot.get(colKey) ?? (colSlot.get(COLLECTED_KEY) as number);
        const key = cellKey(row, col);
        const cell = cells.get(key) ?? { count: 0, value: 0 };
        cell.count++;
        cell.value += beitrag;
        cells.set(key, cell);
        if (cell.value > max) max = cell.value;
      }
    }
  }

  return {
    rows,
    cols,
    cells,
    max,
    measure: effective,
    unit,
    positions,
    total,
    multiValued,
    hasPrices,
  };
}

/** `singleUnit` braucht eine Maske; ohne Filter zählt das ganze LV. */
function maskOrAll(index: PositionIndex, mask: Uint8Array | null): Uint8Array {
  if (mask !== null) return mask;
  const all = new Uint8Array(index.size);
  all.fill(1);
  return all;
}
