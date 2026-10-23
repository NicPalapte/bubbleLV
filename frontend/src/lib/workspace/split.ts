// Aufteilung der Arbeitsfläche im Splitscreen (Entscheidungen 0064 und 0070):
// fünf Plätze in drei Spalten — links Überblick und Prüfung (`sideTop`,
// `sideBottom`), in der Mitte Graph und Tabelle (`a`, `b`), rechts die
// Positionskarte (`c`). Das Begleitdokument (Entscheidung 0072) liegt anfangs als
// Reiter neben der Tabelle. Jeder Platz trägt einen Stapel von Bereichen; liegen
// mehrere darauf, zeigt er sie als Reiter. Ein Platz ohne sichtbaren Bereich
// gibt seine Fläche frei, eine leere Spalte ebenso. Reine Funktionen — die
// Komponente rechnet nur noch Anteile in CSS um.

export type PaneId = 'graph' | 'table' | 'card' | 'overview' | 'check' | 'doc';
export type SlotId = 'sideTop' | 'sideBottom' | 'a' | 'b' | 'c';
export type ColumnId = 'side' | 'main' | 'right';
/** Spalten mit zwei Plätzen übereinander. */
export type RowColumn = 'side' | 'main';

export const PANE_LABEL: Readonly<Record<PaneId, string>> = {
  graph: 'Graph',
  table: 'Tabelle',
  card: 'Position',
  overview: 'Überblick',
  check: 'Prüfung',
  doc: 'Dokument',
};

export const PANES: readonly PaneId[] = ['graph', 'table', 'card', 'overview', 'check', 'doc'];
export const SLOTS: readonly SlotId[] = ['sideTop', 'sideBottom', 'a', 'b', 'c'];
export const COLUMNS: readonly ColumnId[] = ['side', 'main', 'right'];
export const COLUMN_SLOTS: Readonly<Record<ColumnId, readonly SlotId[]>> = {
  side: ['sideTop', 'sideBottom'],
  main: ['a', 'b'],
  right: ['c'],
};

/** Platz, auf den ein gelöster Bereich bevorzugt zurückkehrt. */
export const HOME: Readonly<Record<PaneId, SlotId>> = {
  overview: 'sideTop',
  check: 'sideBottom',
  graph: 'a',
  table: 'b',
  card: 'c',
  doc: 'b',
};

export type Stacks = Readonly<Record<SlotId, readonly PaneId[]>>;
export type Fronts = Readonly<Record<SlotId, PaneId | null>>;

/** Was wo liegt: Stapel je Platz und der vorn liegende Reiter. */
export interface Arrangement {
  stacks: Stacks;
  front: Fronts;
}

export const INITIAL_ARRANGEMENT: Arrangement = {
  stacks: {
    sideTop: ['overview'],
    sideBottom: ['check'],
    a: ['graph'],
    b: ['table', 'doc'],
    c: ['card'],
  },
  front: { sideTop: 'overview', sideBottom: 'check', a: 'graph', b: 'table', c: 'card' },
};

/** Gewichte der Spalten; fehlt eine Spalte, teilen sich die übrigen die Breite. */
export type ColumnWidths = Readonly<Record<ColumnId, number>>;
export const WIDTHS_DEFAULT: ColumnWidths = { side: 0.22, main: 0.5, right: 0.28 };
/** Keine Spalte wird schmaler als dieser Anteil der sichtbaren Breite. */
export const COL_MIN = 0.12;

/** Anteil des oberen Platzes an der Höhe seiner Spalte. */
export const ROWS_DEFAULT: Readonly<Record<RowColumn, number>> = { side: 0.5, main: 0.56 };
export const SPLIT_ROW_MIN = 0.2;
export const SPLIT_ROW_MAX = 0.8;

export function clampFrac(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 1000) / 1000;
}

export function slotOf(stacks: Stacks, pane: PaneId): SlotId {
  return SLOTS.find((slot) => stacks[slot].includes(pane)) ?? HOME[pane];
}

/** Sichtbare Bereiche eines Platzes in Reiter-Reihenfolge. */
export function shownIn(
  stacks: Stacks,
  slot: SlotId,
  visible: (pane: PaneId) => boolean,
): PaneId[] {
  return stacks[slot].filter(visible);
}

/** Der Bereich, den ein Platz zeigt: der vordere Reiter, sonst der erste sichtbare. */
export function frontOf(
  arrangement: Arrangement,
  slot: SlotId,
  visible: (pane: PaneId) => boolean,
): PaneId | null {
  const shown = shownIn(arrangement.stacks, slot, visible);
  const front = arrangement.front[slot];
  return front !== null && shown.includes(front) ? front : (shown[0] ?? null);
}

export function bringToFront<T extends Arrangement>(arrangement: T, pane: PaneId): T {
  const slot = slotOf(arrangement.stacks, pane);
  if (arrangement.front[slot] === pane) return arrangement;
  return { ...arrangement, front: { ...arrangement.front, [slot]: pane } };
}

/** Tauscht zwei Bereiche — jeder nimmt Platz und Reiter-Stelle des anderen ein. */
export function swapPanes<T extends Arrangement>(arrangement: T, a: PaneId, b: PaneId): T {
  if (a === b) return arrangement;
  const { stacks, front } = arrangement;
  const slotA = slotOf(stacks, a);
  const slotB = slotOf(stacks, b);
  const swap = (pane: PaneId): PaneId => (pane === a ? b : pane === b ? a : pane);
  const nextStacks = {
    ...stacks,
    [slotA]: stacks[slotA].map(swap),
    [slotB]: stacks[slotB].map(swap),
  };
  if (slotA === slotB) return { ...arrangement, stacks: nextStacks };
  return {
    ...arrangement,
    stacks: nextStacks,
    front: {
      ...front,
      [slotA]: front[slotA] === a ? b : front[slotA],
      [slotB]: front[slotB] === b ? a : front[slotB],
    },
  };
}

/** Legt `pane` als vorderen Reiter auf `to`; der alte Platz behält den Rest. */
export function stackPane<T extends Arrangement>(arrangement: T, pane: PaneId, to: SlotId): T {
  const { stacks, front } = arrangement;
  const from = slotOf(stacks, pane);
  if (from === to) return arrangement;
  const rest = stacks[from].filter((entry) => entry !== pane);
  return {
    ...arrangement,
    stacks: { ...stacks, [from]: rest, [to]: [...stacks[to], pane] },
    front: {
      ...front,
      [from]: front[from] === pane ? (rest[0] ?? null) : front[from],
      [to]: pane,
    },
  };
}

/**
 * Freier Platz für einen Reiter, der aus seinem Stapel gelöst wird: zuerst sein
 * Heimatplatz, sonst der erste Platz ohne sichtbaren Bereich. `null`, wenn der
 * Bereich allein liegt oder kein Platz frei ist.
 */
export function freeSlotFor(
  arrangement: Arrangement,
  pane: PaneId,
  visible: (pane: PaneId) => boolean,
): SlotId | null {
  const { stacks } = arrangement;
  const from = slotOf(stacks, pane);
  if (shownIn(stacks, from, visible).length < 2) return null;
  const free = (slot: SlotId): boolean =>
    slot !== from && shownIn(stacks, slot, visible).length === 0;
  if (free(HOME[pane])) return HOME[pane];
  return SLOTS.find(free) ?? null;
}

/** Rechteck als Anteil der Fläche (0…1). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ColumnPlace {
  id: ColumnId;
  x: number;
  w: number;
}

export interface SplitLayout {
  /** Nur Plätze mit sichtbarem Bereich haben ein Rechteck. */
  frames: Partial<Record<SlotId, Rect>>;
  /** Sichtbare Spalten von links nach rechts — zwischen je zwei liegt eine Trennlinie. */
  columns: ColumnPlace[];
  /** Spalten mit zwei belegten Plätzen; `y` ist die Lage der waagerechten Trennlinie. */
  rows: Array<ColumnPlace & { id: RowColumn; y: number }>;
}

export function splitLayout(
  stacks: Stacks,
  visible: (pane: PaneId) => boolean,
  widths: ColumnWidths,
  rowFracs: Readonly<Record<RowColumn, number>>,
): SplitLayout {
  const occupied = (slot: SlotId): boolean => shownIn(stacks, slot, visible).length > 0;
  const present = COLUMNS.filter((column) => COLUMN_SLOTS[column].some(occupied));
  const total = present.reduce((sum, column) => sum + widths[column], 0);

  const frames: Partial<Record<SlotId, Rect>> = {};
  const columns: ColumnPlace[] = [];
  const rows: SplitLayout['rows'] = [];
  let x = 0;
  for (const id of present) {
    const w = widths[id] / total;
    columns.push({ id, x, w });
    const slots = COLUMN_SLOTS[id].filter(occupied);
    if (slots.length === 2 && id !== 'right') {
      const y = rowFracs[id];
      frames[slots[0]] = { x, y: 0, w, h: y };
      frames[slots[1]] = { x, y, w, h: 1 - y };
      rows.push({ id, x, w, y });
    } else if (slots.length === 1) {
      frames[slots[0]] = { x, y: 0, w, h: 1 };
    }
    x += w;
  }
  return { frames, columns, rows };
}

/**
 * Verschiebt die Grenze zwischen zwei benachbarten Spalten auf `at` (Anteil der
 * Fläche). Nur die beiden Spalten tauschen Breite; alle anderen bleiben.
 */
export function moveBoundary(
  widths: ColumnWidths,
  columns: readonly ColumnPlace[],
  left: ColumnId,
  right: ColumnId,
  at: number,
): ColumnWidths {
  const total = columns.reduce((sum, column) => sum + widths[column.id], 0);
  const start = columns.find((column) => column.id === left)?.x ?? 0;
  const pair = widths[left] + widths[right];
  const min = COL_MIN * total;
  if (pair <= 2 * min) return widths;
  const next = Math.min(pair - min, Math.max(min, (at - start) * total));
  const round = (value: number): number => Math.round(value * 10000) / 10000;
  return { ...widths, [left]: round(next), [right]: round(pair - next) };
}
