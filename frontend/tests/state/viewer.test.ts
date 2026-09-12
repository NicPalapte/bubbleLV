// `viewMode` ist eigener, bewusst gesetzter Zustand (Issue #30): eine
// Sammel-Bubble oder Position lässt sich anwählen, ohne dass der Ansichts-
// modus wechselt (Issue #10) — nur `openInTable`/`showGraph`/`setViewMode`
// tun das gezielt. Der Aufklapp-Zustand liegt ebenfalls hier — Baum und
// Graph teilen ihn (Issue #18) und er überlebt den Wechsel des Ansichtsmodus
// (Issue #19).

import { describe, expect, it } from 'vitest';
import { buildTree } from '../../src/lib/tree/buildTree';
import { INITIAL_VIEWER_STATE, viewerReducer, type ViewerState } from '../../src/state/viewer';
import type { LoadedLV } from '../../src/lib/pipeline/runPipeline';
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

function loadedState(): ViewerState {
  const tree = buildTree(DRAFT);
  const lv: LoadedLV = {
    fileName: 'test.x83',
    projectName: DRAFT.projectName,
    client: null,
    tree,
  };
  return viewerReducer(base, { type: 'loaded', lv });
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
    const tree = buildTree(many);
    const state = viewerReducer(base, {
      type: 'loaded',
      lv: { fileName: 't.x83', projectName: null, client: null, tree },
    });
    const next = viewerReducer(state, { type: 'expandAll' });
    expect(next.openClusters.has('section:001.001')).toBe(true);
    // „Alles zuklappen" nimmt sie wieder zurück.
    expect(viewerReducer(next, { type: 'collapseAll' }).openClusters.size).toBe(0);
  });
});

describe('viewerReducer · viewMode', () => {
  it('wählt einen Knoten an, ohne den Ansichtsmodus zu wechseln', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001' });
    expect(next.selectedNodeId).toBe('section:001');
    expect(next.viewMode).toBe('graph');
  });

  it('wechselt nur mit `openInTable` in die Tabelle', () => {
    const next = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    expect(next.viewMode).toBe('table');
    expect(next.selectedNodeId).toBe('section:001');
  });

  it('wählt eine Position an, ohne den Ansichtsmodus zu wechseln', () => {
    const next = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    expect(next.viewMode).toBe('graph');
    expect(next.selectedPositionId).toBe('position:001.0010');
  });

  it('wechselt den Ansichtsmodus gezielt mit `setViewMode`', () => {
    const next = viewerReducer(base, { type: 'setViewMode', mode: 'table' });
    expect(next.viewMode).toBe('table');
    expect(viewerReducer(next, { type: 'setViewMode', mode: 'graph' }).viewMode).toBe('graph');
  });

  it('behält den Ansichtsmodus beim Abwählen des Knotens', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    expect(viewerReducer(table, { type: 'selectNode', id: null }).viewMode).toBe('table');
  });

  it('nimmt mit `back` nur die Auswahl zurück, nicht den Ansichtsmodus', () => {
    const table = viewerReducer(base, { type: 'openInTable', id: 'section:001' });
    const back = viewerReducer(table, { type: 'back' });
    expect(back.viewMode).toBe('table');
    expect(back.selectedNodeId).toBeNull();
    // Ohne Auswahl tut ein weiteres `back` nichts mehr.
    expect(viewerReducer(back, { type: 'back' })).toBe(back);
  });

  it('kehrt mit `showGraph` in einem Schritt zum Graphen zurück', () => {
    const deep = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001.004',
      positionId: 'position:001.004.0010',
    });
    const graph = viewerReducer(deep, { type: 'showGraph' });
    expect(graph.viewMode).toBe('graph');
    // Die Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
    expect(graph.selectedNodeId).toBe('section:001.004');
    expect(graph.selectedPositionId).toBe('position:001.004.0010');
  });

  it('löst mit `back` zuerst die Position, dann den Knoten — der Ansichtsmodus bleibt', () => {
    const picked = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    const first = viewerReducer(picked, { type: 'back' });
    expect(first.selectedPositionId).toBeNull();
    expect(first.selectedNodeId).toBe('section:001');
    expect(first.viewMode).toBe('graph');
    const second = viewerReducer(first, { type: 'back' });
    expect(second.selectedNodeId).toBeNull();
    expect(second.viewMode).toBe('graph');
  });
});

describe('viewerReducer · Aufklapp-Zustand', () => {
  it('öffnet nach dem Import Projekt und Lose', () => {
    const state = loadedState();
    const lot = state.lv?.tree.children[0];
    expect(state.expanded.has('project')).toBe(true);
    expect(state.expanded.has(lot?.id ?? '')).toBe(true);
    // Der Abschnitt darunter bleibt zu — sonst stünde sofort das ganze LV da.
    expect(state.expanded.has(lot?.children[0].id ?? '')).toBe(false);
  });

  it('schaltet einen Knoten um und lässt ihn mit `open` gezielt offen', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';

    const opened = viewerReducer(state, { type: 'toggleExpanded', id: section });
    expect(opened.expanded.has(section)).toBe(true);
    expect(
      viewerReducer(opened, { type: 'toggleExpanded', id: section }).expanded.has(section),
    ).toBe(false);
    // Ein zweiter Klick auf die Baumzeile darf nicht wieder zuklappen.
    expect(
      viewerReducer(opened, { type: 'toggleExpanded', id: section, open: true }).expanded.has(
        section,
      ),
    ).toBe(true);
  });

  it('klappt alles auf und wieder auf die Lose zurück', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';

    const all = viewerReducer(state, { type: 'expandAll' });
    expect(all.expanded.has(section)).toBe(true);

    const none = viewerReducer(all, { type: 'collapseAll' });
    expect(none.expanded.has(section)).toBe(false);
    // Die Wurzel bleibt offen, sonst wäre der Baum leer.
    expect(none.expanded.has('project')).toBe(true);
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

    expect(back.expanded).toBe(opened.expanded);
    expect(back.openClusters.has(section)).toBe(true);
  });

  it('setzt den Aufklapp-Zustand erst mit einem neuen Import zurück', () => {
    const state = loadedState();
    const section = state.lv?.tree.children[0].children[0].id ?? '';
    const opened = viewerReducer(state, { type: 'toggleExpanded', id: section });

    const reloaded = loadedState();
    expect(opened.expanded.has(section)).toBe(true);
    expect(reloaded.expanded.has(section)).toBe(false);
  });
});
