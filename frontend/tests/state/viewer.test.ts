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
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { SIDE_WIDTH_MAX, SIDE_WIDTH_MIN } from '../../src/state/viewState';
import {
  INITIAL_VIEWER_STATE,
  MAX_COMPARE,
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  viewerReducer,
  type ViewerState,
} from '../../src/state/viewer';
import type { LVDraft } from '../../src/types/lvDraft';

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
  it('hält die Breite des Seitenfensters in ihren Grenzen und über ein neues LV', () => {
    const wide = viewerReducer(base, { type: 'sideWidth', width: 5000 });
    expect(wide.view.sideWidth).toBe(SIDE_WIDTH_MAX);
    const narrow = viewerReducer(base, { type: 'sideWidth', width: 10 });
    expect(narrow.view.sideWidth).toBe(SIDE_WIDTH_MIN);
    const set = viewerReducer(base, { type: 'sideWidth', width: 420 });
    expect(viewerReducer(set, { type: 'sideWidth', width: 420 })).toBe(set);
    expect(loadedState(set).view.sideWidth).toBe(420);
  });

  it('beginnt im Graphen, ohne offenes Seitenfenster oder Fenster', () => {
    const state = loadedState();
    expect(state.view.mode).toBe('graph');
    expect(state.view.side).toBeNull();
    expect(state.view.tableWindow.open).toBe(false);
  });

  it('öffnet Überblick und Prüfung als Reiter im Seitenfenster über dem Graphen', () => {
    const overview = viewerReducer(base, { type: 'setViewMode', mode: 'overview' });
    expect(overview.view.mode).toBe('graph');
    expect(overview.view.side).toBe('overview');
    const check = viewerReducer(overview, { type: 'sidePanel', panel: 'check' });
    expect(check.view.side).toBe('check');
    expect(viewerReducer(check, { type: 'sidePanel', panel: null }).view.side).toBeNull();
  });

  it('öffnet die Tabelle als Fenster über dem Graphen', () => {
    const table = viewerReducer(base, { type: 'setViewMode', mode: 'table' });
    expect(table.view.mode).toBe('graph');
    expect(table.view.tableWindow.open).toBe(true);
  });

  it('lässt den Zustand stehen, wenn das Tabellenfenster nicht wirklich wandert', () => {
    const moved = viewerReducer(base, { type: 'tableWindowPos', pos: { right: 40, top: 200 } });
    expect(moved.view.tableWindow.pos).toEqual({ right: 40, top: 200 });
    expect(viewerReducer(moved, { type: 'tableWindowPos', pos: { right: 40, top: 200 } })).toBe(
      moved,
    );
  });

  it('begrenzt die Größe des Tabellenfensters nach unten', () => {
    const next = viewerReducer(base, {
      type: 'tableWindowSize',
      size: { width: 10, height: 10 },
    });
    expect(next.view.tableWindow.size.width).toBeGreaterThanOrEqual(420);
    expect(next.view.tableWindow.size.height).toBeGreaterThanOrEqual(200);
  });

  it('wählt einen Knoten an, ohne den Ansichtsmodus zu wechseln', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001' });
    expect(next.selection.nodeId).toBe('section:001');
    expect(next.view.mode).toBe(base.view.mode);
  });

  it('öffnet mit `openInTable` das Tabellenfenster und wählt den Knoten an', () => {
    const next = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    expect(next.view.tableWindow.open).toBe(true);
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
    expect(state.view.tableWindow.open).toBe(true);
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
      facetId: 'gewerk',
      values: new Set(['Betonarbeiten']),
    });
    expect(next.view.graph.cols).toBe('gewerk');
    // Eine gesetzte Spalte überschreibt der nächste Filter nicht.
    const second = viewerReducer(next, {
      type: 'setFacet',
      facetId: 'positionsart',
      values: new Set(['bauteil']),
    });
    expect(second.view.graph.cols).toBe('gewerk');
  });

  it('lässt „nach LV" beim Filtern unangetastet', () => {
    const state = loadedState();
    const next = viewerReducer(state, {
      type: 'setFacet',
      facetId: 'gewerk',
      values: new Set(['Betonarbeiten']),
    });
    expect(next.view).toBe(state.view);
  });

  it('nimmt die Spalte weg, wenn die Zeilen dasselbe Merkmal bekommen', () => {
    const frei = viewerReducer(loadedState(), { type: 'graphCols', value: 'gewerk' });
    const next = viewerReducer(frei, { type: 'graphRows', value: 'gewerk' });
    expect(next.view.graph.rows).toBe('gewerk');
    expect(next.view.graph.cols).toBeNull();
  });

  it('behält Gliederung und Hinweis-Schalter über einen neuen Import', () => {
    let state = viewerReducer(loadedState(), { type: 'graphLayout', value: 'matrix' });
    state = viewerReducer(state, { type: 'graphHints', value: false });
    const reloaded = loadedState(state);
    expect(reloaded.view.graph.layout).toBe('matrix');
    expect(reloaded.view.graph.showHints).toBe(false);
  });
});

// Die Größe der Info-Panels ist eine Layout-Vorliebe, kein Fachdatum: sie gilt
// für alle Panels, überlebt Ansichtswechsel und einen neuen Import — und mit
// dem Reload verschwindet sie, wie jeder Sitzungszustand.
describe('viewerReducer · Größe und Ort der Info-Panels', () => {
  it('hält die Breite in den gemeinsamen Grenzen', () => {
    const zuBreit = viewerReducer(base, {
      type: 'panelSize',
      size: { width: 2000, height: null },
    });
    expect(zuBreit.view.panelSize.width).toBe(PANEL_MAX_WIDTH);

    const zuSchmal = viewerReducer(base, { type: 'panelSize', size: { width: 10, height: 10 } });
    expect(zuSchmal.view.panelSize.width).toBe(PANEL_MIN_WIDTH);
    expect(zuSchmal.view.panelSize.height).toBe(PANEL_MIN_HEIGHT);
  });

  it('überlebt einen neuen Import und das Leeren', () => {
    const groesse = viewerReducer(base, { type: 'panelSize', size: { width: 500, height: 400 } });
    const breit = viewerReducer(groesse, { type: 'cardPos', pos: { right: 200, top: 120 } });

    const geladen = loadedState(breit);
    expect(geladen.view.panelSize).toEqual({ width: 500, height: 400 });
    expect(geladen.view.cardPos).toEqual({ right: 200, top: 120 });

    const geleert = viewerReducer(geladen, { type: 'clear' });
    expect(geleert.view.panelSize).toEqual({ width: 500, height: 400 });
    expect(geleert.view.cardPos).toEqual({ right: 200, top: 120 });
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
