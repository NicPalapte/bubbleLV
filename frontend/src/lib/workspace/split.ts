// Aufteilung der Arbeitsfläche im Splitscreen (Entscheidung 0063): drei Plätze,
// links oben (`a`), links unten (`b`) und rechts (`c`), je einer für Graph,
// Tabelle und Positionskarte. Ein geschlossener oder ausgelagerter Bereich gibt
// seinen Platz frei; die übrigen wachsen in die Lücke. Reine Funktion — die
// Komponente setzt nur noch `grid-column` / `grid-row`.

export type PaneId = 'graph' | 'table' | 'card';
export type SlotId = 'a' | 'b' | 'c';

export const PANES: readonly PaneId[] = ['graph', 'table', 'card'];
export const SLOTS: readonly SlotId[] = ['a', 'b', 'c'];

/** Anteil der linken Spalte an der Breite. */
export const SPLIT_COL_DEFAULT = 0.64;
export const SPLIT_COL_MIN = 0.25;
export const SPLIT_COL_MAX = 0.8;
/** Anteil des oberen Platzes an der Höhe der linken Spalte. */
export const SPLIT_ROW_DEFAULT = 0.56;
export const SPLIT_ROW_MIN = 0.2;
export const SPLIT_ROW_MAX = 0.8;

export function clampFrac(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 1000) / 1000;
}

export interface PanePlace {
  column: string;
  row: string;
}

export interface SplitLayout {
  /** Nur sichtbare Bereiche haben einen Platz. */
  places: Partial<Record<PaneId, PanePlace>>;
  columns: string;
  rows: string;
  /** Senkrechte Trennlinie zwischen linker und rechter Spalte. */
  colDivider: boolean;
  /** Waagerechte Trennlinie zwischen den beiden linken Plätzen. */
  rowDivider: boolean;
}

export function slotOf(slots: Readonly<Record<SlotId, PaneId>>, pane: PaneId): SlotId {
  return SLOTS.find((slot) => slots[slot] === pane) ?? 'a';
}

/** Legt `pane` auf `to`; der bisherige Inhaber von `to` zieht auf den frei gewordenen Platz. */
export function movePane(
  slots: Readonly<Record<SlotId, PaneId>>,
  pane: PaneId,
  to: SlotId,
): Readonly<Record<SlotId, PaneId>> {
  const from = slotOf(slots, pane);
  if (from === to) return slots;
  return { ...slots, [to]: pane, [from]: slots[to] };
}

export function splitLayout(
  slots: Readonly<Record<SlotId, PaneId>>,
  visible: (pane: PaneId) => boolean,
  colFrac: number,
  rowFrac: number,
): SplitLayout {
  const left = (['a', 'b'] as const).filter((slot) => visible(slots[slot]));
  const right = visible(slots.c);
  const places: Partial<Record<PaneId, PanePlace>> = {};

  if (left.length === 2) {
    places[slots.a] = { column: '1', row: '1' };
    places[slots.b] = { column: '1', row: '2' };
  } else if (left.length === 1) {
    places[slots[left[0]]] = { column: '1', row: right ? '1' : '1 / -1' };
  }
  if (right) {
    places[slots.c] = { column: left.length > 0 ? '2' : '1', row: '1 / -1' };
  }

  const split = left.length > 0 && right;
  return {
    places,
    columns: split ? `${colFrac}fr ${1 - colFrac}fr` : '1fr',
    rows: left.length === 2 ? `${rowFrac}fr ${1 - rowFrac}fr` : '1fr',
    colDivider: split,
    rowDivider: left.length === 2,
  };
}
