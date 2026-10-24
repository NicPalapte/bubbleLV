// Der Viewer-Zustand ist in drei Bereiche getrennt (WP-L): `filter`,
// `selection` und `view`. Die Tests halten fest, was diese Trennung leisten
// soll — ein Ansichtswechsel fasst weder Filter noch Auswahl an, und jede
// Ansicht findet ihren eigenen Zustand wieder.
//
// `view.mode` ist eigener, bewusst gesetzter Zustand (Issue #30): eine
// Sammel-Bubble oder Position lässt sich anwählen, ohne dass die Ansicht
// wechselt (Issue #10) — nur `openInTable`/`showGraph`/`setViewMode` tun das
// gezielt. Der Aufklapp-Zustand liegt in `selection`: Baum und Graph teilen ihn
// (Issue #18) und er überlebt den Ansichtswechsel (Issue #19).

import { describe, expect, it } from 'vitest';
import { SECTION_AXIS } from '../../src/lib/graph/layoutMap';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import {
  INITIAL_VIEWER_STATE,
  MAX_COMPARE,
  viewerReducer,
  type ViewerState,
} from '../../src/state/viewer';
import type { LVDraft } from '@core';

const base: ViewerState = { ...INITIAL_VIEWER_STATE };

const DRAFT: LVDraft = {
  projectName: 'Aufklapp-Test',
  client: null,
  lots: [
    {
      number: '001',
      label: 'Los 1',
      sections: [
        {
          number: '001.001',
          label: 'Abschnitt 1',
          sections: [],
          positions: [
            {
              oz: '001.001.0010',
              shortText: 'Position 1',
              longText: '',
              unit: 'm3',
              quantity: 1,
              unitPrice: 10,
              positionType: 'NORMAL',
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};

function loadedState(state: ViewerState = base): ViewerState {
  return viewerReducer(state, { type: 'loaded', lv: classifyAndBuild(DRAFT, 'test.x83') });
}

describe('viewerReducer · Ansichtsmodus', () => {
  it('beginnt im Graphen mit Tabelle und Position, Überblick und Prüfung zu', () => {
    const state = loadedState();
    expect(state.view.mode).toBe('graph');
    expect(state.view.workspace.closed).toMatchObject({
      graph: false,
      table: false,
      card: false,
      overview: true,
      check: true,
    });
  });

  it('öffnet Überblick und Prüfung als Bereiche im Splitscreen', () => {
    const overview = viewerReducer(base, { type: 'setViewMode', mode: 'overview' });
    expect(overview.view.mode).toBe('graph');
    expect(overview.view.workspace.closed.overview).toBe(false);
    const check = viewerReducer(overview, { type: 'showPane', pane: 'check' });
    expect(check.view.workspace.closed.check).toBe(false);
  });

  it('öffnet die Tabelle als Bereich und holt sie nach vorn', () => {
    const closed = viewerReducer(base, { type: 'paneClosed', pane: 'table', closed: true });
    const table = viewerReducer(closed, { type: 'setViewMode', mode: 'table' });
    expect(table.view.mode).toBe('graph');
    expect(table.view.workspace.closed.table).toBe(false);
  });

  it('wählt einen Knoten an, ohne den Ansichtsmodus zu wechseln', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001' });
    expect(next.selection.nodeId).toBe('section:001');
    expect(next.view.mode).toBe(base.view.mode);
  });

  it('öffnet mit `openInTable` die Tabelle und wählt den Knoten an', () => {
    const closed = viewerReducer(base, { type: 'paneClosed', pane: 'table', closed: true });
    const next = viewerReducer(closed, { type: 'openInTable', id: 'section:001' });
    expect(next.view.workspace.closed.table).toBe(false);
    expect(next.selection.nodeId).toBe('section:001');
  });

  it('wählt eine Position an, ohne den Ansichtsmodus zu wechseln', () => {
    const graph = viewerReducer(base, { type: 'setViewMode', mode: 'graph' });
    const next = viewerReducer(graph, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    expect(next.view.mode).toBe('graph');
    expect(next.selection.positionId).toBe('position:001.0010');
  });

  it('bleibt mit `setViewMode` immer im Graphen', () => {
    const next = viewerReducer(base, { type: 'setViewMode', mode: 'overview' });
    expect(viewerReducer(next, { type: 'setViewMode', mode: 'graph' }).view.mode).toBe('graph');
  });

  it('behält den Ansichtsmodus beim Abwählen des Knotens', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    const next = viewerReducer(table, { type: 'selectNode', id: null });
    expect(next.view).toBe(table.view);
  });

  it('nimmt mit `back` nur die Auswahl zurück, nicht den Ansichtsmodus', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    const back = viewerReducer(table, { type: 'back' });
    expect(back.view).toBe(table.view);
    expect(back.selection.nodeId).toBeNull();
    // Ohne Auswahl ändert ein weiteres `back` nichts mehr.
    expect(viewerReducer(back, { type: 'back' }).selection).toBe(back.selection);
  });

  it('kehrt mit `showGraph` in einem Schritt zum Graphen zurück', () => {
    const deep = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001.004',
      positionId: 'position:001.004.0010',
    });
    const graph = viewerReducer(deep, { type: 'showGraph' });
    expect(graph.view.mode).toBe('graph');
    // Die Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
    expect(graph.selection.nodeId).toBe('section:001.004');
    expect(graph.selection.positionId).toBe('position:001.004.0010');
  });

  it('löst mit `back` zuerst die Position, dann den Knoten — der Ansichtsmodus bleibt', () => {
    const picked = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    const first = viewerReducer(picked, { type: 'back' });
    expect(first.selection.positionId).toBeNull();
    expect(first.selection.nodeId).toBe('section:001');
    const second = viewerReducer(first, { type: 'back' });
    expect(second.selection.nodeId).toBeNull();
    expect(second.view.mode).toBe(base.view.mode);
  });
});

// Die Abnahme von WP-L: Filter setzen, Ansicht wechseln, zurückwechseln —
// Filter, Auswahl und Scrollposition stehen unverändert da.
describe('viewerReducer · Ansichtswechsel lässt Filter und Auswahl in Ruhe', () => {
  it('trägt Suche, Facette, Auswahl und Scrollposition durch drei Wechsel', () => {
    let state = loadedState();
    state = viewerReducer(state, { type: 'search', value: 'beton' });
    state = viewerReducer(state, {
      type: 'setFacet',
      facetId: 'einheit',
      values: new Set(['m3']),
    });
    state = viewerReducer(state, {
      type: 'selectPosition',
      nodeId: 'section:001.001',
      positionId: 'position:001.001.0010',
    });
    state = viewerReducer(state, { type: 'setViewMode', mode: 'table' });
    state = viewerReducer(state, { type: 'viewScroll', view: 'table', top: 640 });
    state = viewerReducer(state, { type: 'tableSort', key: 'quantity' });

    const before = state;
    const roundTrip = ['overview', 'table'] as const;
    for (const mode of roundTrip) state = viewerReducer(state, { type: 'setViewMode', mode });

    expect(state.filter).toBe(before.filter);
    expect(state.selection).toBe(before.selection);
    expect(state.view.scroll.table).toBe(640);
    expect(state.view.table.sort).toEqual({ key: 'quantity', dir: 1 });
    expect(state.view.mode).toBe('graph');
    expect(state.view.workspace.closed.table).toBe(false);
  });

  it('merkt sich den Graph-Ausschnitt und gibt ihn beim Rückwechsel wieder her', () => {
    let state = loadedState();
    state = viewerReducer(state, { type: 'setViewMode', mode: 'graph' });
    state = viewerReducer(state, {
      type: 'graphViewport',
      viewport: { tx: 120, ty: -40, k: 1.8 },
    });
    state = viewerReducer(state, { type: 'setViewMode', mode: 'table' });
    state = viewerReducer(state, { type: 'setViewMode', mode: 'graph' });
    expect(state.view.graph.viewport).toEqual({ tx: 120, ty: -40, k: 1.8 });
  });

  it('wirft den gemerkten Ausschnitt mit einem neuen Import weg', () => {
    let state = loadedState();
    state = viewerReducer(state, { type: 'graphViewport', viewport: { tx: 1, ty: 2, k: 3 } });
    state = viewerReducer(state, { type: 'viewScroll', view: 'table', top: 500 });
    const reloaded = loadedState(state);
    expect(reloaded.view.graph.viewport).toBeNull();
    expect(reloaded.view.scroll.table).toBe(0);
    // Der Größenmodus ist dagegen eine Vorliebe und bleibt.
    expect(reloaded.view.graph.sizeMode).toBe(state.view.graph.sizeMode);
  });

  it('kehrt die Sortierrichtung erst beim zweiten Klick auf dieselbe Spalte um', () => {
    const first = viewerReducer(base, { type: 'tableSort', key: 'menge' });
    expect(first.view.table.sort).toEqual({ key: 'menge', dir: 1 });
    const second = viewerReducer(first, { type: 'tableSort', key: 'menge' });
    expect(second.view.table.sort).toEqual({ key: 'menge', dir: -1 });
    const other = viewerReducer(second, { type: 'tableSort', key: 'oz' });
    expect(other.view.table.sort).toEqual({ key: 'oz', dir: 1 });
  });
});

describe('viewerReducer · Gliederung des Graphen', () => {
  it('beginnt „nach LV", mit Hinweisen und Größe nach Menge', () => {
    const state = loadedState();
    expect(state.view.graph.layout).toBe('lv');
    expect(state.view.graph.showHints).toBe(true);
    expect(state.view.graph.sizeMode).toBe('quantity');
  });

  it('macht in „Matrix" einen neuen Filter von selbst zur Spalte', () => {
    const frei = viewerReducer(loadedState(), { type: 'graphLayout', value: 'matrix' });
    const next = viewerReducer(frei, {
      type: 'setFacet',
      facetId: 'beton',
      values: new Set(['Wand']),
    });
    expect(next.view.graph.cols).toBe('beton');
    // Eine gesetzte Spalte überschreibt der nächste Filter nicht.
    const second = viewerReducer(next, {
      type: 'setFacet',
      facetId: 'positionsart',
      values: new Set(['bauteil']),
    });
    expect(second.view.graph.cols).toBe('beton');
  });

  it('lässt „nach LV" beim Filtern unangetastet', () => {
    const state = loadedState();
    const next = viewerReducer(state, {
      type: 'setFacet',
      facetId: 'beton',
      values: new Set(['Wand']),
    });
    expect(next.view).toBe(state.view);
  });

  it('nimmt die Spalte weg, wenn die Zeilen dasselbe Merkmal bekommen', () => {
    const frei = viewerReducer(loadedState(), { type: 'graphCols', value: 'beton' });
    const next = viewerReducer(frei, { type: 'graphRows', value: 'beton' });
    expect(next.view.graph.rows).toBe('beton');
    expect(next.view.graph.cols).toBeNull();
  });

  it('lässt Abschnitt nicht als Spalte zu — lange Titel überlappen nebeneinander', () => {
    const state = loadedState();
    const next = viewerReducer(state, { type: 'graphCols', value: SECTION_AXIS });
    expect(next.view.graph.cols).toBe(state.view.graph.cols);
  });

  it('behält Gliederung und Hinweis-Schalter über einen neuen Import', () => {
    let state = viewerReducer(loadedState(), { type: 'graphLayout', value: 'matrix' });
    state = viewerReducer(state, { type: 'graphHints', value: false });
    const reloaded = loadedState(state);
    expect(reloaded.view.graph.layout).toBe('matrix');
    expect(reloaded.view.graph.showHints).toBe(false);
  });
});

describe('viewerReducer · Prüfregeln', () => {
  it('schaltet eine Regel stumm und wieder an — unabhängig von der Ansicht', () => {
    const muted = viewerReducer(base, { type: 'toggleRule', id: 'V1' });
    expect(muted.filter.mutedRules.has('V1')).toBe(true);
    const switched = viewerReducer(muted, { type: 'setViewMode', mode: 'graph' });
    expect(switched.filter.mutedRules.has('V1')).toBe(true);
    expect(viewerReducer(switched, { type: 'toggleRule', id: 'V1' }).filter.mutedRules.size).toBe(
      0,
    );
  });

  it('merkt sich getrennt davon, welche Fundliste aufgeklappt ist', () => {
    const open = viewerReducer(base, { type: 'toggleRuleOpen', id: 'V1' });
    expect(open.view.overview.openRules.has('V1')).toBe(true);
    expect(open.filter.mutedRules.size).toBe(0);
  });
});

describe('Hinweise (Issues #94, #95)', () => {
  it('beginnt ohne Hinweis', () => {
    expect(base.notices).toEqual([]);
  });

  it('sammelt Hinweise, ohne denselben Text doppelt zu zeigen', () => {
    let state = viewerReducer(base, { type: 'notice', message: 'Eins' });
    state = viewerReducer(state, { type: 'notice', message: 'Zwei' });
    state = viewerReducer(state, { type: 'notice', message: 'Eins' });
    expect(state.notices).toEqual(['Eins', 'Zwei']);
  });

  it('schließt alle Hinweise auf einmal', () => {
    const state = viewerReducer(viewerReducer(base, { type: 'notice', message: 'Eins' }), {
      type: 'dismissNotices',
    });
    expect(state.notices).toEqual([]);
  });

  it('bringt die Hinweise des Ladevorgangs mit dem neuen LV an', () => {
    const state = viewerReducer(base, {
      type: 'loaded',
      lv: classifyAndBuild(DRAFT, 'test.x83'),
      notices: ['Nur eine Datei'],
    });
    expect(state.notices).toEqual(['Nur eine Datei']);
  });

  it('verwirft alte Hinweise bei einem neuen Import und beim Schließen', () => {
    const mitHinweis = viewerReducer(loadedState(), { type: 'notice', message: 'Alt' });
    expect(viewerReducer(mitHinweis, { type: 'loading' }).notices).toEqual([]);
    expect(viewerReducer(mitHinweis, { type: 'clear' }).notices).toEqual([]);
    const neu = viewerReducer(mitHinweis, {
      type: 'loaded',
      lv: classifyAndBuild(DRAFT, 'neu.x83'),
    });
    expect(neu.notices).toEqual([]);
  });

  it('lässt Filter, Auswahl und Ansicht unberührt', () => {
    const vorher = loadedState();
    const nachher = viewerReducer(vorher, { type: 'notice', message: 'Hinweis' });
    expect(nachher.filter).toBe(vorher.filter);
    expect(nachher.selection).toBe(vorher.selection);
    expect(nachher.view).toBe(vorher.view);
  });
});

describe('viewerReducer · Vergleich (Entscheidung 0037)', () => {
  const add = (state: ViewerState, positionId: string): ViewerState =>
    viewerReducer(state, { type: 'toggleCompare', positionId });

  it('nimmt eine Position dazu und holt dabei das Fenster', () => {
    const next = add(base, 'a');
    expect(next.selection.compare).toEqual(['a']);
    expect(next.view.compareWindow.open).toBe(true);
  });

  it('nimmt sie mit demselben Schritt wieder heraus, ohne das Fenster zu schließen', () => {
    const next = add(add(add(base, 'a'), 'b'), 'a');
    expect(next.selection.compare).toEqual(['b']);
    expect(next.view.compareWindow.open).toBe(true);
  });

  it(`hört bei ${MAX_COMPARE} Positionen auf`, () => {
    let state = base;
    for (const id of ['a', 'b', 'c', 'd']) state = add(state, id);
    expect(add(state, 'e')).toBe(state);
  });

  it('holt ein geschlossenes Fenster nicht beim Herausnehmen zurück', () => {
    const closed = viewerReducer(add(add(base, 'a'), 'b'), {
      type: 'compareWindow',
      open: false,
    });
    expect(add(closed, 'a').view.compareWindow.open).toBe(false);
  });

  it('leert den Vergleich und schließt das Fenster', () => {
    const next = viewerReducer(add(base, 'a'), { type: 'clearCompare' });
    expect(next.selection.compare).toEqual([]);
    expect(next.view.compareWindow.open).toBe(false);
  });

  it('fasst Filter und Auswahl der Karte nicht an', () => {
    const searched = viewerReducer(base, { type: 'search', value: 'Beton' });
    const next = add(searched, 'a');
    expect(next.filter).toBe(searched.filter);
    expect(next.selection.positionId).toBe(searched.selection.positionId);
  });
});

describe('viewerReducer · Tour', () => {
  it('Start und Ende zählen als gesehen; ein neues LV beendet die Tour, bietet sie aber nicht neu an', () => {
    const started = viewerReducer(loadedState(), { type: 'tour', step: 0 });
    expect(started.view.tour).toEqual({ step: 0, seen: true });
    const reloaded = loadedState(started);
    expect(reloaded.view.tour).toEqual({ step: null, seen: true });
  });

  it('Ablehnen ohne Start merkt sich das Angebot', () => {
    const declined = viewerReducer(loadedState(), { type: 'tour', step: null });
    expect(declined.view.tour).toEqual({ step: null, seen: true });
    expect(viewerReducer(declined, { type: 'tour', step: null })).toBe(declined);
  });

  it('lässt Filter und Auswahl in Ruhe', () => {
    const state = loadedState();
    const next = viewerReducer(state, { type: 'tour', step: 3 });
    expect(next.filter).toBe(state.filter);
    expect(next.selection).toBe(state.selection);
  });
});

describe('viewerReducer · Abschnitte der Tabelle zuklappen', () => {
  it('klappt einzeln auf und zu, `tableCollapse` mit [] klappt alles auf', () => {
    let state = viewerReducer(base, { type: 'tableToggleSection', id: 'a' });
    state = viewerReducer(state, { type: 'tableToggleSection', id: 'b' });
    expect([...state.view.table.collapsed].sort()).toEqual(['a', 'b']);
    state = viewerReducer(state, { type: 'tableToggleSection', id: 'a' });
    expect([...state.view.table.collapsed]).toEqual(['b']);
    state = viewerReducer(state, { type: 'tableCollapse', ids: ['x', 'y'] });
    expect([...state.view.table.collapsed].sort()).toEqual(['x', 'y']);
    state = viewerReducer(state, { type: 'tableCollapse', ids: [] });
    expect(state.view.table.collapsed.size).toBe(0);
  });

  it('vergisst zugeklappte Abschnitte bei einem neuen LV', () => {
    const state = viewerReducer(base, { type: 'tableCollapse', ids: ['a'] });
    expect(loadedState(state).view.table.collapsed.size).toBe(0);
  });
});
