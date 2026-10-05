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
import { buildTree } from '../../src/lib/tree/buildTree';
import {
  COMPARE_MAX_WIDTH,
  COMPARE_MIN_HEIGHT,
  COMPARE_MIN_WIDTH,
  DEFAULT_COMPARE_SIZE,
  INITIAL_VIEWER_STATE,
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

describe('viewerReducer · expandAll', () => {
  it('öffnet auch Sammel-Bubbles, damit wirklich alles sichtbar ist (Issue #41)', () => {
    const many: LVDraft = {
      ...DRAFT,
      lots: [
        {
          number: '001',
          label: 'Los 1',
          sections: [
            {
              number: '001.001',
              label: 'Viele',
              // Mehr als CLUSTER_AT (40) Unterabschnitte. Positionen taugen
              // dafür nicht mehr: sie werden nie geclustert, sondern liegen als
              // Wolke um ihren Abschnitt (WP-41-5, Issue #46).
              sections: Array.from({ length: 45 }, (_, index) => ({
                number: `001.001.${String(index + 1).padStart(3, '0')}`,
                label: `Unter ${index + 1}`,
                sections: [],
                positions: [
                  {
                    ...DRAFT.lots[0].sections[0].positions[0],
                    oz: `001.001.${String(index + 1).padStart(3, '0')}.0010`,
                  },
                ],
              })),
              positions: [],
            },
          ],
        },
      ],
    };
    const state = viewerReducer(base, {
      type: 'loaded',
      lv: classifyAndBuild(many, 'viele.x83'),
    });
    const next = viewerReducer(state, { type: 'expandAll' });
    expect(next.selection.openClusters.has('section:001.001')).toBe(true);
    // „Alles zuklappen" nimmt sie wieder zurück.
    expect(viewerReducer(next, { type: 'collapseAll' }).selection.openClusters.size).toBe(0);
  });
});

describe('viewerReducer · Ansichtsmodus', () => {
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
    const check = viewerReducer(overview, { type: 'setViewMode', mode: 'check' });
    expect(check.view.side).toBe('check');
    expect(viewerReducer(check, { type: 'sidePanel', panel: null }).view.side).toBeNull();
  });

  it('öffnet Tabelle und Vergleich als Fenster über dem Graphen', () => {
    const table = viewerReducer(base, { type: 'setViewMode', mode: 'table' });
    expect(table.view.mode).toBe('graph');
    expect(table.view.tableWindow.open).toBe(true);
    const compare = viewerReducer(table, { type: 'setViewMode', mode: 'compare' });
    expect(compare.view.mode).toBe('graph');
    expect(compare.view.compare.windowOpen).toBe(true);
    // Matrix bleibt eine eigene Fläche.
    expect(viewerReducer(compare, { type: 'setViewMode', mode: 'matrix' }).view.mode).toBe(
      'matrix',
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

  it('wechselt den Ansichtsmodus gezielt mit `setViewMode`', () => {
    const next = viewerReducer(base, { type: 'setViewMode', mode: 'similar' });
    expect(next.view.mode).toBe('similar');
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
    const roundTrip = ['matrix', 'check', 'overview', 'similar', 'table'] as const;
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

describe('viewerReducer · Aufklapp-Zustand', () => {
  it('öffnet nach dem Import Projekt und Lose', () => {
    const state = loadedState();
    const lot = state.lv?.tree.children[0];
    expect(state.selection.expanded.has('project')).toBe(true);
    expect(state.selection.expanded.has(lot?.id ?? '')).toBe(true);
    // Der Abschnitt darunter bleibt zu — sonst stünde sofort das ganze LV da.
    expect(state.selection.expanded.has(lot?.children[0].id ?? '')).toBe(false);
  });

  it('schaltet einen Knoten um und lässt ihn mit `open` gezielt offen', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';

    const opened = viewerReducer(state, { type: 'toggleExpanded', id: section });
    expect(opened.selection.expanded.has(section)).toBe(true);
    expect(
      viewerReducer(opened, { type: 'toggleExpanded', id: section }).selection.expanded.has(
        section,
      ),
    ).toBe(false);
    // Ein zweiter Klick auf die Baumzeile darf nicht wieder zuklappen.
    expect(
      viewerReducer(opened, {
        type: 'toggleExpanded',
        id: section,
        open: true,
      }).selection.expanded.has(section),
    ).toBe(true);
  });

  it('klappt alles auf und wieder auf die Lose zurück', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';

    const all = viewerReducer(state, { type: 'expandAll' });
    expect(all.selection.expanded.has(section)).toBe(true);

    const none = viewerReducer(all, { type: 'collapseAll' });
    expect(none.selection.expanded.has(section)).toBe(false);
    // Die Wurzel bleibt offen, sonst wäre der Baum leer.
    expect(none.selection.expanded.has('project')).toBe(true);
  });

  it('behält Aufklapp- und Cluster-Zustand auf dem Weg durch die Tabelle', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';

    const opened = viewerReducer(viewerReducer(state, { type: 'toggleExpanded', id: section }), {
      type: 'toggleCluster',
      id: section,
    });
    const table = viewerReducer(opened, { type: 'openInTable', id: section });
    const back = viewerReducer(table, { type: 'showGraph' });

    expect(back.selection.expanded).toBe(opened.selection.expanded);
    expect(back.selection.openClusters.has(section)).toBe(true);
  });

  it('setzt den Aufklapp-Zustand erst mit einem neuen Import zurück', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';
    const opened = viewerReducer(state, { type: 'toggleExpanded', id: section });

    const reloaded = loadedState();
    expect(opened.selection.expanded.has(section)).toBe(true);
    expect(reloaded.selection.expanded.has(section)).toBe(false);
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

describe('viewerReducer · Vergleichsfenster über dem Graphen', () => {
  const POS = 'position:001.001.0010';
  const POS2 = 'position:001.001.0020';

  it('hält Größe und Ort getrennt von den Info-Panels', () => {
    // Zwei Flächen, zwei Maße: das Fenster zeigt mehrere Spalten und ist
    // deshalb breiter als jedes Info-Panel. Eine gemeinsame Zahl hieße, dass
    // das Aufziehen des einen das andere verstellt.
    const state = viewerReducer(base, {
      type: 'compareWindowSize',
      size: { width: 800, height: 500 },
    });
    expect(state.view.compare.windowSize).toEqual({ width: 800, height: 500 });
    expect(state.view.panelSize).toEqual(base.view.panelSize);

    const verschoben = viewerReducer(state, {
      type: 'compareWindowPos',
      pos: { right: 220, top: 90 },
    });
    expect(verschoben.view.compare.windowPos).toEqual({ right: 220, top: 90 });
    expect(verschoben.view.cardPos).toEqual(base.view.cardPos);
  });

  it('hält Breite und Höhe in den eigenen Grenzen', () => {
    const zuGross = viewerReducer(base, {
      type: 'compareWindowSize',
      size: { width: 5000, height: 4000 },
    });
    expect(zuGross.view.compare.windowSize.width).toBe(COMPARE_MAX_WIDTH);

    const zuKlein = viewerReducer(base, {
      type: 'compareWindowSize',
      size: { width: 10, height: 10 },
    });
    expect(zuKlein.view.compare.windowSize.width).toBe(COMPARE_MIN_WIDTH);
    expect(zuKlein.view.compare.windowSize.height).toBe(COMPARE_MIN_HEIGHT);
  });

  it('geht erst mit der zweiten Position auf', () => {
    // Eine Spalte allein ist noch kein Vergleich — das Fenster wartet.
    const eine = viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS });
    expect(eine.view.compare.windowOpen).toBe(false);
    const zwei = viewerReducer(eine, { type: 'toggleCompare', positionId: POS2 });
    expect(zwei.view.compare.windowOpen).toBe(true);
  });

  it('bleibt beim Herausnehmen offen, bis der Vergleich leer ist', () => {
    // Wer im Fenster aussortiert, will das Fenster behalten (Owner in PR #86).
    const zwei = viewerReducer(
      viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS }),
      { type: 'toggleCompare', positionId: POS2 },
    );
    const eine = viewerReducer(zwei, { type: 'toggleCompare', positionId: POS2 });
    expect(eine.selection.compare).toEqual([POS]);
    expect(eine.view.compare.windowOpen).toBe(true);

    const keine = viewerReducer(eine, { type: 'toggleCompare', positionId: POS });
    expect(keine.view.compare.windowOpen).toBe(false);
  });

  it('bleibt zu, wenn eine Position nur herausgenommen wird', () => {
    // Das ✕ am Fenster ist eine Entscheidung. Herausnehmen ist kein neuer
    // Vergleich — käme das Fenster dabei zurück, machte es die Entscheidung
    // rückgängig, ohne dass etwas dazugekommen wäre.
    const zwei = viewerReducer(
      viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS }),
      { type: 'toggleCompare', positionId: POS2 },
    );
    const zu = viewerReducer(zwei, { type: 'compareWindow', open: false });

    const weniger = viewerReducer(zu, { type: 'toggleCompare', positionId: POS2 });
    expect(weniger.selection.compare).toEqual([POS]);
    expect(weniger.view.compare.windowOpen).toBe(false);

    // Dazunehmen holt es weiter zurück.
    const wieder = viewerReducer(weniger, { type: 'toggleCompare', positionId: POS2 });
    expect(wieder.view.compare.windowOpen).toBe(true);
  });

  it('lässt es beim Leeren des Vergleichs zu, wie es war', () => {
    // „Auswahl leeren" ist keine Bitte, ein weggeklicktes Fenster zu öffnen —
    // es hätte ohnehin nichts zu zeigen.
    const mitAuswahl = viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS });
    const zu = viewerReducer(mitAuswahl, { type: 'compareWindow', open: false });
    const geleert = viewerReducer(zu, { type: 'clearCompare' });
    expect(geleert.view.compare.windowOpen).toBe(false);
    expect(geleert.selection.compare).toHaveLength(0);
  });

  it('behält Ort und Größe über einen neuen Import, aber nicht den offenen Stand', () => {
    const gezogen = viewerReducer(base, {
      type: 'compareWindowSize',
      size: { width: 700, height: 420 },
    });
    const verschoben = viewerReducer(gezogen, {
      type: 'compareWindowPos',
      pos: { right: 200, top: 48 },
    });
    const zu = viewerReducer(verschoben, { type: 'compareWindow', open: false });

    const geladen = loadedState(zu);
    expect(geladen.view.compare.windowSize).toEqual({ width: 700, height: 420 });
    expect(geladen.view.compare.windowPos).toEqual({ right: 200, top: 48 });
    // Die neue Datei fängt ohne Vergleich an — das Fenster kommt wie immer mit
    // der zweiten Position.
    expect(geladen.view.compare.windowOpen).toBe(false);
  });

  it('lässt „nur Unterschiede" und die Fenstermaße nebeneinander stehen', () => {
    // Beides steckt im selben Ast des Zustands — ohne Zusammenführen hätte die
    // eine Aktion die andere überschrieben.
    const mitMass = viewerReducer(base, {
      type: 'compareWindowSize',
      size: { width: 640, height: 300 },
    });
    const mitSchalter = viewerReducer(mitMass, { type: 'compareOnlyDiffs', value: true });
    expect(mitSchalter.view.compare.onlyDiffs).toBe(true);
    expect(mitSchalter.view.compare.windowSize).toEqual({ width: 640, height: 300 });
    expect(mitSchalter.view.compare.windowSize).not.toEqual(DEFAULT_COMPARE_SIZE);
  });
});

describe('viewerReducer · Strg-Klick nach normalem Klick (PR #86)', () => {
  const POS = 'position:001.001.0010';
  const POS2 = 'position:001.001.0020';
  const POS3 = 'position:001.001.0030';
  const angewaehlt = (): ViewerState =>
    viewerReducer(loadedState(), { type: 'selectPosition', nodeId: null, positionId: POS });

  it('nimmt die angewählte Position mit in einen leeren Vergleich', () => {
    // Klick auf A, Strg-Klick auf B: das sind zwei Positionen, nicht eine.
    const state = viewerReducer(angewaehlt(), { type: 'toggleCompare', positionId: POS2 });
    expect(state.selection.compare).toEqual([POS, POS2]);
    expect(state.view.compare.windowOpen).toBe(true);
  });

  it('nimmt die angewählte Position nicht doppelt auf', () => {
    const state = viewerReducer(angewaehlt(), { type: 'toggleCompare', positionId: POS });
    expect(state.selection.compare).toEqual([POS]);
  });

  it('fasst einen bestehenden Vergleich nicht an', () => {
    // Steht schon ein Vergleich, wurde er bewusst zusammengestellt — die
    // Auswahl schiebt sich dann nicht ungefragt hinein.
    const mitVergleich = viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS2 });
    const angewaehltDanach = viewerReducer(mitVergleich, {
      type: 'selectPosition',
      nodeId: null,
      positionId: POS,
    });
    const state = viewerReducer(angewaehltDanach, { type: 'toggleCompare', positionId: POS3 });
    expect(state.selection.compare).toEqual([POS2, POS3]);
  });

  it('nimmt ohne Auswahl nur die geklickte Position', () => {
    const state = viewerReducer(loadedState(), { type: 'toggleCompare', positionId: POS2 });
    expect(state.selection.compare).toEqual([POS2]);
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
    expect(open.view.check.openRules.has('V1')).toBe(true);
    expect(open.filter.mutedRules.size).toBe(0);
  });
});

// Der Baum wird für die Aktionen gebraucht, die alles auf- oder zuklappen —
// ohne geladenes LV dürfen sie nichts tun statt zu stolpern.
describe('viewerReducer · Ähnlichkeit', () => {
  it('merkt sich Regler, Sortierung und aufgeklappte Gruppen über den Wechsel', () => {
    let state = viewerReducer(loadedState(), { type: 'setViewMode', mode: 'similar' });
    state = viewerReducer(state, { type: 'clusterMinMembers', value: 5 });
    state = viewerReducer(state, { type: 'clusterSort', value: 'streuung' });
    state = viewerReducer(state, {
      type: 'toggleClusterOpen',
      id: 'cluster:position:001.001.0010',
    });

    const zurueck = viewerReducer(viewerReducer(state, { type: 'setViewMode', mode: 'table' }), {
      type: 'setViewMode',
      mode: 'similar',
    });
    expect(zurueck.view.similar.minMembers).toBe(5);
    expect(zurueck.view.similar.sort).toBe('streuung');
    expect(zurueck.view.similar.openClusters.has('cluster:position:001.001.0010')).toBe(true);
  });

  it('behält Regler und Sortierung beim Import, wirft aber die Gruppen weg', () => {
    let state = viewerReducer(loadedState(), { type: 'clusterMinMembers', value: 3 });
    state = viewerReducer(state, { type: 'toggleClusterOpen', id: 'cluster:alt' });
    const neu = loadedState(state);
    expect(neu.view.similar.minMembers).toBe(3);
    expect(neu.view.similar.openClusters.size).toBe(0);
  });
});

describe('viewerReducer · ohne geladenes LV', () => {
  it('lässt `expandAll` und `collapseAll` wirkungslos', () => {
    expect(viewerReducer(base, { type: 'expandAll' })).toBe(base);
    expect(viewerReducer(base, { type: 'collapseAll' })).toBe(base);
    expect(buildTree(DRAFT).children.length).toBe(1);
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
