// `centerMode` ist eigener Zustand: eine Sammel-Bubble lässt sich anwählen,
// ohne dass der Graph gegen die Tabelle getauscht wird (Issue #10).

import { describe, expect, it } from 'vitest';
import { INITIAL_VIEWER_STATE, viewerReducer, type ViewerState } from '../../src/state/viewer';

const base: ViewerState = { ...INITIAL_VIEWER_STATE };

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
