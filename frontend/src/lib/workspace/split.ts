// Aufteilung der Arbeitsfläche im Splitscreen (Entscheidungen 0064, 0070, 0072, 0073):
// ein Baum aus Teilungen. Eine Teilung legt ihre Kinder nebeneinander (`row`) oder
// übereinander (`col`); ein Blatt ist ein Platz mit einem Stapel von Bereichen.
// Liegen mehrere Bereiche auf einem Platz, zeigt er sie als Reiter. Ein Platz ohne
// sichtbaren Bereich gibt seine Fläche frei, eine Teilung ohne sichtbares Kind
// ebenso. Das Begleitdokument (0072) liegt anfangs als Reiter neben der Tabelle.
// Reine Funktionen — die Komponente rechnet nur noch Anteile in CSS um.

export type PaneId = 'graph' | 'table' | 'card' | 'overview' | 'check' | 'doc';
/** `row` = Kinder nebeneinander, `col` = übereinander. */
export type Axis = 'row' | 'col';
export type Side = 'left' | 'right' | 'top' | 'bottom';

export const PANE_LABEL: Readonly<Record<PaneId, string>> = {
  graph: 'Graph',
  table: 'Tabelle',
  card: 'Position',
  overview: 'Überblick',
  check: 'Prüfung',
  doc: 'Dokument',
};

export const PANES: readonly PaneId[] = ['graph', 'table', 'card', 'overview', 'check', 'doc'];

export interface Leaf {
  kind: 'leaf';
  id: string;
  stack: readonly PaneId[];
  front: PaneId | null;
}

export interface Split {
  kind: 'split';
  id: string;
  axis: Axis;
  children: readonly LayoutNode[];
  /** Gewichte der Kinder; fehlt ein Kind, teilen sich die übrigen die Fläche. */
  sizes: readonly number[];
}

export type LayoutNode = Leaf | Split;

/** Was wo liegt. */
export interface Arrangement {
  root: LayoutNode;
}

const leaf = (id: string, pane: PaneId): Leaf => ({ kind: 'leaf', id, stack: [pane], front: pane });

// Wie bisher: links Überblick über Prüfung, Mitte Graph über Tabelle, rechts Position.
export const INITIAL_ARRANGEMENT: Arrangement = {
  root: {
    kind: 'split',
    id: 'root',
    axis: 'row',
    sizes: [0.22, 0.5, 0.28],
    children: [
      {
        kind: 'split',
        id: 'side',
        axis: 'col',
        sizes: [0.5, 0.5],
        children: [leaf('sideTop', 'overview'), leaf('sideBottom', 'check')],
      },
      {
        kind: 'split',
        id: 'main',
        axis: 'col',
        sizes: [0.56, 0.44],
        children: [
          leaf('a', 'graph'),
          { kind: 'leaf', id: 'b', stack: ['table', 'doc'], front: 'table' },
        ],
      },
      leaf('c', 'card'),
    ],
  },
};

/** Keine Fläche wird schmaler als dieser Anteil ihrer Teilung. */
export const SPLIT_MIN = 0.12;
/** Anteil, den ein Bereich am äußeren Rand der ganzen Fläche bekommt. */
export const EDGE_SHARE = 0.3;

export function leavesOf(node: LayoutNode): Leaf[] {
  return node.kind === 'leaf' ? [node] : node.children.flatMap(leavesOf);
}

export function leafOf(root: LayoutNode, pane: PaneId): Leaf {
  const all = leavesOf(root);
  return all.find((entry) => entry.stack.includes(pane)) ?? all[0];
}

/** Sichtbare Bereiche eines Platzes in Reiter-Reihenfolge. */
export function shownIn(place: Leaf, visible: (pane: PaneId) => boolean): PaneId[] {
  return place.stack.filter(visible);
}

/** Der Bereich, den ein Platz zeigt: der vordere Reiter, sonst der erste sichtbare. */
export function frontOf(place: Leaf, visible: (pane: PaneId) => boolean): PaneId | null {
  const shown = shownIn(place, visible);
  return place.front !== null && shown.includes(place.front) ? place.front : (shown[0] ?? null);
}

/** Baut den Baum neu, wo `fn` ein Blatt ändert; Unverändertes behält seine Identität. */
function mapLeaves(node: LayoutNode, fn: (place: Leaf) => Leaf): LayoutNode {
  if (node.kind === 'leaf') return fn(node);
  let changed = false;
  const children = node.children.map((child) => {
    const next = mapLeaves(child, fn);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...node, children } : node;
}

function withRoot<T extends Arrangement>(arrangement: T, root: LayoutNode): T {
  return root === arrangement.root ? arrangement : { ...arrangement, root };
}

export function bringToFront<T extends Arrangement>(arrangement: T, pane: PaneId): T {
  return withRoot(
    arrangement,
    mapLeaves(arrangement.root, (place) =>
      place.stack.includes(pane) && place.front !== pane ? { ...place, front: pane } : place,
    ),
  );
}

/** Tauscht zwei Bereiche — jeder nimmt Platz und Reiter-Stelle des anderen ein. */
export function swapPanes<T extends Arrangement>(arrangement: T, a: PaneId, b: PaneId): T {
  if (a === b) return arrangement;
  const swap = (pane: PaneId): PaneId => (pane === a ? b : pane === b ? a : pane);
  const root = mapLeaves(arrangement.root, (place) => {
    const hasA = place.stack.includes(a);
    const hasB = place.stack.includes(b);
    if (!hasA && !hasB) return place;
    // Im selben Stapel tauschen nur die Reiter-Stellen; der vordere bleibt vorn.
    const front = hasA && hasB ? place.front : place.front === null ? null : swap(place.front);
    return { ...place, stack: place.stack.map(swap), front };
  });
  return withRoot(arrangement, root);
}

function removePane(node: LayoutNode, pane: PaneId): LayoutNode {
  return mapLeaves(node, (place) => {
    if (!place.stack.includes(pane)) return place;
    const stack = place.stack.filter((entry) => entry !== pane);
    return { ...place, stack, front: place.front === pane ? (stack[0] ?? null) : place.front };
  });
}

/**
 * Räumt auf: leere Plätze fallen weg, eine Teilung mit einem Kind macht ihm
 * Platz, und eine Teilung in gleicher Richtung wie ihre Eltern geht in ihnen auf.
 */
function prune(node: LayoutNode): LayoutNode | null {
  if (node.kind === 'leaf') return node.stack.length === 0 ? null : node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((child, i) => {
    const next = prune(child);
    if (next === null) return;
    if (next.kind === 'split' && next.axis === node.axis) {
      const total = sum(next.sizes);
      next.children.forEach((grand, j) => {
        children.push(grand);
        sizes.push((node.sizes[i] * next.sizes[j]) / total);
      });
    } else {
      children.push(next);
      sizes.push(node.sizes[i]);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  const same =
    children.length === node.children.length &&
    children.every((child, i) => child === node.children[i]);
  return same ? node : { ...node, children, sizes };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** `count` neue, im Baum noch unbenutzte Kennungen. */
function freshIds(root: LayoutNode, count: number): string[] {
  const used = new Set<string>();
  const walk = (node: LayoutNode): void => {
    used.add(node.id);
    if (node.kind === 'split') node.children.forEach(walk);
  };
  walk(root);
  const out: string[] = [];
  for (let n = used.size; out.length < count; n += 1) {
    if (!used.has(`n${n}`)) out.push(`n${n}`);
  }
  return out;
}

/** Legt `pane` als vorderen Reiter auf den Platz `to`; der alte Platz behält den Rest. */
export function stackPane<T extends Arrangement>(arrangement: T, pane: PaneId, to: string): T {
  const from = leafOf(arrangement.root, pane);
  if (from.id === to || !leavesOf(arrangement.root).some((place) => place.id === to)) {
    return arrangement;
  }
  const removed = removePane(arrangement.root, pane);
  const added = mapLeaves(removed, (place) =>
    place.id === to ? { ...place, stack: [...place.stack, pane], front: pane } : place,
  );
  return withRoot(arrangement, prune(added) ?? arrangement.root);
}

const axisOf = (side: Side): Axis => (side === 'left' || side === 'right' ? 'row' : 'col');
const before = (side: Side): boolean => side === 'left' || side === 'top';

/**
 * Teilt den Platz `target` und legt `pane` auf die Seite `side` — nur dieser Platz
 * wird geteilt. Liegt `pane` dort selbst im Stapel, löst er sich als eigener Platz.
 */
export function splitPane<T extends Arrangement>(
  arrangement: T,
  pane: PaneId,
  target: string,
  side: Side,
): T {
  const from = leafOf(arrangement.root, pane);
  if (from.id === target && from.stack.length < 2) return arrangement;
  if (!leavesOf(arrangement.root).some((place) => place.id === target)) return arrangement;
  const removed = prune(removePane(arrangement.root, pane));
  if (removed === null) return arrangement;
  const [id, splitId] = freshIds(removed, 2);
  const fresh = leaf(id, pane);
  const axis = axisOf(side);
  const insert = (node: LayoutNode): LayoutNode => {
    if (node.kind === 'leaf') {
      if (node.id !== target) return node;
      const children = before(side) ? [fresh, node] : [node, fresh];
      return { kind: 'split', id: splitId, axis, children, sizes: [0.5, 0.5] };
    }
    const at = node.children.findIndex((child) => child.kind === 'leaf' && child.id === target);
    if (at >= 0 && node.axis === axis) {
      // Gleiche Richtung: der neue Platz kommt neben das Ziel und teilt sich dessen Breite.
      const half = node.sizes[at] / 2;
      const children = [...node.children];
      const sizes = [...node.sizes];
      children.splice(before(side) ? at : at + 1, 0, fresh);
      sizes.splice(at, 1, half, half);
      return { ...node, children, sizes };
    }
    const children = node.children.map(insert);
    return children.every((child, i) => child === node.children[i]) ? node : { ...node, children };
  };
  return withRoot(arrangement, insert(removed));
}

/** Legt `pane` an den äußeren Rand der Fläche — er läuft über die volle Höhe bzw. Breite. */
export function edgePane<T extends Arrangement>(arrangement: T, pane: PaneId, side: Side): T {
  const removed = prune(removePane(arrangement.root, pane));
  if (removed === null) return arrangement;
  const [id, rootId] = freshIds(removed, 2);
  const fresh = leaf(id, pane);
  const axis = axisOf(side);
  let root: LayoutNode;
  if (removed.kind === 'split' && removed.axis === axis) {
    const total = sum(removed.sizes);
    const share = total / Math.max(2, removed.children.length);
    const children = before(side) ? [fresh, ...removed.children] : [...removed.children, fresh];
    const sizes = before(side) ? [share, ...removed.sizes] : [...removed.sizes, share];
    root = { ...removed, children, sizes };
  } else {
    const children = before(side) ? [fresh, removed] : [removed, fresh];
    const sizes = before(side) ? [EDGE_SHARE, 1 - EDGE_SHARE] : [1 - EDGE_SHARE, EDGE_SHARE];
    root = { kind: 'split', id: rootId, axis, children, sizes };
  }
  return withRoot(arrangement, root);
}

/** Gewichte einer Teilung nach Doppelklick: wie am Anfang, sonst gleich breit. */
export function defaultSizes(split: Split): number[] {
  const initial = findSplit(INITIAL_ARRANGEMENT.root, split.id);
  if (initial !== null && initial.children.length === split.children.length) {
    return [...initial.sizes];
  }
  return split.children.map(() => 1 / split.children.length);
}

export function findSplit(node: LayoutNode, id: string): Split | null {
  if (node.kind === 'leaf') return null;
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findSplit(child, id);
    if (found !== null) return found;
  }
  return null;
}

/** Setzt die Gewichte einer Teilung; `null` setzt sie zurück. */
export function resizeSplit<T extends Arrangement>(
  arrangement: T,
  id: string,
  sizes: readonly number[] | null,
): T {
  const walk = (node: LayoutNode): LayoutNode => {
    if (node.kind === 'leaf') return node;
    if (node.id === id) {
      const next = sizes ?? defaultSizes(node);
      if (next.length !== node.children.length || next.every((v, i) => v === node.sizes[i])) {
        return node;
      }
      return { ...node, sizes: next };
    }
    const children = node.children.map(walk);
    return children.every((child, i) => child === node.children[i]) ? node : { ...node, children };
  };
  return withRoot(arrangement, walk(arrangement.root));
}

/** Rechteck als Anteil der Fläche (0…1). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Trennlinie zwischen zwei sichtbaren Kindern einer Teilung. */
export interface SplitLine {
  split: string;
  axis: Axis;
  /** Indizes der beiden Nachbarn in `children`. */
  before: number;
  after: number;
  /** Fläche der ganzen Teilung. */
  area: Rect;
  /** Lage der Linie als Anteil der Teilung (0…1). */
  at: number;
}

export interface SplitLayout {
  /** Nur Plätze mit sichtbarem Bereich haben ein Rechteck. */
  frames: Record<string, Rect>;
  lines: SplitLine[];
}

export function splitLayout(root: LayoutNode, visible: (pane: PaneId) => boolean): SplitLayout {
  const frames: Record<string, Rect> = {};
  const lines: SplitLine[] = [];
  const shows = (node: LayoutNode): boolean =>
    node.kind === 'leaf' ? shownIn(node, visible).length > 0 : node.children.some(shows);
  const place = (node: LayoutNode, area: Rect): void => {
    if (node.kind === 'leaf') {
      frames[node.id] = area;
      return;
    }
    const shown = node.children.map((_, i) => i).filter((i) => shows(node.children[i]));
    const total = shown.reduce((acc, i) => acc + node.sizes[i], 0);
    let offset = 0;
    shown.forEach((i, k) => {
      const frac = node.sizes[i] / total;
      const rect =
        node.axis === 'row'
          ? { x: area.x + offset * area.w, y: area.y, w: frac * area.w, h: area.h }
          : { x: area.x, y: area.y + offset * area.h, w: area.w, h: frac * area.h };
      if (k > 0) {
        lines.push({
          split: node.id,
          axis: node.axis,
          before: shown[k - 1],
          after: i,
          area,
          at: offset,
        });
      }
      place(node.children[i], rect);
      offset += frac;
    });
  };
  if (shows(root)) place(root, { x: 0, y: 0, w: 1, h: 1 });
  return { frames, lines };
}

/**
 * Verschiebt die Linie zwischen zwei Nachbarn auf `at` (Anteil der Teilung). Nur die
 * beiden tauschen Fläche; alle anderen bleiben. Geschlossene Kinder zählen nicht mit.
 */
export function moveBoundary(
  split: Split,
  line: Pick<SplitLine, 'before' | 'after'>,
  shown: readonly number[],
  at: number,
): number[] {
  const { sizes } = split;
  const total = shown.reduce((acc, i) => acc + sizes[i], 0);
  const start = shown.filter((i) => i < line.before).reduce((acc, i) => acc + sizes[i], 0);
  const pair = sizes[line.before] + sizes[line.after];
  const min = SPLIT_MIN * total;
  if (pair <= 2 * min) return [...sizes];
  const next = Math.min(pair - min, Math.max(min, at * total - start));
  const round = (value: number): number => Math.round(value * 10000) / 10000;
  const out = [...sizes];
  out[line.before] = round(next);
  out[line.after] = round(pair - next);
  return out;
}

/** Sichtbare Kinder einer Teilung — dieselbe Regel wie in `splitLayout`. */
export function shownChildren(split: Split, visible: (pane: PaneId) => boolean): number[] {
  const shows = (node: LayoutNode): boolean =>
    node.kind === 'leaf' ? shownIn(node, visible).length > 0 : node.children.some(shows);
  return split.children.map((_, i) => i).filter((i) => shows(split.children[i]));
}

// ── Schmale Fläche (Entscheidung 0074) ───────────────────────────────────

/** Unter dieser Breite (px) zeigt die Fläche nur Graph + einen Platz mit Reitern. */
export const COMPACT_WIDTH = 1024;
/** Darunter liegen beide übereinander statt nebeneinander (Handy). */
export const STACKED_WIDTH = 700;
/** Reihenfolge der Reiter auf dem gemeinsamen Platz. */
const COMPACT_ORDER: readonly PaneId[] = ['card', 'table', 'overview', 'check', 'doc'];

/**
 * Anordnung für eine schmale Fläche, aus der gemerkten abgeleitet und nie gespeichert:
 * der Graph allein, alle anderen sichtbaren Bereiche als Reiter auf einem Platz.
 */
export function compactRoot(
  visible: (pane: PaneId) => boolean,
  axis: Axis,
  front: PaneId | null,
): LayoutNode {
  const rest = COMPACT_ORDER.filter(visible);
  const restLeaf: Leaf = {
    kind: 'leaf',
    id: 'compactRest',
    stack: rest,
    front: front !== null && rest.includes(front) ? front : (rest[0] ?? null),
  };
  const graphLeaf = leaf('compactGraph', 'graph');
  if (!visible('graph')) return restLeaf;
  if (rest.length === 0) return graphLeaf;
  return {
    kind: 'split',
    id: 'compact',
    axis,
    children: [graphLeaf, restLeaf],
    sizes: axis === 'row' ? [0.55, 0.45] : [0.5, 0.5],
  };
}

// ── Gemerkte Anordnung (Entscheidung 0073) ─────────────────────────────────

/**
 * Was in IndexedDB bleibt: nur Lage und Größe der Bereiche, keine LV-Daten. Ältere
 * Einträge tragen noch `mode` (Split/Fenster) — seit Entscheidung 0074 ungelesen.
 */
export interface StoredWorkspace extends Arrangement {
  closed: Readonly<Record<PaneId, boolean>>;
}

/** Gemerkte Anordnung prüfen; Unbrauchbares ⇒ `null`, dann gilt der Anfang. */
export function toStoredWorkspace(
  value: unknown,
  fallbackClosed: Readonly<Record<PaneId, boolean>>,
): StoredWorkspace | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const arrangement = toArrangement(raw.root);
  if (arrangement === null) return null;
  const closedRaw =
    typeof raw.closed === 'object' && raw.closed !== null
      ? (raw.closed as Record<string, unknown>)
      : {};
  const closed = Object.fromEntries(
    PANES.map((pane) => {
      const flag = closedRaw[pane];
      return [pane, typeof flag === 'boolean' ? flag : fallbackClosed[pane]];
    }),
  ) as Record<PaneId, boolean>;
  return { closed, root: arrangement.root };
}

const MAX_DEPTH = 8;
const ID = /^[A-Za-z0-9_-]{1,24}$/;

/**
 * Baum aus dem Speicher prüfen; Unbrauchbares ⇒ `null`. Fehlende Bereiche (neue
 * App-Version) kommen auf den ersten Platz, doppelte und unbekannte fallen weg.
 */
export function toArrangement(value: unknown): Arrangement | null {
  const seen = new Set<PaneId>();
  const ids = new Set<string>();
  const read = (raw: unknown, depth: number): LayoutNode | null => {
    if (depth > MAX_DEPTH || typeof raw !== 'object' || raw === null) return null;
    const node = raw as Record<string, unknown>;
    if (typeof node.id !== 'string' || !ID.test(node.id) || ids.has(node.id)) return null;
    ids.add(node.id);
    if (node.kind === 'leaf') {
      if (!Array.isArray(node.stack)) return null;
      const stack: PaneId[] = [];
      for (const pane of node.stack as unknown[]) {
        if (!PANES.includes(pane as PaneId) || seen.has(pane as PaneId)) continue;
        seen.add(pane as PaneId);
        stack.push(pane as PaneId);
      }
      const front = stack.find((pane) => pane === node.front) ?? stack[0] ?? null;
      return { kind: 'leaf', id: node.id, stack, front };
    }
    if (node.kind !== 'split' || (node.axis !== 'row' && node.axis !== 'col')) return null;
    if (!Array.isArray(node.children) || !Array.isArray(node.sizes)) return null;
    if (node.children.length !== node.sizes.length || node.children.length < 2) return null;
    const sizes = node.sizes as unknown[];
    if (!sizes.every((size) => typeof size === 'number' && Number.isFinite(size) && size > 0)) {
      return null;
    }
    const children: LayoutNode[] = [];
    for (const child of node.children) {
      const next = read(child, depth + 1);
      if (next === null) return null;
      children.push(next);
    }
    return { kind: 'split', id: node.id, axis: node.axis, children, sizes: sizes as number[] };
  };
  const root = read(value, 0);
  if (root === null) return null;
  const missing = PANES.filter((pane) => !seen.has(pane));
  const first = leavesOf(root)[0];
  const filled =
    missing.length === 0
      ? root
      : mapLeaves(root, (place) =>
          place.id === first.id
            ? { ...place, stack: [...place.stack, ...missing], front: place.front ?? missing[0] }
            : place,
        );
  const clean = prune(filled);
  return clean === null ? null : { root: clean };
}
