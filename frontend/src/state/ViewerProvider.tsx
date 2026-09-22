// Provider für den Viewer-Session-State. Berechnet die abgeleiteten Sichten
// (Knoten-Index, Elternzuordnung, flacher Positions-Index, Trefferzahlen,
// Gewerk-Farbskala) an genau einer Stelle — Baum, Graph, Tabelle und Überblick
// bekommen dasselbe Ergebnis (Issue #18, WP-L).

import { useMemo, useReducer, type ReactNode } from 'react';
import { buildColorScale, EMPTY_COLOR_SCALE, type ColorScale } from '../lib/colors';
import { buildFocusTree, type FocusGraph } from '../lib/graph/focusTree';
import {
  buildPositionIndex,
  EMPTY_POSITION_INDEX,
  filterMask,
  type PositionIndex,
} from '../lib/index/positionIndex';
import { prepareFilters, type ActiveFilters } from '../lib/matchPos';
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
  const { search, filters } = state.filter;

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

  // Eine Aufbereitung je Filterwechsel — Trefferzahlen, Tabelle und Überblick
  // rechnen gegen dieselbe.
  const active = useMemo<ActiveFilters>(() => prepareFilters(filters, search), [filters, search]);

  const matches = useMemo<MatchIndex>(() => {
    if (tree === null) return EMPTY_MATCHES;
    return measure('Filter', () => computeMatchCounts(tree, index, active));
  }, [tree, index, active]);

  // Eine Farbskala je geladenem LV, gültig für alle Ansichten (WP-L). Die
  // Gewerk-Namen stehen in den vorberechneten Facetten-Zählern bereits sortiert
  // — damit bekommt dasselbe LV immer dieselben Farben.
  const gewerkColors = useMemo<ColorScale>(() => {
    const values = state.lv?.summary.facets.get('gewerk');
    return values === undefined ? EMPTY_COLOR_SCALE : buildColorScale(values.keys());
  }, [state.lv]);

  // Bei aktiver Suche/Filterung gehen die Pfade zu den Treffern automatisch auf.
  // Abgeleitet statt gespeichert: fällt der Filter weg, steht wieder genau der
  // Aufklapp-Zustand da, den der Nutzer selbst gesetzt hat.
  const openNodes = useMemo<ReadonlySet<string>>(() => {
    if (tree === null || !matches.filtering) return state.selection.expanded;
    return withHits(tree, matches, state.selection.expanded);
  }, [tree, matches, state.selection.expanded]);

  // Sammel-Bubbles mit Treffern gehen bei aktiver Suche von selbst auf —
  // dieselbe Ableitung wie `openNodes`, damit der Filter nichts versteckt.
  const openClusters = useMemo<ReadonlySet<string>>(() => {
    if (tree === null || !matches.filtering) return state.selection.openClusters;
    return withHits(tree, matches, state.selection.openClusters);
  }, [tree, matches, state.selection.openClusters]);

  // Isolation der Treffer (WP-Q): ein synthetischer Baum aus den Treffern,
  // gebündelt nach Abschnitt, Gewerk oder Bauteiltyp. Entsteht hier und nicht
  // im Graphen, weil er vom Filter abhängt und nicht vom Ausschnitt — und weil
  // beide Hälften der geteilten Ansicht denselben brauchen.
  //
  // Nur, solange der Graph die aktive Ansicht ist: sonst zahlte jeder
  // Filterwechsel in Tabelle, Prüfung und Überblick einen Aufschlag für eine
  // Ansicht, die gar nicht auf dem Schirm steht.
  const { focus: focusMode, groupBy, sizeMode } = state.view.graph;
  const graphAktiv = state.view.mode === 'graph';
  const focus = useMemo<FocusGraph | null>(() => {
    if (tree === null || !graphAktiv || focusMode === 'structure' || !matches.filtering) {
      return null;
    }
    return measure('Treffer-Isolation', () =>
      buildFocusTree(index, filterMask(index, active), {
        groupBy,
        sizeMode,
        parents: structure.parents,
      }),
    );
  }, [
    tree,
    graphAktiv,
    focusMode,
    matches.filtering,
    index,
    active,
    groupBy,
    sizeMode,
    structure.parents,
  ]);

  const derived = useMemo<ViewerDerived>(
    () => ({
      tree,
      nodes: structure.nodes,
      parents: structure.parents,
      index,
      active,
      selectedNode:
        state.selection.nodeId === null
          ? null
          : (structure.nodes.get(state.selection.nodeId) ?? null),
      selectedPosition:
        state.selection.positionId === null
          ? null
          : (structure.nodes.get(state.selection.positionId) ?? null),
      matches,
      openNodes,
      openClusters,
      gewerkColors,
      focus,
    }),
    [
      tree,
      structure,
      index,
      active,
      state.selection.nodeId,
      state.selection.positionId,
      matches,
      openNodes,
      openClusters,
      gewerkColors,
      focus,
    ],
  );

  const value = useMemo(() => ({ ...state, ...derived }), [state, derived]);

  return (
    <ViewerStateContext.Provider value={value}>
      <ViewerDispatchContext.Provider value={dispatch}>{children}</ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  );
}

/** Basis-Set plus alle Knoten, unter denen ein Treffer liegt. */
function withHits(
  tree: LVNode,
  matches: MatchIndex,
  base: ReadonlySet<string>,
): ReadonlySet<string> {
  const open = new Set(base);
  const visit = (node: LVNode): void => {
    if (node.kind === 'position') return;
    if ((matches.counts.get(node.id) ?? 0) > 0) open.add(node.id);
    for (const child of node.children) visit(child);
  };
  visit(tree);
  return open;
}
