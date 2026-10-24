// Splitscreen (Entscheidungen 0064, 0070 und 0073): Baum aus Teilungen, Tauschen,
// Stapeln, Teilen und Durchlaufen sowie der Ansichtszustand dazu. Kein Schritt
// hier fasst Filter, Suche oder Auswahl an.

import { describe, expect, it } from 'vitest';
import {
  INITIAL_ARRANGEMENT,
  SPLIT_MIN,
  edgePane,
  findSplit,
  frontOf,
  leafOf,
  leavesOf,
  moveBoundary,
  shownChildren,
  splitLayout,
  splitPane,
  stackPane,
  swapPanes,
  toArrangement,
  toStoredWorkspace,
  type Arrangement,
  type PaneId,
  type Split,
} from '../../src/lib/workspace/split';
import { INITIAL_WORKSPACE } from '../../src/state/viewState';
import { INITIAL_VIEWER_STATE, viewerReducer, type ViewerState } from '../../src/state/viewer';

const start = INITIAL_ARRANGEMENT;
const all = (): boolean => true;
const without =
  (...hidden: PaneId[]) =>
  (pane: PaneId): boolean =>
    !hidden.includes(pane);
const frameOf = (
  arrangement: Arrangement,
  pane: PaneId,
  visible: (pane: PaneId) => boolean = all,
) => splitLayout(arrangement.root, visible).frames[leafOf(arrangement.root, pane).id];

describe('splitLayout', () => {
  it('teilt fünf Bereiche in drei Spalten, links und in der Mitte je zwei Zeilen', () => {
    const layout = splitLayout(start.root, all);
    expect(layout.frames.sideTop).toEqual({ x: 0, y: 0, w: 0.22, h: 0.5 });
    expect(layout.frames.a?.x).toBeCloseTo(0.22);
    expect(layout.frames.a?.h).toBeCloseTo(0.56);
    expect(layout.frames.c?.x).toBeCloseTo(0.72);
    expect(layout.frames.c?.h).toBe(1);
    // zwei senkrechte Linien zwischen den Spalten, je eine waagerechte links und mitte
    expect(layout.lines.filter((line) => line.axis === 'row')).toHaveLength(2);
    expect(layout.lines.filter((line) => line.axis === 'col')).toHaveLength(2);
  });

  it('ohne Überblick und Prüfung entfällt die linke Spalte, die übrigen teilen sich die Breite', () => {
    const layout = splitLayout(start.root, without('overview', 'check'));
    expect(layout.frames.sideTop).toBeUndefined();
    expect(layout.frames.a?.x).toBe(0);
    expect(layout.frames.a?.w).toBeCloseTo(0.5 / 0.78);
  });

  it('ein einzelner Bereich einer Spalte reicht über die volle Höhe', () => {
    const layout = splitLayout(start.root, without('table', 'doc'));
    expect(layout.frames.a?.h).toBe(1);
    expect(layout.lines.filter((line) => line.split === 'main')).toHaveLength(0);
  });

  it('ein Stapel belegt nur einen Platz', () => {
    const stacked = stackPane(start, 'check', 'c');
    const layout = splitLayout(stacked.root, all);
    expect(layout.frames.sideBottom).toBeUndefined();
    expect(layout.frames.sideTop?.h).toBe(1);
  });
});

describe('Tauschen und Stapeln', () => {
  it('tauscht zwei Bereiche über Spalten hinweg', () => {
    const next = swapPanes(start, 'check', 'card');
    expect(leafOf(next.root, 'check').id).toBe('c');
    expect(leafOf(next.root, 'card').id).toBe('sideBottom');
    expect(leafOf(next.root, 'check').front).toBe('check');
  });

  it('tauschen mit sich selbst ändert nichts', () => {
    expect(swapPanes(start, 'graph', 'graph')).toBe(start);
  });

  it('stapelt die Prüfung auf die Position und legt sie nach vorn', () => {
    const next = stackPane(start, 'check', 'c');
    const place = leafOf(next.root, 'check');
    expect(place.stack).toEqual(['card', 'check']);
    expect(frontOf(place, all)).toBe('check');
    // Der leere Platz fällt weg, die linke Spalte ist nur noch der Überblick.
    expect(leavesOf(next.root).map((entry) => entry.id)).not.toContain('sideBottom');
  });

  it('ein geschlossener vorderer Reiter macht dem nächsten Platz', () => {
    const next = stackPane(start, 'check', 'c');
    expect(frontOf(leafOf(next.root, 'card'), without('check'))).toBe('card');
  });
});

describe('Teilen und Durchlaufen', () => {
  it('teilt nur den Graphen, wenn die Tabelle an seinen rechten Rand kommt', () => {
    const next = splitPane(start, 'table', 'a', 'right');
    const graph = frameOf(next, 'graph');
    const table = frameOf(next, 'table');
    expect(table.y).toBe(graph.y);
    expect(table.x).toBeCloseTo(graph.x + graph.w);
    // Die Position rechts bleibt, wo sie war.
    expect(frameOf(next, 'card')).toEqual(frameOf(start, 'card'));
  });

  it('drei Bereiche nebeneinander: Tabelle an den linken Rand der Position', () => {
    const closed = without('overview', 'check', 'doc');
    const next = splitPane(start, 'table', 'c', 'left');
    const graph = frameOf(next, 'graph', closed);
    const table = frameOf(next, 'table', closed);
    const card = frameOf(next, 'card', closed);
    expect([graph.h, table.h, card.h]).toEqual([1, 1, 1]);
    expect(graph.x).toBeLessThan(table.x);
    expect(table.x).toBeLessThan(card.x);
    // Gleiche Richtung: die Tabelle kommt in die oberste Teilung, kein neuer Zweig.
    const root = next.root as Split;
    expect(root.children).toHaveLength(4);
  });

  it('Teilen nach unten legt den Bereich unter das Ziel', () => {
    const next = splitPane(start, 'card', 'a', 'bottom');
    const graph = frameOf(next, 'graph');
    const card = frameOf(next, 'card');
    expect(card.x).toBeCloseTo(graph.x);
    expect(card.y).toBeCloseTo(graph.y + graph.h);
  });

  it('ein Reiter löst sich als eigener Platz, wenn er an den Rand des eigenen Stapels kommt', () => {
    const stacked = stackPane(start, 'check', 'c');
    const next = splitPane(stacked, 'check', 'c', 'bottom');
    expect(leafOf(next.root, 'check').id).not.toBe(leafOf(next.root, 'card').id);
    expect(frameOf(next, 'check').y).toBeGreaterThan(0);
  });

  it('ein Bereich allein auf seinem Platz teilt sich nicht selbst', () => {
    expect(splitPane(start, 'graph', 'a', 'left')).toBe(start);
  });

  it('am unteren Außenrand läuft die Tabelle über die volle Breite', () => {
    const next = edgePane(start, 'table', 'bottom');
    const table = frameOf(next, 'table');
    expect(table.x).toBe(0);
    expect(table.w).toBe(1);
    expect(table.y + table.h).toBeCloseTo(1);
    expect(frameOf(next, 'card').y + frameOf(next, 'card').h).toBeCloseTo(table.y);
  });

  it('am rechten Außenrand wird der Bereich eine Spalte über die volle Höhe', () => {
    const next = edgePane(start, 'check', 'right');
    const check = frameOf(next, 'check');
    expect(check.h).toBe(1);
    expect(check.x + check.w).toBeCloseTo(1);
  });

  it('vergibt nach mehreren Schritten nie eine Kennung doppelt', () => {
    let next = splitPane(start, 'table', 'c', 'left');
    next = edgePane(next, 'check', 'bottom');
    next = splitPane(next, 'overview', 'a', 'top');
    next = edgePane(next, 'table', 'left');
    const ids: string[] = [];
    const walk = (node: Arrangement['root']): void => {
      ids.push(node.id);
      if (node.kind === 'split') node.children.forEach(walk);
    };
    walk(next.root);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      leavesOf(next.root)
        .flatMap((place) => place.stack)
        .sort(),
    ).toEqual(['card', 'check', 'doc', 'graph', 'overview', 'table']);
  });
});

describe('moveBoundary', () => {
  const root = start.root as Split;
  const line = { before: 1, after: 2 };

  it('verschiebt nur die beiden Nachbarn', () => {
    const next = moveBoundary(root, line, [0, 1, 2], 0.62);
    expect(next[0]).toBe(root.sizes[0]);
    expect(next[1] + next[2]).toBeCloseTo(root.sizes[1] + root.sizes[2]);
    expect(next[1]).toBeCloseTo(0.4);
  });

  it('hält eine Mindestbreite', () => {
    const next = moveBoundary(root, { before: 0, after: 1 }, [0, 1, 2], 0);
    expect(next[0]).toBeCloseTo(SPLIT_MIN);
  });

  it('rechnet geschlossene Kinder nicht mit', () => {
    const shown = shownChildren(root, without('overview', 'check'));
    expect(shown).toEqual([1, 2]);
    const next = moveBoundary(root, line, shown, 0.5);
    expect(next[1]).toBeCloseTo(next[2]);
  });
});

describe('Gemerkte Anordnung', () => {
  it('liest einen gespeicherten Baum zurück, auch einen alten mit `mode`', () => {
    const moved = edgePane(start, 'table', 'bottom');
    const stored = JSON.parse(
      JSON.stringify({ mode: 'split', closed: INITIAL_WORKSPACE.closed, root: moved.root }),
    ) as unknown;
    expect(toStoredWorkspace(stored, INITIAL_WORKSPACE.closed)?.root).toEqual(moved.root);
  });

  it('verwirft Unbrauchbares', () => {
    expect(toStoredWorkspace(null, INITIAL_WORKSPACE.closed)).toBeNull();
    expect(toStoredWorkspace({ closed: INITIAL_WORKSPACE.closed }, INITIAL_WORKSPACE.closed)).toBe(
      null,
    );
    expect(
      toArrangement({ kind: 'split', id: 'r', axis: 'row', children: [], sizes: [] }),
    ).toBeNull();
    expect(
      toArrangement({
        kind: 'split',
        id: 'r',
        axis: 'row',
        sizes: [1, -1],
        children: [
          { kind: 'leaf', id: 'a', stack: ['graph'], front: 'graph' },
          { kind: 'leaf', id: 'b', stack: ['table'], front: 'table' },
        ],
      }),
    ).toBeNull();
  });

  it('ergänzt fehlende Bereiche und wirft doppelte und unbekannte weg', () => {
    const next = toArrangement({
      kind: 'split',
      id: 'r',
      axis: 'row',
      sizes: [1, 1],
      children: [
        { kind: 'leaf', id: 'a', stack: ['graph', 'neu'], front: 'neu' },
        { kind: 'leaf', id: 'b', stack: ['graph', 'table'], front: 'table' },
      ],
    });
    expect(next).not.toBeNull();
    const panes = leavesOf(next!.root).flatMap((place) => place.stack);
    expect([...panes].sort()).toEqual(['card', 'check', 'doc', 'graph', 'overview', 'table']);
    expect(leafOf(next!.root, 'graph').front).toBe('graph');
  });
});

describe('Ansichtszustand der Arbeitsfläche', () => {
  const base: ViewerState = { ...INITIAL_VIEWER_STATE };

  it('startet im Splitscreen, Überblick und Prüfung sind zu', () => {
    expect(base.view.workspace.root).toBe(start.root);
    expect(base.view.workspace.closed.overview).toBe(true);
    expect(base.view.workspace.closed.check).toBe(true);
  });

  it('tauscht, stapelt und teilt, ohne Filter oder Auswahl anzufassen', () => {
    const swapped = viewerReducer(base, { type: 'swapPanes', a: 'table', b: 'card' });
    expect(leafOf(swapped.view.workspace.root, 'table').id).toBe('c');
    const stacked = viewerReducer(swapped, { type: 'stackPane', pane: 'check', to: 'c' });
    expect(leafOf(stacked.view.workspace.root, 'check').stack).toEqual(['table', 'check']);
    const split = viewerReducer(stacked, {
      type: 'splitPane',
      pane: 'check',
      target: 'a',
      side: 'right',
    });
    const edge = viewerReducer(split, { type: 'edgePane', pane: 'overview', side: 'left' });
    expect(edge.view.workspace).not.toBe(split.view.workspace);
    expect(edge.filter).toBe(base.filter);
    expect(edge.selection).toBe(base.selection);
  });

  it('schließt und öffnet Bereiche; Öffnen legt nach vorn', () => {
    const stacked = viewerReducer(base, { type: 'stackPane', pane: 'check', to: 'c' });
    const front = viewerReducer(stacked, { type: 'paneFront', pane: 'card' });
    expect(leafOf(front.view.workspace.root, 'card').front).toBe('card');
    const open = viewerReducer(front, { type: 'paneClosed', pane: 'check', closed: false });
    expect(open.view.workspace.closed.check).toBe(false);
    expect(leafOf(open.view.workspace.root, 'card').front).toBe('check');
    expect(viewerReducer(open, { type: 'paneClosed', pane: 'check', closed: false })).toBe(open);
  });

  it('eine Auswahl öffnet die geschlossene Position, holt sie aber nicht vor einen Reiter', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'card', closed: true });
    expect(viewerReducer(shut, { type: 'selectNode', id: 'x' }).view.workspace.closed.card).toBe(
      false,
    );
    const open = viewerReducer(base, { type: 'paneClosed', pane: 'check', closed: false });
    const stacked = viewerReducer(open, { type: 'stackPane', pane: 'check', to: 'c' });
    const picked = viewerReducer(stacked, { type: 'selectNode', id: 'x' });
    expect(leafOf(picked.view.workspace.root, 'card').front).toBe('check');
  });

  it('„showPane" öffnet einen Bereich und holt ihn vor einen Reiter', () => {
    const stacked = viewerReducer(base, { type: 'stackPane', pane: 'check', to: 'c' });
    const front = viewerReducer(stacked, { type: 'paneFront', pane: 'card' });
    const next = viewerReducer(front, { type: 'showPane', pane: 'check' });
    expect(next.view.workspace.closed.check).toBe(false);
    expect(leafOf(next.view.workspace.root, 'card').front).toBe('check');
  });

  it('setzt die Größe einer Teilung und mit null zurück', () => {
    const wide = viewerReducer(base, { type: 'splitSize', split: 'root', sizes: [0.3, 0.4, 0.3] });
    expect(findSplit(wide.view.workspace.root, 'root')?.sizes).toEqual([0.3, 0.4, 0.3]);
    const reset = viewerReducer(wide, { type: 'splitSize', split: 'root', sizes: null });
    expect(findSplit(reset.view.workspace.root, 'root')?.sizes).toEqual([0.22, 0.5, 0.28]);
    expect(viewerReducer(base, { type: 'splitSize', split: 'fehlt', sizes: [1, 1] })).toBe(base);
  });

  it('„Zurücksetzen" stellt Anordnung und offene Bereiche des Anfangs her', () => {
    const moved = viewerReducer(base, { type: 'edgePane', pane: 'table', side: 'bottom' });
    const open = viewerReducer(moved, { type: 'showPane', pane: 'check' });
    const reset = viewerReducer(open, { type: 'workspaceReset' });
    expect(reset.view.workspace.root).toBe(start.root);
    expect(reset.view.workspace.closed).toEqual(INITIAL_WORKSPACE.closed);
  });

  it('übernimmt die gemerkte Anordnung nur, solange nichts verändert ist', () => {
    const stored = { ...INITIAL_WORKSPACE, ...edgePane(start, 'table', 'bottom') };
    const restored = viewerReducer(base, { type: 'workspaceRestore', workspace: stored });
    expect(restored.view.workspace).toBe(stored);
    const moved = viewerReducer(base, { type: 'swapPanes', a: 'card', b: 'graph' });
    expect(viewerReducer(moved, { type: 'workspaceRestore', workspace: stored })).toBe(moved);
  });

  it('holt eine geschlossene Tabelle zurück, wenn jemand sie anfordert', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'table', closed: true });
    const next = viewerReducer(shut, { type: 'openInTable', id: null });
    expect(next.view.workspace.closed.table).toBe(false);
  });

  it('behält die Anordnung beim nächsten LV', () => {
    const moved = viewerReducer(base, { type: 'swapPanes', a: 'card', b: 'graph' });
    const next = viewerReducer(moved, { type: 'clear' });
    expect(next.view.workspace.root).toEqual(moved.view.workspace.root);
  });

  it('Dokument: zu bis „+ Dokument", dann als Reiter neben der Tabelle (Entscheidung 0072)', () => {
    expect(base.view.workspace.closed.doc).toBe(true);
    const open = viewerReducer(base, { type: 'showPane', pane: 'doc' });
    expect(open.view.workspace.closed.doc).toBe(false);
    expect(leafOf(open.view.workspace.root, 'doc').id).toBe('b');
    expect(leafOf(open.view.workspace.root, 'doc').front).toBe('doc');
    const shut = viewerReducer(open, { type: 'paneClosed', pane: 'doc', closed: true });
    expect(shut.view.workspace.closed.doc).toBe(true);
  });
});
