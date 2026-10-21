// Splitscreen (Entscheidung 0063): Aufteilung der drei Plätze und der
// Ansichtszustand dazu. Kein Schritt hier fasst Filter, Suche oder Auswahl an.

import { describe, expect, it } from 'vitest';
import {
  SPLIT_COL_DEFAULT,
  SPLIT_COL_MAX,
  SPLIT_ROW_MIN,
  movePane,
  splitLayout,
  type PaneId,
} from '../../src/lib/workspace/split';
import { INITIAL_VIEWER_STATE, viewerReducer, type ViewerState } from '../../src/state/viewer';

const SLOTS = { a: 'graph', b: 'table', c: 'card' } as const;
const all = (): boolean => true;
const without =
  (...hidden: PaneId[]) =>
  (pane: PaneId): boolean =>
    !hidden.includes(pane);

describe('splitLayout', () => {
  it('teilt drei Bereiche in zwei Spalten, links zwei Zeilen', () => {
    const layout = splitLayout(SLOTS, all, 0.6, 0.5);
    expect(layout.places).toEqual({
      graph: { column: '1', row: '1' },
      table: { column: '1', row: '2' },
      card: { column: '2', row: '1 / -1' },
    });
    expect(layout.columns).toBe('0.6fr 0.4fr');
    expect(layout.rows).toBe('0.5fr 0.5fr');
    expect(layout.colDivider).toBe(true);
    expect(layout.rowDivider).toBe(true);
  });

  it('lässt einen geschlossenen Bereich weg, der Nachbar füllt die Spalte', () => {
    const layout = splitLayout(SLOTS, without('table'), 0.6, 0.5);
    expect(layout.places.table).toBeUndefined();
    expect(layout.places.graph).toEqual({ column: '1', row: '1' });
    expect(layout.rows).toBe('1fr');
    expect(layout.rowDivider).toBe(false);
    expect(layout.colDivider).toBe(true);
  });

  it('ohne rechten Bereich nimmt die linke Spalte die ganze Breite', () => {
    const layout = splitLayout(SLOTS, without('card'), 0.6, 0.5);
    expect(layout.columns).toBe('1fr');
    expect(layout.colDivider).toBe(false);
    expect(layout.rowDivider).toBe(true);
  });

  it('nur der rechte Bereich: eine Spalte, keine Trennlinie', () => {
    const layout = splitLayout(SLOTS, without('graph', 'table'), 0.6, 0.5);
    expect(layout.places).toEqual({ card: { column: '1', row: '1 / -1' } });
    expect(layout.colDivider).toBe(false);
  });

  it('ein linker Bereich ohne rechten reicht über die volle Höhe', () => {
    const layout = splitLayout(SLOTS, without('table', 'card'), 0.6, 0.5);
    expect(layout.places).toEqual({ graph: { column: '1', row: '1 / -1' } });
  });
});

describe('movePane', () => {
  it('tauscht mit dem bisherigen Inhaber des Ziels', () => {
    expect(movePane(SLOTS, 'card', 'a')).toEqual({ a: 'card', b: 'table', c: 'graph' });
  });

  it('auf den eigenen Platz ändert nichts', () => {
    expect(movePane(SLOTS, 'graph', 'a')).toBe(SLOTS);
  });
});

describe('Ansichtszustand der Arbeitsfläche', () => {
  const base: ViewerState = { ...INITIAL_VIEWER_STATE };

  it('startet im Splitscreen mit Graph links oben, Tabelle darunter, Karte rechts', () => {
    expect(base.view.workspace.mode).toBe('split');
    expect(base.view.workspace.slots).toEqual(SLOTS);
  });

  it('wechselt die Anordnung, ohne Filter oder Auswahl anzufassen', () => {
    const next = viewerReducer(base, { type: 'workspaceMode', mode: 'windows' });
    expect(next.view.workspace.mode).toBe('windows');
    expect(next.filter).toBe(base.filter);
    expect(next.selection).toBe(base.selection);
  });

  it('tauscht Plätze', () => {
    const next = viewerReducer(base, { type: 'movePane', pane: 'table', to: 'c' });
    expect(next.view.workspace.slots).toEqual({ a: 'graph', b: 'card', c: 'table' });
  });

  it('schließt und öffnet Bereiche', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'card', closed: true });
    expect(shut.view.workspace.closed.card).toBe(true);
    const open = viewerReducer(shut, { type: 'paneClosed', pane: 'card', closed: false });
    expect(open.view.workspace.closed.card).toBe(false);
    expect(viewerReducer(open, { type: 'paneClosed', pane: 'card', closed: false })).toBe(open);
  });

  it('öffnet den Bereich „Position" wieder, sobald jemand etwas anwählt', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'card', closed: true });
    const next = viewerReducer(shut, { type: 'selectNode', id: 'irgendwas' });
    expect(next.view.workspace.closed.card).toBe(false);
  });

  it('begrenzt die Trennlinien und setzt sie mit null zurück', () => {
    const wide = viewerReducer(base, { type: 'splitSize', colFrac: 0.99, rowFrac: 0.01 });
    expect(wide.view.workspace.colFrac).toBe(SPLIT_COL_MAX);
    expect(wide.view.workspace.rowFrac).toBe(SPLIT_ROW_MIN);
    const reset = viewerReducer(wide, { type: 'splitSize', colFrac: null });
    expect(reset.view.workspace.colFrac).toBe(SPLIT_COL_DEFAULT);
    expect(reset.view.workspace.rowFrac).toBe(SPLIT_ROW_MIN);
  });

  it('holt eine geschlossene Tabelle zurück, wenn jemand sie anfordert', () => {
    const shut = viewerReducer(base, { type: 'paneClosed', pane: 'table', closed: true });
    const next = viewerReducer(shut, { type: 'openInTable', id: null });
    expect(next.view.workspace.closed.table).toBe(false);
    expect(next.view.tableWindow.open).toBe(true);
  });

  it('behält die Anordnung beim nächsten LV', () => {
    const moved = viewerReducer(base, { type: 'movePane', pane: 'card', to: 'a' });
    const next = viewerReducer(moved, { type: 'clear' });
    expect(next.view.workspace.slots).toEqual(moved.view.workspace.slots);
  });
});
