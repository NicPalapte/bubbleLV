// Provider für den Viewer-Session-State. Berechnet die abgeleiteten Sichten
// (Knoten-Index, Elternzuordnung, Positionsliste) einmal je Baumwechsel.

import { useMemo, useReducer, type ReactNode } from 'react';
import { collectPositions, indexNodes, indexParents } from '../lib/tree/buildTree';
import {
  INITIAL_VIEWER_STATE,
  ViewerDispatchContext,
  ViewerStateContext,
  viewerReducer,
  type ViewerDerived,
} from './viewer';
import type { LVNode } from '../types/lvNode';

const EMPTY_NODES: ReadonlyMap<string, LVNode> = new Map();
const EMPTY_PARENTS: ReadonlyMap<string, LVNode | null> = new Map();

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewerReducer, INITIAL_VIEWER_STATE);

  const tree = state.lv?.tree ?? null;

  const structure = useMemo(() => {
    if (tree === null) {
      return { nodes: EMPTY_NODES, parents: EMPTY_PARENTS, positionNodes: [] as LVNode[] };
    }
    return {
      nodes: indexNodes(tree),
      parents: indexParents(tree),
      positionNodes: collectPositions(tree),
    };
  }, [tree]);

  const derived = useMemo<ViewerDerived>(
    () => ({
      tree,
      nodes: structure.nodes,
      parents: structure.parents,
      positionNodes: structure.positionNodes,
      selectedNode:
        state.selectedNodeId === null ? null : (structure.nodes.get(state.selectedNodeId) ?? null),
      selectedPosition:
        state.selectedPositionId === null
          ? null
          : (structure.nodes.get(state.selectedPositionId) ?? null),
    }),
    [tree, structure, state.selectedNodeId, state.selectedPositionId],
  );

  const value = useMemo(() => ({ ...state, ...derived }), [state, derived]);

  return (
    <ViewerStateContext.Provider value={value}>
      <ViewerDispatchContext.Provider value={dispatch}>{children}</ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  );
}
