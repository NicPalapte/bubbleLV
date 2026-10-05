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
import type { GraphLayoutId } from '../lib/graph/layoutMap';
import type { SizeModeId } from '../lib/graph/sizes';

export type ViewMode = 'overview' | 'graph' | 'table';
/**
 * Seit dem neuen Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md)
 * steht nur noch der Graph als Fläche da: Überblick und Prüfung sind Reiter im
 * Seitenfenster, die Tabelle schwebt als Fenster darüber. `mode` bleibt
 * deshalb immer `graph` — siehe `setViewMode`.
 */
export type SidePanel = 'overview' | 'filter' | 'check';
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
  /** Merkmal der Zeilen in „frei" (Facetten-ID). */
  rows: string;
  /** Merkmal der Spalten in „frei"; `null` = keine Spalten. */
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
}

export interface TableViewState {
  sort: { key: string; dir: 1 | -1 };
  scope: TableScope;
  /** `null` = unveränderte Standardspalten; die Tabelle kennt ihre Vorgabe. */
  columns: ColumnConfig | null;
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
  /** Aufgeklappte Regeln — welche Fundlisten offen stehen. */
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

export interface ViewState {
  /** Immer `graph` — Überblick und Tabelle liegen darüber, siehe `setViewMode`. */
  mode: ViewMode;
  /** Offener Reiter im Seitenfenster; `null` = zu. */
  side: SidePanel | null;
  /** Breite des Seitenfensters; am rechten Rand ziehbar. */
  sideWidth: number;
  tableWindow: TableWindowState;
  /** Vergleichsfenster: dieselbe Mechanik wie die Tabelle. */
  compareWindow: TableWindowState;
  graph: GraphViewState;
  table: TableViewState;
  overview: OverviewViewState;
  /** Scrollposition je Ansicht — sie überlebt den Wechsel (WP-L, Abnahme). */
  scroll: Readonly<Record<ViewMode, number>>;
  panelSize: PanelSize;
  cardPos: CardPos;
}

export type ViewAction =
  | { type: 'setViewMode'; mode: ViewMode }
  /** Seitenfenster auf einen Reiter öffnen; `null` schließt es. */
  | { type: 'sidePanel'; panel: SidePanel | null }
  | { type: 'sideWidth'; width: number }
  | { type: 'tableWindow'; open: boolean }
  | { type: 'tableWindowPos'; pos: CardPos }
  | { type: 'tableWindowSize'; size: PanelSize }
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
  | { type: 'tableSort'; key: string }
  | { type: 'tableScope'; scope: TableScope }
  | { type: 'tableColumns'; columns: ColumnConfig | null }
  | { type: 'toggleRuleOpen'; id: string }
  /** Regel gezielt aufklappen — der Sprung aus dem Graphen soll sie offen finden. */
  | { type: 'openRule'; id: string }
  /** Die Ansicht hat die Regel ins Fenster geholt; das Merkzeichen ist verbraucht. */
  | { type: 'ruleRevealed' }
  | { type: 'viewScroll'; view: ViewMode; top: number }
  /** Info-Panels vergrößern/verkleinern; `height` nur von der Karte genutzt. */
  | { type: 'panelSize'; size: PanelSize }
  /** Schwebende Auswahlkarte verschieben. */
  | { type: 'cardPos'; pos: CardPos };

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
  sideWidth: SIDE_WIDTH_DEFAULT,
  tableWindow: { open: false, pos: DEFAULT_TABLE_POS, size: DEFAULT_TABLE_SIZE },
  compareWindow: { open: false, pos: DEFAULT_COMPARE_POS, size: DEFAULT_COMPARE_SIZE },
  // Einstieg ist das LV in seiner Gliederung; „frei" ist der zweite Blick.
  graph: {
    sizeMode: 'quantity',
    layout: 'lv',
    rows: 'einheit',
    cols: null,
    showHints: true,
    viewport: null,
  },
  table: { sort: { key: 'oz', dir: 1 }, scope: 'node', columns: null },
  overview: { openRules: new Set(), revealRule: null },
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
    sideWidth: state.sideWidth,
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
    case 'setViewMode': {
      // Bewusst nur Ansichtszustand: Filter, Auswahl und der gemerkte Zustand
      // der anderen Ansichten bleiben unangetastet.
      //
      // Überblick und Tabelle leben über dem Graphen. Wer sie anfordert
      // (Befehle, Sprünge, Links), bekommt den Graphen mit dem passenden Fenster.
      const next =
        action.mode === 'overview'
          ? state.side === 'overview'
            ? state
            : { ...state, side: 'overview' as const }
          : action.mode === 'table' && !state.tableWindow.open
            ? { ...state, tableWindow: { ...state.tableWindow, open: true } }
            : state;
      return next.mode === 'graph' ? next : { ...next, mode: 'graph' };
    }
    case 'sidePanel':
      return state.side === action.panel ? state : { ...state, side: action.panel };
    case 'sideWidth': {
      const width = clampSideWidth(action.width);
      return width === state.sideWidth ? state : { ...state, sideWidth: width };
    }
    case 'tableWindow':
      return state.tableWindow.open === action.open
        ? state
        : { ...state, tableWindow: { ...state.tableWindow, open: action.open } };
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
      return { ...state, graph: { ...state.graph, cols: action.value } };
    case 'graphHints':
      return { ...state, graph: { ...state.graph, showHints: action.value } };
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
      const openRules = new Set(state.overview.openRules);
      if (!openRules.delete(action.id)) openRules.add(action.id);
      return { ...state, overview: { ...state.overview, openRules } };
    }
    case 'openRule': {
      const openRules = new Set(state.overview.openRules).add(action.id);
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
    default:
      return state;
  }
}
