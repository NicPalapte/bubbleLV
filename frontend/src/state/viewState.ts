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
import { SECTION_AXIS, type GraphLayoutId } from '../lib/graph/layoutMap';
import type { SizeModeId } from '../lib/graph/sizes';
import {
  INITIAL_ARRANGEMENT,
  bringToFront,
  edgePane,
  resizeSplit,
  splitPane,
  stackPane,
  swapPanes,
  type Arrangement,
  type PaneId,
  type Side,
} from '../lib/workspace/split';

export type ViewMode = 'overview' | 'graph' | 'table';
/**
 * Seit dem neuen Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md) und dem
 * Splitscreen (Entscheidung 0074) sind Überblick und Tabelle Bereiche neben dem
 * Graphen. `mode` bleibt deshalb immer `graph` — siehe `setViewMode`.
 */
export type SidePanel = 'overview' | 'check';
export type { GraphLayoutId, SizeModeId };
export type TableScope = 'node' | 'lv';

/** Größe eines Fensters über der Arbeitsfläche (Vergleich). */
export interface PanelSize {
  width: number;
  /** `null` = so hoch wie der Inhalt. */
  height: number | null;
}

/** Ort eines Fensters, gemessen von der oberen rechten Ecke der Arbeitsfläche. */
export interface CardPos {
  right: number;
  top: number;
}

/** Ausschnitt des Graphen (Verschiebung und Zoom). */
export interface Viewport {
  tx: number;
  ty: number;
  k: number;
}

export interface GraphViewState {
  /** Größe der Positionen; Gruppen messen immer die Anzahl. */
  sizeMode: SizeModeId;
  /** Gliederung (docs/decisions/0035-graph-gliederung.md). */
  layout: GraphLayoutId;
  /** Merkmal der Zeilen in „Matrix" (Facetten-ID). */
  rows: string;
  /** Merkmal der Spalten in „Matrix"; `null` = keine Spalten. */
  cols: string | null;
  /** Hinweis-Ringe und -Schilder im Graphen zeigen. */
  showHints: boolean;
  /**
   * Zuletzt verlassener Ausschnitt; `null` = noch keiner, dann passt der Graph
   * beim Öffnen selbst ein. Während des Ziehens bleibt der Ausschnitt lokal in
   * der Komponente — als Context-State würde jeder Frame die ganze Seite neu
   * rendern. Erst beim Verlassen der Ansicht wandert er hierher.
   */
  viewport: Viewport | null;
  /** Steigt bei „Im Graph zeigen"; der Graph passt dann auf die Auswahl ein. */
  focus: number;
}

export interface TableViewState {
  sort: { key: string; dir: 1 | -1 };
  scope: TableScope;
  /** `null` = unveränderte Standardspalten; die Tabelle kennt ihre Vorgabe. */
  columns: ColumnConfig | null;
  /** Zugeklappte Abschnitte (Knoten-IDs); nur diese Sitzung und dieses LV. */
  collapsed: ReadonlySet<string>;
}

/** Grenzen des Vergleichsfensters über der Arbeitsfläche. */
export const TABLE_MIN_WIDTH = 420;
export const TABLE_MIN_HEIGHT = 200;
export const TABLE_MAX_WIDTH = 1600;

/** Vergleichsfenster: oben, links neben der Positionskarte. */
export const DEFAULT_COMPARE_POS: CardPos = { right: 412, top: 90 };
export const DEFAULT_COMPARE_SIZE: PanelSize = { width: 640, height: 460 };

/** Größe des Vergleichsfensters in seinen Grenzen. */
export function clampWindowSize(size: PanelSize): PanelSize {
  return {
    width: Math.min(Math.max(size.width, TABLE_MIN_WIDTH), TABLE_MAX_WIDTH),
    height: size.height === null ? null : Math.max(size.height, TABLE_MIN_HEIGHT),
  };
}

export interface CompareWindowState {
  open: boolean;
  pos: CardPos;
  size: PanelSize;
}

/** Überblick: aufgeklappte Prüfregeln und das Sprungziel aus dem Graphen. */
export interface OverviewViewState {
  /** Aufgeklappte Regel — höchstens eine; ihre Funde stehen in der Klappkarte. */
  openRules: ReadonlySet<string>;
  /**
   * Regel, die die Ansicht einmalig ins Fenster holen soll (WP-R, R1). Ein
   * Sprung aus dem Graphen klappt die Regel auf — ohne dieses Merkzeichen
   * landete er am gemerkten Scrollstand, also meist weit über ihr. Die Ansicht
   * setzt es nach dem Scrollen zurück; es überlebt keinen zweiten Blick.
   */
  revealRule: string | null;
}

/**
 * Anordnung der Arbeitsfläche: immer der Splitscreen (Entscheidungen 0064, 0074) —
 * Bereiche für Graph, Tabelle, Position, Überblick, Prüfung und Dokument.
 */
export interface WorkspaceState extends Arrangement {
  /** Geschlossene Bereiche. */
  closed: Readonly<Record<PaneId, boolean>>;
}

export const INITIAL_WORKSPACE: WorkspaceState = {
  ...INITIAL_ARRANGEMENT,
  // Überblick und Prüfung öffnet erst, wer sie braucht (Entscheidung 0070).
  // Das Dokument ebenso: erst „+ Dokument" öffnet es (Entscheidung 0072).
  closed: { graph: false, table: false, card: false, overview: true, check: true, doc: true },
};

/** Öffnet einen Bereich im Splitscreen und legt ihn in seinem Stapel nach vorn. */
function showPane(workspace: WorkspaceState, pane: PaneId): WorkspaceState {
  const front = bringToFront(workspace, pane);
  return front.closed[pane] ? { ...front, closed: { ...front.closed, [pane]: false } } : front;
}

export interface TourState {
  step: number | null;
  /** Einmal je Sitzung: nach dem ersten LV bietet Conocto die Tour an, danach nicht mehr. */
  seen: boolean;
}

export interface ViewState {
  /** Immer `graph` — Überblick und Tabelle sind Bereiche, siehe `setViewMode`. */
  mode: ViewMode;
  /** Filterleiste unter der Kopfleiste aufgeklappt (Issue #154). */
  filterBar: boolean;
  /** Darstellung (Größe, Gliederung) an der Graph-Steuerung aufgeklappt. */
  graphSettings: boolean;
  /** Geführte Tour: aktueller Schritt (`null` = aus) und ob sie schon angeboten war. */
  tour: TourState;
  /** Vergleichsfenster über der Arbeitsfläche (Entscheidung 0037). */
  compareWindow: CompareWindowState;
  graph: GraphViewState;
  table: TableViewState;
  overview: OverviewViewState;
  /** Scrollposition je Ansicht — sie überlebt den Wechsel (WP-L, Abnahme). */
  scroll: Readonly<Record<ViewMode, number>>;
  workspace: WorkspaceState;
  /**
   * Letzte gezielte Anforderung eines Bereichs (Sprung, Kennzahl, Link). Auf schmaler
   * Fläche holt `SplitView` damit den Reiter nach vorn, auch wenn der Bereich schon
   * offen war (Entscheidung 0074). Jede Anforderung ist ein neues Objekt.
   */
  paneRequest: { pane: PaneId } | null;
}

export type ViewAction =
  | { type: 'setViewMode'; mode: ViewMode }
  | { type: 'filterBar'; open: boolean }
  | { type: 'graphSettings'; open: boolean }
  /** Tour auf einen Schritt setzen; `null` beendet sie. Start oder Ende zählen als gesehen. */
  | { type: 'tour'; step: number | null }
  | { type: 'compareWindow'; open: boolean }
  | { type: 'compareWindowPos'; pos: CardPos }
  | { type: 'compareWindowSize'; size: PanelSize }
  | { type: 'sizeMode'; value: SizeModeId }
  /** Gliederung umschalten — fasst Filter, Suche und Auswahl nie an. */
  | { type: 'graphLayout'; value: GraphLayoutId }
  | { type: 'graphRows'; value: string }
  | { type: 'graphCols'; value: string | null }
  | { type: 'graphHints'; value: boolean }
  /** Graph-Ausschnitt sichern — beim Verlassen der Ansicht, nicht je Frame. */
  | { type: 'graphViewport'; viewport: Viewport | null }
  /** Auf die Auswahl einpassen; holt im Splitscreen den Graphen zurück, falls er zu war. */
  | { type: 'graphFocus' }
  | { type: 'tableSort'; key: string }
  | { type: 'tableScope'; scope: TableScope }
  | { type: 'tableColumns'; columns: ColumnConfig | null }
  /** Einen Abschnitt in der Tabelle auf- oder zuklappen. */
  | { type: 'tableToggleSection'; id: string }
  /** Mehrere Abschnitte auf einmal: `ids` zuklappen, leere Liste klappt alles auf. */
  | { type: 'tableCollapse'; ids: readonly string[] }
  | { type: 'toggleRuleOpen'; id: string }
  /** Regel gezielt aufklappen — der Sprung aus dem Graphen soll sie offen finden. */
  | { type: 'openRule'; id: string }
  /** Die Ansicht hat die Regel ins Fenster geholt; das Merkzeichen ist verbraucht. */
  | { type: 'ruleRevealed' }
  | { type: 'viewScroll'; view: ViewMode; top: number }
  /** Zwei Bereiche tauschen Platz und Reiter-Stelle (Entscheidung 0070). */
  | { type: 'swapPanes'; a: PaneId; b: PaneId }
  /** Bereich als Reiter auf einen Platz legen. */
  | { type: 'stackPane'; pane: PaneId; to: string }
  /** Platz `target` teilen, Bereich auf die Seite `side` (Entscheidung 0073). */
  | { type: 'splitPane'; pane: PaneId; target: string; side: Side }
  /** Bereich an den äußeren Rand — über die volle Höhe bzw. Breite. */
  | { type: 'edgePane'; pane: PaneId; side: Side }
  /** Reiter nach vorn holen. */
  | { type: 'paneFront'; pane: PaneId }
  /** Öffnen legt den Bereich auch nach vorn; ein offener bleibt, wo er ist. */
  | { type: 'paneClosed'; pane: PaneId; closed: boolean }
  /** Bereich öffnen und im Stapel nach vorn holen — für Sprünge und „öffne X". */
  | { type: 'showPane'; pane: PaneId }
  /** Gewichte einer Teilung; `null` setzt sie zurück. */
  | { type: 'splitSize'; split: string; sizes: readonly number[] | null }
  /** Anordnung wie am Anfang. */
  | { type: 'workspaceReset' }
  /** Gemerkte Anordnung beim Start übernehmen — nur, solange noch nichts verändert ist. */
  | { type: 'workspaceRestore'; workspace: WorkspaceState };

const NO_SCROLL: Readonly<Record<ViewMode, number>> = {
  overview: 0,
  graph: 0,
  table: 0,
};

export const INITIAL_VIEW_STATE: ViewState = {
  // Der Graph ist der Hauptscreen; alles andere schwebt darüber
  // (docs/decisions/0034-graph-als-hauptscreen.md).
  mode: 'graph',
  filterBar: false,
  graphSettings: false,
  tour: { step: null, seen: false },
  compareWindow: { open: false, pos: DEFAULT_COMPARE_POS, size: DEFAULT_COMPARE_SIZE },
  // Einstieg ist das LV in seiner Gliederung; „Matrix" ist der zweite Blick.
  graph: {
    sizeMode: 'quantity',
    layout: 'lv',
    rows: 'einheit',
    cols: null,
    showHints: true,
    viewport: null,
    focus: 0,
  },
  table: { sort: { key: 'oz', dir: 1 }, scope: 'node', columns: null, collapsed: new Set() },
  overview: { openRules: new Set(), revealRule: null },
  scroll: NO_SCROLL,
  workspace: INITIAL_WORKSPACE,
  paneRequest: null,
};

/**
 * Zustand für ein neu geladenes LV. Erhalten bleibt, was eine Vorliebe ist und
 * kein Fachdatum: Größenmodus, Maße des Vergleichsfensters, Anordnung. Alles, was sich
 * auf die alte Datei bezog (Ausschnitt, Sortierung, Spalten, Scrollposition),
 * fällt weg.
 */
export function viewStateForNewLv(state: ViewState): ViewState {
  return {
    ...INITIAL_VIEW_STATE,
    graph: { ...state.graph, viewport: null },
    compareWindow: {
      ...INITIAL_VIEW_STATE.compareWindow,
      pos: state.compareWindow.pos,
      size: state.compareWindow.size,
    },
    tour: { step: null, seen: state.tour.seen },
    workspace: state.workspace,
  };
}

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'setViewMode': {
      // Bewusst nur Ansichtszustand: Filter, Auswahl und der gemerkte Zustand
      // der anderen Ansichten bleiben unangetastet.
      //
      // Überblick und Tabelle sind Bereiche neben dem Graphen. Wer sie anfordert
      // (Befehle, Sprünge, Links), bekommt den Bereich geöffnet und vorn im Stapel.
      if (action.mode === 'graph') {
        return state.mode === 'graph' ? state : { ...state, mode: 'graph' };
      }
      return {
        ...state,
        mode: 'graph',
        workspace: showPane(state.workspace, action.mode),
        paneRequest: { pane: action.mode },
      };
    }
    case 'filterBar':
      return state.filterBar === action.open ? state : { ...state, filterBar: action.open };
    case 'graphSettings':
      return state.graphSettings === action.open ? state : { ...state, graphSettings: action.open };
    case 'tour':
      return state.tour.step === action.step && state.tour.seen
        ? state
        : {
            ...state,
            tour: { step: action.step === null ? null : Math.max(0, action.step), seen: true },
          };
    case 'compareWindow':
      return state.compareWindow.open === action.open
        ? state
        : { ...state, compareWindow: { ...state.compareWindow, open: action.open } };
    case 'compareWindowPos': {
      const { pos } = state.compareWindow;
      if (pos.right === action.pos.right && pos.top === action.pos.top) return state;
      return { ...state, compareWindow: { ...state.compareWindow, pos: action.pos } };
    }
    case 'compareWindowSize':
      return {
        ...state,
        compareWindow: { ...state.compareWindow, size: clampWindowSize(action.size) },
      };
    case 'sizeMode':
      return { ...state, graph: { ...state.graph, sizeMode: action.value } };
    case 'graphLayout':
      return { ...state, graph: { ...state.graph, layout: action.value } };
    case 'graphRows': {
      // Zeile und Spalte nach demselben Merkmal ergäben nur eine Diagonale.
      const cols = state.graph.cols === action.value ? null : state.graph.cols;
      return { ...state, graph: { ...state.graph, rows: action.value, cols } };
    }
    case 'graphCols':
      // Abschnitt nur als Zeile: lange Titel nebeneinander überlappen (Entscheidung 0059).
      if (action.value === SECTION_AXIS) return state;
      return { ...state, graph: { ...state.graph, cols: action.value } };
    case 'graphHints':
      return { ...state, graph: { ...state.graph, showHints: action.value } };
    case 'graphViewport':
      return { ...state, graph: { ...state.graph, viewport: action.viewport } };
    case 'graphFocus':
      return {
        ...state,
        graph: { ...state.graph, focus: state.graph.focus + 1 },
        workspace: showPane(state.workspace, 'graph'),
      };
    case 'tableSort': {
      const { sort } = state.table;
      const dir: 1 | -1 = sort.key === action.key ? ((sort.dir * -1) as 1 | -1) : 1;
      return { ...state, table: { ...state.table, sort: { key: action.key, dir } } };
    }
    case 'tableScope':
      return { ...state, table: { ...state.table, scope: action.scope } };
    case 'tableColumns':
      return { ...state, table: { ...state.table, columns: action.columns } };
    case 'tableToggleSection': {
      const collapsed = new Set(state.table.collapsed);
      if (!collapsed.delete(action.id)) collapsed.add(action.id);
      return { ...state, table: { ...state.table, collapsed } };
    }
    case 'tableCollapse':
      return { ...state, table: { ...state.table, collapsed: new Set(action.ids) } };
    case 'toggleRuleOpen': {
      // Höchstens eine Regel offen: ihre Funde stehen in der Klappkarte daneben.
      const openRules = new Set(state.overview.openRules.has(action.id) ? [] : [action.id]);
      return { ...state, overview: { ...state.overview, openRules } };
    }
    case 'openRule': {
      const openRules = new Set([action.id]);
      return { ...state, overview: { openRules, revealRule: action.id } };
    }
    case 'ruleRevealed':
      if (state.overview.revealRule === null) return state;
      return { ...state, overview: { ...state.overview, revealRule: null } };
    case 'viewScroll':
      if (state.scroll[action.view] === action.top) return state;
      return { ...state, scroll: { ...state.scroll, [action.view]: action.top } };
    case 'swapPanes': {
      const workspace = swapPanes(state.workspace, action.a, action.b);
      return workspace === state.workspace ? state : { ...state, workspace };
    }
    case 'stackPane':
    case 'splitPane':
    case 'edgePane':
    case 'splitSize': {
      const workspace =
        action.type === 'stackPane'
          ? stackPane(state.workspace, action.pane, action.to)
          : action.type === 'splitPane'
            ? splitPane(state.workspace, action.pane, action.target, action.side)
            : action.type === 'edgePane'
              ? edgePane(state.workspace, action.pane, action.side)
              : resizeSplit(state.workspace, action.split, action.sizes);
      return workspace === state.workspace ? state : { ...state, workspace };
    }
    case 'paneFront': {
      const workspace = bringToFront(state.workspace, action.pane);
      return workspace === state.workspace ? state : { ...state, workspace };
    }
    case 'paneClosed':
      if (state.workspace.closed[action.pane] === action.closed) return state;
      return {
        ...state,
        workspace: action.closed
          ? {
              ...state.workspace,
              closed: { ...state.workspace.closed, [action.pane]: true },
            }
          : showPane(state.workspace, action.pane),
      };
    case 'showPane':
      return {
        ...state,
        workspace: showPane(state.workspace, action.pane),
        paneRequest: { pane: action.pane },
      };
    case 'workspaceReset':
      return {
        ...state,
        workspace: INITIAL_WORKSPACE,
        graph: { ...state.graph, viewport: null },
      };
    case 'workspaceRestore':
      return state.workspace === INITIAL_WORKSPACE
        ? { ...state, workspace: action.workspace }
        : state;
    default:
      return state;
  }
}
