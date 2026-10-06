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
import type { HintIndex } from '../lib/check';
import { AXIS_FACETS } from '../lib/graph/layoutMap';
import type { ColorScale } from '../lib/colors';
import type { PositionIndex } from '../lib/index/positionIndex';
import type { ActiveFilters } from '../lib/matchPos';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { SharedState } from '../lib/share/urlState';
import type { MatchIndex } from '../lib/tree/matchCounts';
import type { LVNode } from '../types/lvNode';

export type { FilterState, HideMode } from './filterState';
export type { SelectionState } from './selectionState';
export { MAX_COMPARE } from './selectionState';
export {
  DEFAULT_CARD_POS,
  DEFAULT_PANEL_SIZE,
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  clampPanelWidth,
} from './viewState';
export {
  DEFAULT_TABLE_SIZE,
  TABLE_MAX_WIDTH,
  TABLE_MIN_HEIGHT,
  TABLE_MIN_WIDTH,
} from './viewState';
export type {
  CardPos,
  GraphLayoutId,
  PanelSize,
  SidePanel,
  SizeModeId,
  ViewMode,
  ViewState,
} from './viewState';

export interface ViewerState {
  lv: LoadedLV | null;
  loading: boolean;
  error: string | null;
  /**
   * Hinweise zum geladenen LV (Issues #94, #95): etwas lief anders als erwartet,
   * aber die Datei ist da. Anders als `error` verdrängen sie die Ansicht nicht.
   */
  notices: readonly string[];
  filter: FilterState;
  selection: SelectionState;
  view: ViewState;
}

/** Aktionen, die mehr als einen Bereich betreffen oder das LV austauschen. */
type LvAction =
  | { type: 'loading' }
  /** Zustand aus einem geteilten Link (WP-P, Schritt 2, lib/share/urlState.ts). */
  | { type: 'applyShared'; shared: SharedState; nodeId: string | null; positionId: string | null }
  | { type: 'loaded'; lv: LoadedLV; notices?: readonly string[] }
  /** Hinweis anhängen; derselbe Text erscheint nicht doppelt. */
  | { type: 'notice'; message: string }
  | { type: 'dismissNotices' }
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
  notices: [],
  filter: INITIAL_FILTER_STATE,
  selection: INITIAL_SELECTION_STATE,
  view: INITIAL_VIEW_STATE,
};

// Ein Bereich, der sich nicht ändert, gibt dieselbe Referenz zurück — dann
// bleibt auch der Gesamtzustand identisch und kein Render läuft umsonst.
export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null, notices: [] };
    case 'loaded':
      // Ein neuer Import ersetzt den kompletten Session-Zustand
      // (docs/architecture/data-model.md#re-import-in-derselben-session).
      return {
        ...INITIAL_VIEWER_STATE,
        lv: action.lv,
        notices: action.notices ?? [],
        filter: { ...INITIAL_FILTER_STATE, hideMode: state.filter.hideMode },
        selection: INITIAL_SELECTION_STATE,
        view: viewStateForNewLv(state.view),
      };
    // Ein geteilter Link (WP-P, Schritt 2): Ansicht, Filter und Auswahl in
    // **einem** Schritt setzen. Einzelne Aktionen nacheinander würden
    // Zwischenstände erzeugen, die kurz gezeichnet und sofort wieder
    // überschrieben werden — und jeder davon schriebe die Adresszeile neu.
    case 'applyShared': {
      const { shared, nodeId, positionId } = action;
      const facets: Record<string, Set<string>> = {};
      for (const [facetId, values] of Object.entries(shared.facets)) {
        if (values.length > 0) facets[facetId] = new Set(values);
      }
      return {
        ...state,
        filter: {
          ...state.filter,
          search: shared.search,
          filters: { facets, menge: shared.menge },
          hideMode: shared.hideMode,
        },
        selection: { ...state.selection, nodeId, positionId },
        view: viewReducer(state.view, { type: 'setViewMode', mode: shared.view }),
      };
    }
    case 'notice':
      return state.notices.includes(action.message)
        ? state
        : { ...state, notices: [...state.notices, action.message] };
    case 'dismissNotices':
      return state.notices.length === 0 ? state : { ...state, notices: [] };
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

    case 'setFacet': {
      const filter = filterReducer(state.filter, action);
      // In „frei" wird ein neuer Filter von selbst zur Spalte — so zeigt die
      // Matrix sofort, wie sich die Auswahl auf die Zeilen verteilt.
      const { graph } = state.view;
      const toColumn =
        graph.layout === 'frei' &&
        graph.cols === null &&
        action.values.size > 0 &&
        action.facetId !== graph.rows &&
        AXIS_FACETS.includes(action.facetId);
      const view = toColumn
        ? viewReducer(state.view, { type: 'graphCols', value: action.facetId })
        : state.view;
      return filter === state.filter && view === state.view ? state : { ...state, filter, view };
    }
    case 'search':
    case 'setMenge':
    case 'resetFilters':
    case 'hideMode':
    case 'toggleRule': {
      const filter = filterReducer(state.filter, action);
      return filter === state.filter ? state : { ...state, filter };
    }

    case 'toggleCompare': {
      const selection = selectionReducer(state.selection, action);
      if (selection === state.selection) return state;
      // Dazunehmen holt das Fenster; Herausnehmen lässt es, wie es ist.
      const added = selection.compare.length > state.selection.compare.length;
      const view = added
        ? viewReducer(state.view, { type: 'compareWindow', open: true })
        : state.view;
      return { ...state, selection, view };
    }
    case 'clearCompare': {
      const selection = selectionReducer(state.selection, action);
      const view = viewReducer(state.view, { type: 'compareWindow', open: false });
      return selection === state.selection && view === state.view
        ? state
        : { ...state, selection, view };
    }

    case 'selectNode':
    case 'selectPosition':
    case 'hover':
    case 'back':
    case 'closeSelection': {
      const selection = selectionReducer(state.selection, action);
      return selection === state.selection ? state : { ...state, selection };
    }

    case 'setViewMode':
    case 'sidePanel':
    case 'sideWidth':
    case 'tableWindow':
    case 'tableWindowPos':
    case 'tableWindowSize':
    case 'compareWindow':
    case 'compareWindowPos':
    case 'compareWindowSize':
    case 'sizeMode':
    case 'graphLayout':
    case 'graphRows':
    case 'graphCols':
    case 'graphHints':
    case 'graphViewport':
    case 'tableSort':
    case 'tableScope':
    case 'tableColumns':
    case 'toggleRuleOpen':
    case 'openRule':
    case 'ruleRevealed':
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
  /** Positionen im Vergleich, in der Reihenfolge von `selection.compare`. */
  comparePositions: readonly LVNode[];
  /** Trefferzahlen je Knoten — einmal berechnet für Baum, Graph und Tabelle. */
  matches: MatchIndex;
  /** Treffer je Indexeintrag (1 = Treffer); `null`, solange nicht gefiltert wird. */
  mask: Uint8Array | null;
  /** Eine Gewerk-Farbskala für alle Ansichten (WP-L, Schritt 5). */
  gewerkColors: ColorScale;
  /**
   * Hinweise der Prüfregeln, nach Position sortiert (WP-R, R1). Grundlage für
   * den Ring an der Bubble und den Block „Hinweise" in der Auswahlkarte.
   * Abgeschaltete Regeln fehlen darin — ein Filterzustand, alle Ansichten.
   */
  hints: HintIndex;
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
