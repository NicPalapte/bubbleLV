// Session-State des Viewers: geladener LVNode-Baum, Auswahl, Suche, Filter,
// Ansichtsmodus. Reiner UI-/Session-Zustand — kein localStorage, kein Fetch;
// ein Reload verwirft alles (docs/architecture/frontend.md).
//
// Die Provider-Komponente steht in ViewerProvider.tsx, damit diese Datei nur
// Nicht-Komponenten exportiert (React-Fast-Refresh-Regel).

import { createContext, useContext, type Dispatch } from 'react';
import { allExpanded, expandedToDepth } from '../lib/graph/layoutRadial';
import { EMPTY_FILTERS, type Filters, type Range } from '../lib/matchPos';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { MatchIndex } from '../lib/tree/matchCounts';
import type { LVNode } from '../types/lvNode';

/** Ebenen, die ein frisch geladenes LV offen zeigt (Projekt + Lose). */
const START_DEPTH = 2;
const EMPTY_SET: ReadonlySet<string> = new Set();

export type HideMode = 'dim' | 'hide';
export type SizeModeId = 'count' | 'cost' | 'uniform';
export type CenterMode = 'graph' | 'table';

export interface ViewerState {
  lv: LoadedLV | null;
  loading: boolean;
  error: string | null;
  search: string;
  filters: Filters;
  hideMode: HideMode;
  sizeMode: SizeModeId;
  /** Angewählter Abschnitt bzw. Los — steuert Eigenschaften-Panel und Tabelle. */
  selectedNodeId: string | null;
  selectedPositionId: string | null;
  hoveredNodeId: string | null;
  /**
   * Knoten, deren Kinder gezeigt werden — **eine** Quelle für Baum und Graph,
   * damit beide Ansichten nie auseinanderlaufen (Issue #18).
   */
  expanded: ReadonlySet<string>;
  /** Aufgelöste Cluster-Bubbles — reine Graph-Darstellung (Issue #10). */
  openClusters: ReadonlySet<string>;
  /**
   * Was in der Mitte steht. Bewusst eigener Zustand statt aus `selectedNodeId`
   * abgeleitet: eine Sammel-Bubble lässt sich anwählen, ohne dass der Graph
   * gegen die Tabelle getauscht wird (Issue #10).
   */
  centerMode: CenterMode;
}

export type ViewerAction =
  | { type: 'loading' }
  | { type: 'loaded'; lv: LoadedLV }
  | { type: 'error'; message: string }
  | { type: 'clear' }
  | { type: 'search'; value: string }
  | { type: 'setFacet'; facetId: string; values: Set<string> }
  | { type: 'setMenge'; range: Range | null }
  | { type: 'resetFilters' }
  | { type: 'hideMode'; value: HideMode }
  | { type: 'sizeMode'; value: SizeModeId }
  | { type: 'selectNode'; id: string | null; open?: boolean }
  | { type: 'selectPosition'; nodeId: string | null; positionId: string | null }
  | { type: 'hover'; id: string | null }
  /** Ohne `open` umschalten, mit `open` gezielt auf- bzw. zuklappen. */
  | { type: 'toggleExpanded'; id: string; open?: boolean }
  | { type: 'expandAll' }
  | { type: 'collapseAll' }
  | { type: 'toggleCluster'; id: string }
  | { type: 'showGraph' }
  | { type: 'back' };

export const INITIAL_VIEWER_STATE: ViewerState = {
  lv: null,
  loading: false,
  error: null,
  search: '',
  filters: EMPTY_FILTERS,
  hideMode: 'dim',
  sizeMode: 'count',
  selectedNodeId: null,
  selectedPositionId: null,
  hoveredNodeId: null,
  expanded: EMPTY_SET,
  openClusters: EMPTY_SET,
  centerMode: 'graph',
};

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'loaded':
      // Ein neuer Import ersetzt den kompletten Session-Zustand
      // (docs/architecture/data-model.md#re-import-in-derselben-session).
      return {
        ...INITIAL_VIEWER_STATE,
        lv: action.lv,
        expanded: expandedToDepth(action.lv.tree, START_DEPTH),
        sizeMode: state.sizeMode,
        hideMode: state.hideMode,
      };
    case 'error':
      return { ...state, loading: false, error: action.message };
    case 'clear':
      return { ...INITIAL_VIEWER_STATE, sizeMode: state.sizeMode, hideMode: state.hideMode };
    case 'search':
      return { ...state, search: action.value };
    case 'setFacet': {
      const facets = { ...state.filters.facets };
      if (action.values.size === 0) delete facets[action.facetId];
      else facets[action.facetId] = action.values;
      return { ...state, filters: { ...state.filters, facets } };
    }
    case 'setMenge':
      return { ...state, filters: { ...state.filters, menge: action.range } };
    case 'resetFilters':
      return { ...state, filters: EMPTY_FILTERS };
    case 'hideMode':
      return { ...state, hideMode: action.value };
    case 'sizeMode':
      return { ...state, sizeMode: action.value };
    case 'selectNode':
      return {
        ...state,
        selectedNodeId: action.id,
        selectedPositionId: null,
        centerMode:
          action.id === null ? 'graph' : action.open === true ? 'table' : state.centerMode,
      };
    case 'selectPosition':
      return {
        ...state,
        selectedNodeId: action.nodeId,
        selectedPositionId: action.positionId,
        centerMode: action.positionId === null ? state.centerMode : 'table',
      };
    case 'hover':
      return { ...state, hoveredNodeId: action.id };
    case 'toggleExpanded': {
      const expanded = new Set(state.expanded);
      const open = action.open ?? !expanded.has(action.id);
      if (open) expanded.add(action.id);
      else expanded.delete(action.id);
      return { ...state, expanded };
    }
    case 'expandAll':
      if (state.lv === null) return state;
      return { ...state, expanded: allExpanded(state.lv.tree) };
    case 'collapseAll':
      if (state.lv === null) return state;
      // Die Wurzel bleibt offen — sonst stünde der Graph auf einer einzigen
      // Bubble und der Baum wäre leer.
      return {
        ...state,
        expanded: expandedToDepth(state.lv.tree, 1),
        openClusters: EMPTY_SET,
      };
    case 'toggleCluster': {
      const openClusters = new Set(state.openClusters);
      if (!openClusters.delete(action.id)) openClusters.add(action.id);
      return { ...state, openClusters };
    }
    case 'showGraph':
      // Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
      return { ...state, centerMode: 'graph' };
    case 'back':
      if (state.selectedPositionId !== null) return { ...state, selectedPositionId: null };
      if (state.centerMode === 'table') return { ...state, centerMode: 'graph' };
      return { ...state, selectedNodeId: null };
    default:
      return state;
  }
}

export interface ViewerDerived {
  tree: LVNode | null;
  nodes: ReadonlyMap<string, LVNode>;
  parents: ReadonlyMap<string, LVNode | null>;
  /** Alle Positionsknoten — Grundlage für Facettenwerte und Tabellen. */
  positionNodes: readonly LVNode[];
  selectedNode: LVNode | null;
  selectedPosition: LVNode | null;
  /** Trefferzahlen je Knoten — einmal berechnet für Baum, Graph und Tabelle. */
  matches: MatchIndex;
  /**
   * Tatsächlich offene Knoten: der Aufklapp-Zustand plus die Pfade zu den
   * Treffern, die Suche und Filter automatisch öffnen. Baum und Graph lesen
   * dasselbe Set, damit sie auch beim Filtern gleich stehen (Issue #18).
   */
  openNodes: ReadonlySet<string>;
}

export type ViewerValue = ViewerState & ViewerDerived;

export const ViewerStateContext = createContext<ViewerValue | null>(null);
export const ViewerDispatchContext = createContext<Dispatch<ViewerAction> | null>(null);

export function useViewer(): ViewerValue {
  const value = useContext(ViewerStateContext);
  if (value === null) throw new Error('useViewer muss innerhalb von <ViewerProvider> stehen');
  return value;
}

export function useViewerDispatch(): Dispatch<ViewerAction> {
  const dispatch = useContext(ViewerDispatchContext);
  if (dispatch === null) {
    throw new Error('useViewerDispatch muss innerhalb von <ViewerProvider> stehen');
  }
  return dispatch;
}
