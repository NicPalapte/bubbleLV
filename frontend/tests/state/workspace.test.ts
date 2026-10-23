// Splitscreen (Entscheidungen 0064 und 0070): Aufteilung der fünf Plätze,
// Tauschen und Stapeln sowie der Ansichtszustand dazu. Kein Schritt hier fasst
// Filter, Suche oder Auswahl an.

import { describe, expect, it } from 'vitest';
import {
  INITIAL_ARRANGEMENT,
  ROWS_DEFAULT,
  SPLIT_ROW_MIN,
  WIDTHS_DEFAULT,
  freeSlotFor,
  frontOf,
  moveBoundary,
  splitLayout,
  stackPane,
  swapPanes,
  type PaneId,
} from '../../src/lib/workspace/split';
import { INITIAL_VIEWER_STATE, viewerReducer, type ViewerState } from '../../src/state/viewer';

const { stacks } = INITIAL_ARRANGEMENT;
const all = (): boolean => true;
const without =
  (...hidden: PaneId[]) =>
  (pane: PaneId): boolean =>
    !hidden.includes(pane);

describe('splitLayout', () => {
  it('teilt fünf Bereiche in drei Spalten, links und in der Mitte je zwei Zeilen', () => {
    const layout = splitLayout(stacks, all, WIDTHS_DEFAULT, ROWS_DEFAULT);
    expect(layout.columns.map((column) => column.id)).toEqual(['side', 'main', 'right']);
    expect(layout.frames.sideTop).toEqual({ x: 0, y: 0, w: 0.22, h: 0.5 });
    expect(layout.frames.a?.x).toBeCloseTo(0.22);
    expect(layout.frames.a?.h).toBeCloseTo(0.56);
    expect(layout.frames.c).toEqual({ x: 0.72, y: 0, w: 0.28, h: 1 });
    expect(layout.rows.map((row) => row.id)).toEqual(['side', 'main']);
  });

  it('ohne Überblick und Prüfung entfällt die linke Spalte, die übrigen teilen sich die Breite', () => {
    const layout = splitLayout(stacks, without('overview', 'check'), WIDTHS_DEFAULT, ROWS_DEFAULT);
    expect(layout.frames.sideTop).toBeUndefined();
    expect(layout.columns.map((column) => column.id)).toEqual(['main', 'right']);
    expect(layout.frames.a?.w).toBeCloseTo(0.5 / 0.78);
  });

  it('ein einzelner Bereich einer Spalte reicht über die volle Höhe', () => {
    const layout = splitLayout(stacks, without('table'), WIDTHS_DEFAULT, ROWS_DEFAULT);
    expect(layout.frames.a?.h).toBe(1);
    expect(layout.rows.map((row) => row.id)).toEqual(['side']);
  });

  it('ein Stapel belegt nur einen Platz', () => {
    const stacked = stackPane(INITIAL_ARRANGEMENT, 'check', 'c');
    const layout = splitLayout(stacked.stacks, all, WIDTHS_DEFAULT, ROWS_DEFAULT);
    expect(layout.frames.sideBottom).toBeUndefined();
    expect(layout.frames.sideTop?.h).toBe(1);
  });
});

describe('Tauschen und Stapeln', () => {
  it('tauscht zwei Bereiche über Spalten hinweg', () => {
    const next = swapPanes(INITIAL_ARRANGEMENT, 'check', 'card');
    expect(next.stacks.c).toEqual(['check']);
    expect(next.stacks.sideBottom).toEqual(['card']);
    expect(next.front.c).toBe('check');
  });

  it('tauschen mit sich selbst ändert nichts', () => {
    expect(swapPanes(INITIAL_ARRANGEMENT, 'graph', 'graph')).toBe(INITIAL_ARRANGEMENT);
  });

  it('stapelt die Prüfung auf die Position und legt sie nach vorn', () => {
    const next = stackPane(INITIAL_ARRANGEMENT, 'check', 'c');
    expect(next.stacks.c).toEqual(['card', 'check']);
    expect(next.stacks.sideBottom).toEqual([]);
    expect(frontOf(next, 'c', all)).toBe('check');
  });

  it('ein geschlossener vorderer Reiter macht dem nächsten Platz', () => {
    const next = stackPane(INITIAL_ARRANGEMENT, 'check', 'c');
    expect(frontOf(next, 'c', without('check'))).toBe('card');
  });

  it('löst einen Reiter zurück auf seinen Heimatplatz', () => {
    const next = stackPane(INITIAL_ARRANGEMENT, 'check', 'c');
    expect(freeSlotFor(next, 'check', all)).toBe('sideBottom');
    expect(freeSlotFor(next, 'card', all)).toBe('sideBottom');
    expect(freeSlotFor(INITIAL_ARRANGEMENT, 'graph', all)).toBeNull();
  });

  it('ohne freien Platz bleibt der Reiter im Stapel', () => {
    const full = stackPane(INITIAL_ARRANGEMENT, 'check', 'c');
    const moved = { ...full, stacks: { ...full.stacks, sideBottom: ['graph'] as PaneId[], a: [] } };
    // Heimat von „Prüfung" ist belegt; `a` ist leer und damit frei.
    expect(freeSlotFor(moved, 'check', all)).toBe('a');
  });
});

describe('moveBoundary', () => {
  const columns = splitLayout(stacks, all, WIDTHS_DEFAULT, ROWS_DEFAULT).columns;

  it('verschiebt nur die beiden Nachbarn', () => {
    const next = moveBoundary(WIDTHS_DEFAULT, columns, 'main', 'right', 0.62);
    expect(next.side).toBe(WIDTHS_DEFAULT.side);
    expect(next.main + next.right).toBeCloseTo(WIDTHS_DEFAULT.main + WIDTHS_DEFAULT.right);
    expect(next.main).toBeCloseTo(0.4);
  });

  it('hält eine Mindestbreite', () => {
    const next = moveBoundary(WIDTHS_DEFAULT, columns, 'side', 'main', 0);
    expect(next.side).toBeCloseTo(0.12);
  });
});

describe('Ansichtszustand der Arbeitsfläche', () => {
  const base: ViewerState = { ...INITIAL_VIEWER_STATE };

  it('startet im Splitscreen, Überblick und Prüfung sind zu', () => {
    expect(base.view.workspace.mode).toBe('split');
    expect(base.view.workspace.stacks).toEqual(stacks);
    expect(base.view.workspace.closed.overview).toBe(true);
    expect(base.view.workspace.closed.check).toBe(true);
  });

  it('wechselt die Anordnung, ohne Filter oder Auswahl anzufassen', () => {
    const next = viewerReducer(base, { type: 'workspaceMode', mode: 'windows' });
    expect(next.view.workspace.mode).toBe('windows');
    expect(next.filter).toBe(base.filter);
    expect(next.selection).toBe(base.selection);
  });

  it('tauscht und stapelt, ohne Filter oder Auswahl anzufassen', () => {
    const swapped = viewerReducer(base, { type: 'swapPanes', a: 'table', b: 'card' });
    expect(swapped.view.workspace.stacks.c).toEqual(['table']);
    const stacked = viewerReducer(swapped, { type: 'stackPane', pane: 'check', to: 'c' });
    expect(stacked.view.workspace.stacks.c).toEqual(['table', 'check']);
    expect(stacked.filter).toBe(base.filter);
    expect(stacked.selection).toBe(base.selection);
  });

  it('schließt und öffnet Bereiche; Öffnen legt nach vorn', () => {
    const stacked = viewerReducer(base, { type: 'stackPane', pane: 'check', to: 'c' });
    const front = viewerReducer(stacked, { type: 'paneFront', pane: 'card' });
    expect(front.view.workspace.front.c).toBe('card');
    const open = viewerReducer(front, { type: 'paneClosed', pane: 'check', closed: false });
    expect(open.view.workspace.closed.check).toBe(false);
    expect(open.view.workspace.front.c).toBe('check');
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
    expect(picked.view.workspace.front.c).toBe('check');
  });

  it('der Reiter „Prüfung" der Kennzahlen öffnet auch den Bereich', () => {
    const next = viewerReducer(base, { type: 'sidePanel', panel: 'check' });
    expect(next.view.side).toBe('check');
    expect(next.view.workspace.closed.check).toBe(false);
  });

  it('begrenzt die Trennlinien und setzt sie mit null zurück', () => {
    const tall = viewerReducer(base, { type: 'splitSize', row: { column: 'main', frac: 0.01 } });
    expect(tall.view.workspace.rows.main).toBe(SPLIT_ROW_MIN);
    const widths = { side: 0.3, main: 0.4, right: 0.3 };
    const wide = viewerReducer(tall, { type: 'splitSize', widths });
    expect(wide.view.workspace.widths).toBe(widths);
    const reset = viewerReducer(wide, { type: 'splitSize', widths: null });
    expect(reset.view.workspace.widths).toBe(WIDTHS_DEFAULT);
    expect(reset.view.workspace.rows.main).toBe(SPLIT_ROW_MIN);
    const rows = viewerReducer(reset, { type: 'splitSize', row: { column: 'main', frac: null } });
    expect(rows.view.workspace.rows.main).toBe(ROWS_DEFAULT.main);
  });

  it('holt eine geschlossene Tabelle zurück, wenn jemand sie anfordert', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'table', closed: true });
    const next = viewerReducer(shut, { type: 'openInTable', id: null });
    expect(next.view.workspace.closed.table).toBe(false);
    expect(next.view.tableWindow.open).toBe(true);
  });

  it('behält die Anordnung beim nächsten LV', () => {
    const moved = viewerReducer(base, { type: 'swapPanes', a: 'card', b: 'graph' });
    const next = viewerReducer(moved, { type: 'clear' });
    expect(next.view.workspace.stacks).toEqual(moved.view.workspace.stacks);
  });
});
