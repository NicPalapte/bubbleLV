// Ansichts-Zustand — welche der Ansichten vorn steht und was jede von ihnen
// sich merkt (WP-L, Schritt 1 und 2).
//
// Der Umschalter ändert **nur** `mode`. Alles, was eine Ansicht braucht, um
// nach dem Rückwechsel wieder so dazustehen wie vorher — Sortierung, Umfang,
// Spalten, Scrollposition, Graph-Ausschnitt — steht hier und nicht als
// lokaler `useState` in der Komponente: die wird beim Wechsel abgebaut.
//
// Ausdrücklich **nicht** hier: Filter, Suche und Auswahl. Die liegen in
// `filterState` und `selectionState`, damit ein Ansichtswechsel sie gar nicht
// erreichen kann (.claude/CLAUDE.md#kritische-constraints).

import type { ColumnConfig } from '../lib/table/columns';
import type { FocusGroupBy } from '../lib/graph/focusTree';

export type ViewMode = 'overview' | 'graph' | 'table' | 'check' | 'similar';
export type SizeModeId = 'count' | 'cost' | 'uniform';
/**
 * Was der Graph mit den Treffern macht, solange gefiltert wird (WP-Q, Issue #60):
 * `structure` zeigt den ganzen Graphen mit hervorgehobenen Treffern, `isolate`
 * nur die Treffer, neu nach Gruppen sortiert.
 */
export type GraphFocus = 'structure' | 'isolate';
export type TableScope = 'node' | 'lv';

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

/**
 * Ort der schwebenden Auswahlkarte im Graphen, gemessen von der oberen rechten
 * Ecke des Canvas. Gleiche Lebensdauer wie `panelSize`: einmal beiseite
 * geschoben, steht die Karte auch nach dem nächsten Klick wieder dort.
 */
export interface CardPos {
  right: number;
  top: number;
}

export const DEFAULT_CARD_POS: CardPos = { right: 16, top: 16 };

/** Ausschnitt des Graphen (Verschiebung und Zoom). */
export interface Viewport {
  tx: number;
  ty: number;
  k: number;
}

export interface GraphViewState {
  sizeMode: SizeModeId;
  /** Trefferansicht; ohne aktiven Filter zeigt der Graph immer die Struktur. */
  focus: GraphFocus;
  /** Wonach die Isolation bündelt. */
  groupBy: FocusGroupBy;
  /**
   * Zuletzt verlassener Ausschnitt; `null` = noch keiner, dann passt der Graph
   * beim Öffnen selbst ein. Während des Ziehens bleibt der Ausschnitt lokal in
   * der Komponente — als Context-State würde jeder Frame die ganze Seite neu
   * rendern. Erst beim Verlassen der Ansicht wandert er hierher.
   */
  viewport: Viewport | null;
}

export interface TableViewState {
  sort: { key: string; dir: 1 | -1 };
  scope: TableScope;
  /** `null` = unveränderte Standardspalten; die Tabelle kennt ihre Vorgabe. */
  columns: ColumnConfig | null;
}

export interface CheckViewState {
  /** Aufgeklappte Regeln — welche Fundlisten offen stehen. */
  openRules: ReadonlySet<string>;
}

/** Wonach die Ansicht „Ähnlichkeit" ihre Gruppen ordnet. */
export type ClusterSort = 'groesse' | 'streuung' | 'aehnlichkeit';

/** Auswahl des Reglers „ab n Mitgliedern" (WP-M, Schritt 5). */
export const CLUSTER_MIN_MEMBERS = [2, 3, 5, 10] as const;

export interface SimilarViewState {
  /**
   * Nur Gruppen ab dieser Mitgliederzahl anzeigen. Der Regler sitzt bewusst in
   * der Ansicht und nicht im globalen Filter: `matchPos` entscheidet je
   * Position aus der Position selbst, die Cluster-Zugehörigkeit entsteht erst
   * danach (docs/decisions/0016-aehnlichkeit-und-cluster.md).
   */
  minMembers: number;
  sort: ClusterSort;
  /** Aufgeklappte Gruppen — welche Mitgliederlisten offen stehen. */
  openClusters: ReadonlySet<string>;
}

export interface ViewState {
  mode: ViewMode;
  graph: GraphViewState;
  table: TableViewState;
  check: CheckViewState;
  similar: SimilarViewState;
  /** Scrollposition je Ansicht — sie überlebt den Wechsel (WP-L, Abnahme). */
  scroll: Readonly<Record<ViewMode, number>>;
  panelSize: PanelSize;
  cardPos: CardPos;
}

export type ViewAction =
  | { type: 'setViewMode'; mode: ViewMode }
  | { type: 'sizeMode'; value: SizeModeId }
  /** Trefferansicht umschalten — fasst Filter, Suche und Auswahl nie an. */
  | { type: 'graphFocus'; value: GraphFocus }
  | { type: 'focusGroupBy'; value: FocusGroupBy }
  /** Graph-Ausschnitt sichern — beim Verlassen der Ansicht, nicht je Frame. */
  | { type: 'graphViewport'; viewport: Viewport | null }
  | { type: 'tableSort'; key: string }
  | { type: 'tableScope'; scope: TableScope }
  | { type: 'tableColumns'; columns: ColumnConfig | null }
  | { type: 'toggleRuleOpen'; id: string }
  | { type: 'clusterMinMembers'; value: number }
  | { type: 'clusterSort'; value: ClusterSort }
  | { type: 'toggleClusterOpen'; id: string }
  | { type: 'viewScroll'; view: ViewMode; top: number }
  /** Info-Panels vergrößern/verkleinern; `height` nur von der Karte genutzt. */
  | { type: 'panelSize'; size: PanelSize }
  /** Schwebende Auswahlkarte verschieben. */
  | { type: 'cardPos'; pos: CardPos };

const NO_SCROLL: Readonly<Record<ViewMode, number>> = {
  overview: 0,
  graph: 0,
  table: 0,
  check: 0,
  similar: 0,
};

export const INITIAL_VIEW_STATE: ViewState = {
  // Der Überblick ist die Eingangsansicht: er ordnet das LV ein, bevor man in
  // Graph oder Tabelle geht (docs/implementation-plan.md, WP-L).
  mode: 'overview',
  graph: { sizeMode: 'count', focus: 'isolate', groupBy: 'abschnitt', viewport: null },
  table: { sort: { key: 'oz', dir: 1 }, scope: 'node', columns: null },
  check: { openRules: new Set() },
  similar: { minMembers: 2, sort: 'groesse', openClusters: new Set() },
  scroll: NO_SCROLL,
  panelSize: DEFAULT_PANEL_SIZE,
  cardPos: DEFAULT_CARD_POS,
};

/**
 * Zustand für ein neu geladenes LV. Erhalten bleibt, was eine Vorliebe ist und
 * kein Fachdatum: Größenmodus, Panel-Maße und Ort der Karte. Alles, was sich
 * auf die alte Datei bezog (Ausschnitt, Sortierung, Spalten, Scrollposition),
 * fällt weg.
 */
export function viewStateForNewLv(state: ViewState): ViewState {
  return {
    ...INITIAL_VIEW_STATE,
    graph: {
      sizeMode: state.graph.sizeMode,
      focus: state.graph.focus,
      groupBy: state.graph.groupBy,
      viewport: null,
    },
    // Regler und Sortierung der Ähnlichkeit sind eine Vorliebe, kein Fachdatum
    // — die aufgeklappten Gruppen der alten Datei fallen dagegen weg.
    similar: {
      minMembers: state.similar.minMembers,
      sort: state.similar.sort,
      openClusters: new Set(),
    },
    panelSize: state.panelSize,
    cardPos: state.cardPos,
  };
}

/** Begrenzt eine Panel-Breite auf das gemeinsame Maß beider Info-Panels. */
export function clampPanelWidth(width: number): number {
  return Math.min(Math.max(width, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH);
}

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'setViewMode':
      // Bewusst nur `mode`: Filter, Auswahl und der gemerkte Zustand der
      // anderen Ansichten bleiben unangetastet.
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case 'sizeMode':
      return { ...state, graph: { ...state.graph, sizeMode: action.value } };
    case 'graphFocus':
      return { ...state, graph: { ...state.graph, focus: action.value } };
    case 'focusGroupBy':
      return { ...state, graph: { ...state.graph, groupBy: action.value } };
    case 'graphViewport':
      return { ...state, graph: { ...state.graph, viewport: action.viewport } };
    case 'tableSort': {
      const { sort } = state.table;
      const dir: 1 | -1 = sort.key === action.key ? ((sort.dir * -1) as 1 | -1) : 1;
      return { ...state, table: { ...state.table, sort: { key: action.key, dir } } };
    }
    case 'tableScope':
      return { ...state, table: { ...state.table, scope: action.scope } };
    case 'tableColumns':
      return { ...state, table: { ...state.table, columns: action.columns } };
    case 'toggleRuleOpen': {
      const openRules = new Set(state.check.openRules);
      if (!openRules.delete(action.id)) openRules.add(action.id);
      return { ...state, check: { openRules } };
    }
    case 'clusterMinMembers':
      return { ...state, similar: { ...state.similar, minMembers: action.value } };
    case 'clusterSort':
      return { ...state, similar: { ...state.similar, sort: action.value } };
    case 'toggleClusterOpen': {
      const openClusters = new Set(state.similar.openClusters);
      if (!openClusters.delete(action.id)) openClusters.add(action.id);
      return { ...state, similar: { ...state.similar, openClusters } };
    }
    case 'viewScroll':
      if (state.scroll[action.view] === action.top) return state;
      return { ...state, scroll: { ...state.scroll, [action.view]: action.top } };
    case 'panelSize':
      return {
        ...state,
        panelSize: {
          width: clampPanelWidth(action.size.width),
          height:
            action.size.height === null ? null : Math.max(PANEL_MIN_HEIGHT, action.size.height),
        },
      };
    case 'cardPos':
      return { ...state, cardPos: action.pos };
    default:
      return state;
  }
}
