// Session-State des Viewers: geladener LVNode-Baum, Auswahl, Suche, Filter,
// Ansichtsmodus. Reiner UI-/Session-Zustand — kein localStorage, kein Fetch;
// ein Reload verwirft alles (docs/architecture/frontend.md).
//
// Die Provider-Komponente steht in ViewerProvider.tsx, damit diese Datei nur
// Nicht-Komponenten exportiert (React-Fast-Refresh-Regel).

import { createContext, useContext, type Dispatch } from 'react';
import { EMPTY_FILTERS, type Filters, type Range } from '../lib/matchPos';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { LVNode } from '../types/lvNode';

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
