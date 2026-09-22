// Session-State des Viewers: geladenes LV plus drei getrennte Bereiche —
// `filter` (Suche, Facetten, Modus), `selection` (Auswahl, Aufklapp-Zustand)
// und `view` (aktive Ansicht, je Ansicht eigener Zustand). Die Trennung ist
// keine Ordnungsfrage: sie macht es unmöglich, dass ein Ansichtswechsel Filter
// oder Auswahl anfasst (WP-L, .claude/CLAUDE.md#frontend).
//
// Reiner UI-/Session-Zustand — kein localStorage, kein Fetch; ein Reload
// verwirft alles (docs/architecture/frontend.md).
//
// Die Provider-Komponente steht in ViewerProvider.tsx, damit diese Datei nur
// Nicht-Komponenten exportiert (React-Fast-Refresh-Regel).

import { createContext, useContext, type Dispatch } from 'react';
import {
  filterReducer,
  INITIAL_FILTER_STATE,
  type FilterAction,
  type FilterState,
} from './filterState';
import {
  INITIAL_SELECTION_STATE,
  selectionForTree,
  selectionReducer,
  type SelectionAction,
  type SelectionState,
} from './selectionState';
import {
  INITIAL_VIEW_STATE,
  viewReducer,
  viewStateForNewLv,
  type ViewAction,
  type ViewState,
} from './viewState';
import type { ColorScale } from '../lib/colors';
import type { FocusGraph } from '../lib/graph/focusTree';
import type { FilteredQuantities } from '../lib/graph/quantities';
import type { PositionIndex } from '../lib/index/positionIndex';
import type { ActiveFilters } from '../lib/matchPos';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { MatchIndex } from '../lib/tree/matchCounts';
import type { LVNode } from '../types/lvNode';

export type { FilterState, HideMode } from './filterState';
export type { SelectionState } from './selectionState';
export {
  DEFAULT_CARD_POS,
  DEFAULT_PANEL_SIZE,
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  clampPanelWidth,
} from './viewState';
export { CLUSTER_MIN_MEMBERS, MAX_COMPARE_COLUMNS } from './viewState';
export type {
  CardPos,
  ClusterSort,
  GraphFocus,
  PanelSize,
  SizeModeId,
  ViewMode,
  ViewState,
} from './viewState';

export interface ViewerState {
  lv: LoadedLV | null;
  loading: boolean;
  error: string | null;
  filter: FilterState;
  selection: SelectionState;
  view: ViewState;
}

/** Aktionen, die mehr als einen Bereich betreffen oder das LV austauschen. */
type LvAction =
  | { type: 'loading' }
  | { type: 'loaded'; lv: LoadedLV }
  | { type: 'error'; message: string }
  | { type: 'clear' }
  /** Knoten wählen und gezielt in die Tabelle wechseln (Tabellensymbol im Graphen). */
  | { type: 'openInTable'; id: string | null }
  | { type: 'showGraph' };

export type ViewerAction = LvAction | FilterAction | SelectionAction | ViewAction;

export const INITIAL_VIEWER_STATE: ViewerState = {
  lv: null,
  loading: false,
  error: null,
  filter: INITIAL_FILTER_STATE,
  selection: INITIAL_SELECTION_STATE,
  view: INITIAL_VIEW_STATE,
};

// Ein Bereich, der sich nicht ändert, gibt dieselbe Referenz zurück — dann
// bleibt auch der Gesamtzustand identisch und kein Render läuft umsonst.
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
        filter: { ...INITIAL_FILTER_STATE, hideMode: state.filter.hideMode },
        selection: selectionForTree(action.lv.tree),
        view: viewStateForNewLv(state.view),
      };
    case 'error':
      return { ...state, loading: false, error: action.message };
    case 'clear':
      return {
        ...INITIAL_VIEWER_STATE,
        filter: { ...INITIAL_FILTER_STATE, hideMode: state.filter.hideMode },
        view: viewStateForNewLv(state.view),
      };

    // Die beiden Sprünge zwischen den Ansichten fassen Auswahl **und** Ansicht
    // an — deshalb stehen sie hier und nicht in einem der drei Bereiche.
    case 'openInTable':
      return {
        ...state,
        selection: { ...state.selection, nodeId: action.id, positionId: null },
        view: viewReducer(state.view, { type: 'setViewMode', mode: 'table' }),
      };
    case 'showGraph':
      // Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
      return { ...state, view: viewReducer(state.view, { type: 'setViewMode', mode: 'graph' }) };

    case 'search':
    case 'setFacet':
    case 'setMenge':
    case 'resetFilters':
    case 'hideMode':
    case 'toggleRule': {
      const filter = filterReducer(state.filter, action);
      return filter === state.filter ? state : { ...state, filter };
    }

    case 'selectNode':
    case 'selectPosition':
    case 'hover':
    case 'toggleExpanded':
    case 'expandAll':
    case 'collapseAll':
    case 'toggleCluster':
    case 'toggleCompare':
    case 'setCompare':
    case 'clearCompare':
    case 'back':
    case 'closeSelection': {
      const selection = selectionReducer(state.selection, action, state.lv?.tree ?? null);
      return selection === state.selection ? state : { ...state, selection };
    }

    case 'setViewMode':
    case 'sizeMode':
    case 'graphFocus':
    case 'focusGroupBy':
    case 'graphViewport':
    case 'tableSort':
    case 'tableScope':
    case 'tableColumns':
    case 'compareOnlyDiffs':
    case 'matrixAxis':
    case 'matrixMeasure':
    case 'toggleRuleOpen':
    case 'clusterMinMembers':
    case 'clusterSort':
    case 'toggleClusterOpen':
    case 'viewScroll':
    case 'panelSize':
    case 'cardPos': {
      const view = viewReducer(state.view, action);
      return view === state.view ? state : { ...state, view };
    }

    default:
      return state;
  }
}

export interface ViewerDerived {
  tree: LVNode | null;
  nodes: ReadonlyMap<string, LVNode>;
  parents: ReadonlyMap<string, LVNode | null>;
  /**
   * Flacher Positions-Index — Rechenbasis für Filter, Summen und Beziehungen
   * (WP-I). Der Baum bleibt die Struktur, dieser Index die Rechenbasis.
   */
  index: PositionIndex;
  /** Aufbereiteter Filter für einen Durchlauf — einmal je Filterwechsel. */
  active: ActiveFilters;
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
  /**
   * Tatsächlich aufgelöste Sammel-Bubbles: die vom Nutzer geöffneten plus die,
   * in denen ein Treffer steckt. Sonst bliebe ein Treffer bei aktiver Suche in
   * einer zugeklappten Sammel-Bubble unsichtbar (Issue #41, G4).
   */
  openClusters: ReadonlySet<string>;
  /** Eine Gewerk-Farbskala für alle Ansichten (WP-L, Schritt 5). */
  gewerkColors: ColorScale;
  /**
   * Isolations-Baum des Graphen (WP-Q): die Treffer, nach Gruppen gebündelt.
   * `null`, solange nicht gefiltert wird, die Trefferansicht auf `structure`
   * steht oder kein Treffer übrig bleibt.
   */
  focus: FocusGraph | null;
  /**
   * Mengen für den Größenmodus „Menge" (WP-Q): die eine Einheit der
   * gefilterten Menge und — nur wenn der Modus aktiv ist — die Summen je
   * Knoten. Außerhalb der Graph-Ansicht leer.
   */
  quantities: FilteredQuantities;
  /**
   * Positionen im Vergleich, in der Reihenfolge ihrer Wahl (WP-N). IDs, die
   * kein Knoten mehr trägt — etwa nach einem neuen Import — fallen heraus.
   */
  comparePositions: readonly LVNode[];
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
