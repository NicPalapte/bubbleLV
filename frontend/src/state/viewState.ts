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
 * Seit dem neuen Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md)
 * steht nur noch der Graph als Fläche da: Überblick und Prüfung sind Reiter im
 * Seitenfenster, die Tabelle schwebt als Fenster darüber. `mode` bleibt
 * deshalb immer `graph` — siehe `setViewMode`.
 */
export type SidePanel = 'overview' | 'check';
export type { GraphLayoutId, SizeModeId };
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

export const DEFAULT_PANEL_SIZE: PanelSize = { width: 380, height: null };

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

/** Ort und Größe des Tabellenfensters über dem Graphen. */
export const TABLE_MIN_WIDTH = 420;
export const TABLE_MIN_HEIGHT = 200;
export const TABLE_MAX_WIDTH = 1600;
export const DEFAULT_TABLE_SIZE: PanelSize = { width: 900, height: 360 };
/**
 * Rechts unten: so bleibt links das Seitenfenster frei (`sideWidth`), und das
 * Dock darunter bleibt sichtbar. Die Positionskarte hängt oben rechts darüber.
 */
export const DEFAULT_TABLE_POS: CardPos = { right: 16, top: 320 };

/** Vergleichsfenster: oben, links neben der Positionskarte. */
export const DEFAULT_COMPARE_POS: CardPos = { right: 412, top: 90 };
export const DEFAULT_COMPARE_SIZE: PanelSize = { width: 640, height: 460 };

/** Dokumentfenster (Entscheidung 0072): neben der Positionskarte, hoch genug für eine Seite. */
export const DEFAULT_DOC_POS: CardPos = { right: 412, top: 16 };
export const DEFAULT_DOC_SIZE: PanelSize = { width: 680, height: 640 };

/** Größe eines Fensters über dem Graphen (Tabelle, Vergleich) in seinen Grenzen. */
export function clampWindowSize(size: PanelSize): PanelSize {
  return {
    width: Math.min(Math.max(size.width, TABLE_MIN_WIDTH), TABLE_MAX_WIDTH),
    height: size.height === null ? null : Math.max(size.height, TABLE_MIN_HEIGHT),
  };
}

export interface TableWindowState {
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

/** Breite des Seitenfensters: Standard wie im Mockup, ziehbar in diesen Grenzen. */
export const SIDE_WIDTH_DEFAULT = 340;
export const SIDE_WIDTH_MIN = 300;
export const SIDE_WIDTH_MAX = 640;

export function clampSideWidth(width: number): number {
  return Math.round(Math.min(SIDE_WIDTH_MAX, Math.max(SIDE_WIDTH_MIN, width)));
}

/**
 * Anordnung der Arbeitsfläche (Entscheidung 0064): `split` teilt sie in feste
 * Bereiche für Graph, Tabelle und Positionskarte, `windows` lässt den Graphen
 * die Fläche füllen und legt Tabelle und Karte als Fenster darüber.
 */
export type WorkspaceMode = 'split' | 'windows';

export interface WorkspaceState extends Arrangement {
  mode: WorkspaceMode;
  /** Im Splitscreen geschlossene Bereiche; das Fenster-Layout hat eigene Schalter. */
  closed: Readonly<Record<PaneId, boolean>>;
}

export const INITIAL_WORKSPACE: WorkspaceState = {
  mode: 'split',
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
  /** Immer `graph` — Überblick und Tabelle liegen darüber, siehe `setViewMode`. */
  mode: ViewMode;
  /** Offener Reiter im Seitenfenster; `null` = zu. */
  side: SidePanel | null;
  /** Filterleiste unter der Kopfleiste aufgeklappt (Issue #154). */
  filterBar: boolean;
  /** Darstellung (Größe, Gliederung) an der Graph-Steuerung aufgeklappt. */
  graphSettings: boolean;
  /** Breite des Seitenfensters; am rechten Rand ziehbar. */
  sideWidth: number;
  /** Geführte Tour: aktueller Schritt (`null` = aus) und ob sie schon angeboten war. */
  tour: TourState;
  tableWindow: TableWindowState;
  /** Vergleichsfenster: dieselbe Mechanik wie die Tabelle. */
  compareWindow: TableWindowState;
  /** Begleitdokument als Fenster (Entscheidung 0072); im Splitscreen ein Bereich. */
  docWindow: TableWindowState;
  graph: GraphViewState;
  table: TableViewState;
  overview: OverviewViewState;
  /** Scrollposition je Ansicht — sie überlebt den Wechsel (WP-L, Abnahme). */
  scroll: Readonly<Record<ViewMode, number>>;
  panelSize: PanelSize;
  cardPos: CardPos;
  workspace: WorkspaceState;
}

export type ViewAction =
  | { type: 'setViewMode'; mode: ViewMode }
  /** Seitenfenster auf einen Reiter öffnen; `null` schließt es. */
  | { type: 'sidePanel'; panel: SidePanel | null }
  | { type: 'filterBar'; open: boolean }
  | { type: 'graphSettings'; open: boolean }
  | { type: 'sideWidth'; width: number }
  /** Tour auf einen Schritt setzen; `null` beendet sie. Start oder Ende zählen als gesehen. */
  | { type: 'tour'; step: number | null }
  | { type: 'tableWindow'; open: boolean }
  | { type: 'tableWindowPos'; pos: CardPos }
  | { type: 'tableWindowSize'; size: PanelSize }
  | { type: 'compareWindow'; open: boolean }
  | { type: 'compareWindowPos'; pos: CardPos }
  | { type: 'compareWindowSize'; size: PanelSize }
  /** Öffnen gilt in beiden Anordnungen: Fenster auf und Bereich im Splitscreen vorn. */
  | { type: 'docWindow'; open: boolean }
  | { type: 'docWindowPos'; pos: CardPos }
  | { type: 'docWindowSize'; size: PanelSize }
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
  /** Info-Panels vergrößern/verkleinern; `height` nur von der Karte genutzt. */
  | { type: 'panelSize'; size: PanelSize }
  /** Schwebende Auswahlkarte verschieben. */
  | { type: 'cardPos'; pos: CardPos }
  /** Splitscreen oder Fenster — fasst Filter, Suche und Auswahl nie an. */
  | { type: 'workspaceMode'; mode: WorkspaceMode }
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
  /** Gewichte einer Teilung; `null` setzt sie zurück. */
  | { type: 'splitSize'; split: string; sizes: readonly number[] | null }
  /** Anordnung wie am Anfang; die Wahl Split/Fenster bleibt. */
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
  side: null,
  filterBar: false,
  graphSettings: false,
  sideWidth: SIDE_WIDTH_DEFAULT,
  tour: { step: null, seen: false },
  tableWindow: { open: false, pos: DEFAULT_TABLE_POS, size: DEFAULT_TABLE_SIZE },
  compareWindow: { open: false, pos: DEFAULT_COMPARE_POS, size: DEFAULT_COMPARE_SIZE },
  docWindow: { open: false, pos: DEFAULT_DOC_POS, size: DEFAULT_DOC_SIZE },
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
  panelSize: DEFAULT_PANEL_SIZE,
  cardPos: DEFAULT_CARD_POS,
  workspace: INITIAL_WORKSPACE,
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
    graph: { ...state.graph, viewport: null },
    tableWindow: {
      ...INITIAL_VIEW_STATE.tableWindow,
      pos: state.tableWindow.pos,
      size: state.tableWindow.size,
    },
    compareWindow: {
      ...INITIAL_VIEW_STATE.compareWindow,
      pos: state.compareWindow.pos,
      size: state.compareWindow.size,
    },
    docWindow: {
      ...INITIAL_VIEW_STATE.docWindow,
      pos: state.docWindow.pos,
      size: state.docWindow.size,
    },
    sideWidth: state.sideWidth,
    tour: { step: null, seen: state.tour.seen },
    panelSize: state.panelSize,
    cardPos: state.cardPos,
    workspace: state.workspace,
  };
}

/** Begrenzt eine Panel-Breite auf das gemeinsame Maß beider Info-Panels. */
export function clampPanelWidth(width: number): number {
  return Math.min(Math.max(width, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH);
}

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'setViewMode': {
      // Bewusst nur Ansichtszustand: Filter, Auswahl und der gemerkte Zustand
      // der anderen Ansichten bleiben unangetastet.
      //
      // Überblick und Tabelle leben über dem Graphen. Wer sie anfordert
      // (Befehle, Sprünge, Links), bekommt den Graphen mit dem passenden Fenster.
      const next =
        action.mode === 'overview'
          ? viewReducer(state, { type: 'sidePanel', panel: 'overview' })
          : action.mode === 'table'
            ? viewReducer(state, { type: 'tableWindow', open: true })
            : state;
      return next.mode === 'graph' ? next : { ...next, mode: 'graph' };
    }
    case 'sidePanel': {
      // Im Splitscreen ist derselbe Reiter ein eigener Bereich (Entscheidung 0070).
      const workspace =
        action.panel === null ? state.workspace : showPane(state.workspace, action.panel);
      return state.side === action.panel && workspace === state.workspace
        ? state
        : { ...state, side: action.panel, workspace };
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
    case 'sideWidth': {
      const width = clampSideWidth(action.width);
      return width === state.sideWidth ? state : { ...state, sideWidth: width };
    }
    case 'tableWindow': {
      // Wer die Tabelle anfordert (Sprung aus der Karte, Link), bekommt sie auch
      // im Splitscreen zu sehen — geöffnet und vorn im Stapel.
      const workspace = action.open ? showPane(state.workspace, 'table') : state.workspace;
      if (state.tableWindow.open === action.open && workspace === state.workspace) return state;
      return { ...state, tableWindow: { ...state.tableWindow, open: action.open }, workspace };
    }
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
    case 'docWindow': {
      const workspace = action.open
        ? showPane(state.workspace, 'doc')
        : {
            ...state.workspace,
            closed: { ...state.workspace.closed, doc: true },
          };
      return { ...state, docWindow: { ...state.docWindow, open: action.open }, workspace };
    }
    case 'docWindowPos': {
      const { pos } = state.docWindow;
      if (pos.right === action.pos.right && pos.top === action.pos.top) return state;
      return { ...state, docWindow: { ...state.docWindow, pos: action.pos } };
    }
    case 'docWindowSize':
      return { ...state, docWindow: { ...state.docWindow, size: clampWindowSize(action.size) } };
    case 'tableWindowPos': {
      // Beim Ziehen kommt jede Mausbewegung hier an; gleiche Lage = kein Render.
      const { pos } = state.tableWindow;
      if (pos.right === action.pos.right && pos.top === action.pos.top) return state;
      return { ...state, tableWindow: { ...state.tableWindow, pos: action.pos } };
    }
    case 'tableWindowSize':
      return {
        ...state,
        tableWindow: {
          ...state.tableWindow,
          size: {
            width: Math.min(Math.max(action.size.width, TABLE_MIN_WIDTH), TABLE_MAX_WIDTH),
            height:
              action.size.height === null ? null : Math.max(action.size.height, TABLE_MIN_HEIGHT),
          },
        },
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
    case 'workspaceMode':
      // Der gemerkte Ausschnitt passt nur zur alten Fläche — der Graph passt neu ein.
      return state.workspace.mode === action.mode
        ? state
        : {
            ...state,
            workspace: { ...state.workspace, mode: action.mode },
            graph: { ...state.graph, viewport: null },
          };
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
        // Bereich und Fenster des Dokuments sind ein Schalter (Entscheidung 0072).
        docWindow:
          action.pane === 'doc' ? { ...state.docWindow, open: !action.closed } : state.docWindow,
        workspace: action.closed
          ? {
              ...state.workspace,
              closed: { ...state.workspace.closed, [action.pane]: true },
            }
          : showPane(state.workspace, action.pane),
      };
    case 'workspaceReset':
      return {
        ...state,
        workspace: { ...INITIAL_WORKSPACE, mode: state.workspace.mode },
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
