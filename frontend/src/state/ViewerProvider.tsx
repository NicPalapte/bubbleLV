// Provider für den Viewer-Session-State. Berechnet die abgeleiteten Sichten
// (Knoten-Index, Elternzuordnung, flacher Positions-Index, Trefferzahlen) an
// genau einer Stelle — Baum, Graph und Tabelle bekommen dasselbe Ergebnis
// (Issue #18).

import { useMemo, useReducer, type ReactNode } from 'react';
import {
  buildPositionIndex,
  EMPTY_POSITION_INDEX,
  type PositionIndex,
} from '../lib/index/positionIndex';
import { prepareFilters } from '../lib/matchPos';
import { measure } from '../lib/perf';
import { indexNodes, indexParents } from '../lib/tree/buildTree';
import { computeMatchCounts, type MatchIndex } from '../lib/tree/matchCounts';
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
const EMPTY_MATCHES: MatchIndex = { counts: new Map(), filtering: false };

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewerReducer, INITIAL_VIEWER_STATE);

  const tree = state.lv?.tree ?? null;

  const structure = useMemo(() => {
    if (tree === null) return { nodes: EMPTY_NODES, parents: EMPTY_PARENTS };
    return { nodes: indexNodes(tree), parents: indexParents(tree) };
  }, [tree]);

  // Der flache Positions-Index entsteht einmal je geladenem LV. Er muss hier
  // gebaut werden und nicht im Worker: er verweist auf die Baumknoten, und
  // Objektidentität überlebt den structuredClone der Worker-Grenze nicht.
  const index = useMemo<PositionIndex>(() => {
    if (tree === null) return EMPTY_POSITION_INDEX;
    return measure('Positions-Index', () => buildPositionIndex(tree));
  }, [tree]);

  const matches = useMemo<MatchIndex>(() => {
    if (tree === null) return EMPTY_MATCHES;
    const active = prepareFilters(state.filters, state.search);
    return measure('Filter', () => computeMatchCounts(tree, index, active));
  }, [tree, index, state.filters, state.search]);

  // Bei aktiver Suche/Filterung gehen die Pfade zu den Treffern automatisch auf.
  // Abgeleitet statt gespeichert: fällt der Filter weg, steht wieder genau der
  // Aufklapp-Zustand da, den der Nutzer selbst gesetzt hat.
  const openNodes = useMemo<ReadonlySet<string>>(() => {
    if (tree === null || !matches.filtering) return state.expanded;
    const open = new Set(state.expanded);
    const visit = (node: LVNode): void => {
      if (node.kind === 'position') return;
      if ((matches.counts.get(node.id) ?? 0) > 0) open.add(node.id);
      for (const child of node.children) visit(child);
    };
    visit(tree);
    return open;
  }, [tree, matches, state.expanded]);

  // Sammel-Bubbles mit Treffern gehen bei aktiver Suche von selbst auf —
  // dieselbe Ableitung wie `openNodes`, damit der Filter nichts versteckt.
  const openClusters = useMemo<ReadonlySet<string>>(() => {
    if (tree === null || !matches.filtering) return state.openClusters;
    const open = new Set(state.openClusters);
    const visit = (node: LVNode): void => {
      if (node.kind === 'position') return;
      if ((matches.counts.get(node.id) ?? 0) > 0) open.add(node.id);
      for (const child of node.children) visit(child);
    };
    visit(tree);
    return open;
  }, [tree, matches, state.openClusters]);

  const derived = useMemo<ViewerDerived>(
    () => ({
      tree,
      nodes: structure.nodes,
      parents: structure.parents,
      index,
      selectedNode:
        state.selectedNodeId === null ? null : (structure.nodes.get(state.selectedNodeId) ?? null),
      selectedPosition:
        state.selectedPositionId === null
          ? null
          : (structure.nodes.get(state.selectedPositionId) ?? null),
      matches,
      openNodes,
      openClusters,
    }),
    [
      tree,
      structure,
      index,
      state.selectedNodeId,
      state.selectedPositionId,
      matches,
      openNodes,
      openClusters,
    ],
  );

  const value = useMemo(() => ({ ...state, ...derived }), [state, derived]);

  return (
    <ViewerStateContext.Provider value={value}>
      <ViewerDispatchContext.Provider value={dispatch}>{children}</ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  );
}
