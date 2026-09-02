// `centerMode` ist eigener Zustand: eine Sammel-Bubble lässt sich anwählen,
// ohne dass der Graph gegen die Tabelle getauscht wird (Issue #10).
// Der Aufklapp-Zustand liegt ebenfalls hier — Baum und Graph teilen ihn
// (Issue #18) und er überlebt den Abstecher in die Tabelle (Issue #19).

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

describe('viewerReducer · centerMode', () => {
  it('wählt einen Knoten an, ohne die Mitte umzuschalten', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001' });
    expect(next.selectedNodeId).toBe('section:001');
    expect(next.centerMode).toBe('graph');
  });

  it('schaltet nur mit `open` in die Tabelle', () => {
    const next = viewerReducer(base, { type: 'selectNode', id: 'section:001', open: true });
    expect(next.centerMode).toBe('table');
  });

  it('führt eine angewählte Position in die Tabelle', () => {
    const next = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    expect(next.centerMode).toBe('table');
    expect(next.selectedPositionId).toBe('position:001.0010');
  });

  it('kehrt beim Abwählen des Knotens in den Graphen zurück', () => {
    const table = viewerReducer(base, { type: 'selectNode', id: 'section:001', open: true });
    expect(viewerReducer(table, { type: 'selectNode', id: null }).centerMode).toBe('graph');
  });

  it('geht mit `back` von der Tabelle in den Graphen, ohne die Auswahl zu verlieren', () => {
    const table = viewerReducer(base, { type: 'selectNode', id: 'section:001', open: true });
    const back = viewerReducer(table, { type: 'back' });
    expect(back.centerMode).toBe('graph');
    expect(back.selectedNodeId).toBe('section:001');
    // Ein zweites Mal hebt dann die Auswahl auf.
    expect(viewerReducer(back, { type: 'back' }).selectedNodeId).toBeNull();
  });

  it('kehrt mit `showGraph` in einem Schritt zum Graphen zurück', () => {
    const deep = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001.004',
      positionId: 'position:001.004.0010',
    });
    const graph = viewerReducer(deep, { type: 'showGraph' });
    expect(graph.centerMode).toBe('graph');
    // Die Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
    expect(graph.selectedNodeId).toBe('section:001.004');
    expect(graph.selectedPositionId).toBe('position:001.004.0010');
  });

  it('löst mit `back` zuerst die Position, dann die Ansicht', () => {
    const picked = viewerReducer(base, {
      type: 'selectPosition',
      nodeId: 'section:001',
      positionId: 'position:001.0010',
    });
    const first = viewerReducer(picked, { type: 'back' });
    expect(first.selectedPositionId).toBeNull();
    expect(first.centerMode).toBe('table');
    expect(viewerReducer(first, { type: 'back' }).centerMode).toBe('graph');
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
    const table = viewerReducer(opened, { type: 'selectNode', id: section, open: true });
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
