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
  it('beginnt im Überblick — er ordnet das LV ein, bevor man tiefer geht', () => {
    expect(loadedState().view.mode).toBe('overview');
  });

  it('wählt einen Knoten an, ohne den Ansichtsmodus zu wechseln', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001' });
    expect(next.selection.nodeId).toBe('section:001');
    expect(next.view.mode).toBe(base.view.mode);
  });

  it('wechselt nur mit `openInTable` in die Tabelle', () => {
    const next = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    expect(next.view.mode).toBe('table');
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
    const next = viewerReducer(base, { type: 'setViewMode', mode: 'table' });
    expect(next.view.mode).toBe('table');
    expect(viewerReducer(next, { type: 'setViewMode', mode: 'graph' }).view.mode).toBe('graph');
  });

  it('behält den Ansichtsmodus beim Abwählen des Knotens', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    expect(viewerReducer(table, { type: 'selectNode', id: null }).view.mode).toBe('table');
  });

  it('nimmt mit `back` nur die Auswahl zurück, nicht den Ansichtsmodus', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    const back = viewerReducer(table, { type: 'back' });
    expect(back.view.mode).toBe('table');
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
    const roundTrip = ['graph', 'check', 'overview', 'table'] as const;
    for (const mode of roundTrip) state = viewerReducer(state, { type: 'setViewMode', mode });

    expect(state.filter).toBe(before.filter);
    expect(state.selection).toBe(before.selection);
    expect(state.view.scroll.table).toBe(640);
    expect(state.view.table.sort).toEqual({ key: 'quantity', dir: 1 });
    expect(state.view.mode).toBe('table');
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
describe('viewerReducer · ohne geladenes LV', () => {
  it('lässt `expandAll` und `collapseAll` wirkungslos', () => {
    expect(viewerReducer(base, { type: 'expandAll' })).toBe(base);
    expect(viewerReducer(base, { type: 'collapseAll' })).toBe(base);
    expect(buildTree(DRAFT).children.length).toBe(1);
  });
});
