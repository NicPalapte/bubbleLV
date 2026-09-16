// Session-State des Viewers: geladener LVNode-Baum, Auswahl, Suche, Filter,
// Ansichtsmodus. Reiner UI-/Session-Zustand — kein localStorage, kein Fetch;
// ein Reload verwirft alles (docs/architecture/frontend.md).
//
// Die Provider-Komponente steht in ViewerProvider.tsx, damit diese Datei nur
// Nicht-Komponenten exportiert (React-Fast-Refresh-Regel).

import { createContext, useContext, type Dispatch } from 'react';
import { allClusterParents, allExpanded, expandedToDepth } from '../lib/graph/layoutRadial';
import type { PositionIndex } from '../lib/index/positionIndex';
import { EMPTY_FILTERS, type Filters, type Range } from '../lib/matchPos';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { MatchIndex } from '../lib/tree/matchCounts';
import type { LVNode } from '../types/lvNode';

/** Ebenen, die ein frisch geladenes LV offen zeigt (Projekt + Lose). */
const START_DEPTH = 2;
const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Breite der Info-Panels — gilt für das Eigenschaften-Panel der Tabellenansicht
 * und die schwebende Auswahlkarte im Graphen. Eine Größe für alle Panels: wer
 * einmal breiter zieht, bekommt das auch nach einem Ansichtswechsel wieder.
 */
export const PANEL_MIN_WIDTH = 280;
export const PANEL_MAX_WIDTH = 640;
/** Untergrenze der Höhe; sie betrifft nur die schwebende Karte. */
export const PANEL_MIN_HEIGHT = 160;

export interface PanelSize {
  width: number;
  /** `null` = so hoch wie der Inhalt. Nur die schwebende Karte liest das. */
  height: number | null;
}

export const DEFAULT_PANEL_SIZE: PanelSize = { width: 320, height: null };

export type HideMode = 'dim' | 'hide';
export type SizeModeId = 'count' | 'cost' | 'uniform';
export type ViewMode = 'graph' | 'table' | 'check';

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
   * Abgeschaltete Prüfregeln (WP-K). Jede Regel ist einzeln abschaltbar;
   * abgeschaltet verschwindet sie aus allen Ansichten
   * (docs/domain/vob-pruefungen.md). Reiner Sitzungszustand.
   */
  mutedRules: ReadonlySet<string>;
  /**
   * Globaler Ansichtsmodus (Issue #30) — Graph oder Tabelle, umgeschaltet über
   * die Kopfleiste. Bewusst unabhängig von `selectedNodeId`/`selectedPositionId`:
   * eine Sammel-Bubble oder Position lässt sich im Graphen anwählen, ohne dass
   * die Ansicht wechselt (Issue #10). Nur `openInTable` und `showGraph`
   * wechseln den Modus gezielt.
   */
  viewMode: ViewMode;
  /** Größe der Info-Panels (siehe `PanelSize`) — reiner Sitzungszustand. */
  panelSize: PanelSize;
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
  | { type: 'selectNode'; id: string | null }
  | { type: 'selectPosition'; nodeId: string | null; positionId: string | null }
  | { type: 'hover'; id: string | null }
  /** Ohne `open` umschalten, mit `open` gezielt auf- bzw. zuklappen. */
  | { type: 'toggleExpanded'; id: string; open?: boolean }
  | { type: 'expandAll' }
  | { type: 'collapseAll' }
  | { type: 'toggleCluster'; id: string }
  /** Prüfregel stummschalten bzw. wieder zulassen. */
  | { type: 'toggleRule'; id: string }
  | { type: 'setViewMode'; mode: ViewMode }
  /** Knoten wählen und gezielt in die Tabelle wechseln (Tabellensymbol im Graphen). */
  | { type: 'openInTable'; id: string | null }
  | { type: 'showGraph' }
  | { type: 'back' }
  /** Schwebende Auswahlkarte im Graphen schließen (X, Klick daneben, Escape
   *  auf der Karte) — anders als `back` immer komplett, nie nur eine Ebene
   *  zurück auf den übergeordneten Knoten. */
  | { type: 'closeSelection' }
  /** Info-Panels vergrößern/verkleinern; `height` nur von der Karte genutzt. */
  | { type: 'panelSize'; size: PanelSize };

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
  mutedRules: EMPTY_SET,
  viewMode: 'graph',
  panelSize: DEFAULT_PANEL_SIZE,
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
        panelSize: state.panelSize,
      };
    case 'error':
      return { ...state, loading: false, error: action.message };
    case 'clear':
      return {
        ...INITIAL_VIEWER_STATE,
        sizeMode: state.sizeMode,
        hideMode: state.hideMode,
        panelSize: state.panelSize,
      };
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
      return { ...state, selectedNodeId: action.id, selectedPositionId: null };
    case 'selectPosition':
      return { ...state, selectedNodeId: action.nodeId, selectedPositionId: action.positionId };
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
      // Auch die Sammel-Bubbles gehen auf — sonst zeigte „Alles ausklappen"
      // bei vielen Geschwistern nur eine Handvoll Knoten (Issue #41).
      return {
        ...state,
        expanded: allExpanded(state.lv.tree),
        openClusters: allClusterParents(state.lv.tree),
      };
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
    case 'toggleRule': {
      const mutedRules = new Set(state.mutedRules);
      if (!mutedRules.delete(action.id)) mutedRules.add(action.id);
      return { ...state, mutedRules };
    }
    case 'setViewMode':
      return { ...state, viewMode: action.mode };
    case 'openInTable':
      return {
        ...state,
        selectedNodeId: action.id,
        selectedPositionId: null,
        viewMode: 'table',
      };
    case 'showGraph':
      // Auswahl bleibt stehen — der Graph zeigt sie weiter hervorgehoben.
      return { ...state, viewMode: 'graph' };
    case 'back':
      // Der Ansichtsmodus ist jetzt eine bewusste, dauerhafte Wahl (Issue #30)
      // statt eines Abstechers von der Auswahl — Escape wechselt ihn nicht
      // mehr, sondern nimmt nur die Auswahl schrittweise zurück.
      if (state.selectedPositionId !== null) return { ...state, selectedPositionId: null };
      if (state.selectedNodeId !== null) return { ...state, selectedNodeId: null };
      return state;
    case 'closeSelection':
      return { ...state, selectedNodeId: null, selectedPositionId: null };
    case 'panelSize':
      return {
        ...state,
        panelSize: {
          width: clampPanelWidth(action.size.width),
          height:
            action.size.height === null ? null : Math.max(PANEL_MIN_HEIGHT, action.size.height),
        },
      };
    default:
      return state;
  }
}

/** Begrenzt eine Panel-Breite auf das gemeinsame Maß beider Info-Panels. */
export function clampPanelWidth(width: number): number {
  return Math.min(Math.max(width, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH);
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
