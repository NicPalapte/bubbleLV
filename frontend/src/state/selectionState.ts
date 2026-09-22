// Auswahlzustand — angewählter Knoten, angewählte Position, Mauszeiger sowie
// der Aufklapp-Zustand, den Baum und Graph teilen (Issue #18).
//
// Der Aufklapp-Zustand steht hier und nicht in `viewState`, weil er zu *allen*
// Ansichten gehört: wer im Baum einen Abschnitt öffnet, findet ihn im Graphen
// offen vor. Ein Ansichtswechsel fasst diesen Zustand nie an.

import { allClusterParents, allExpanded, expandedToDepth } from '../lib/graph/layoutRadial';
import type { LVNode } from '../types/lvNode';

/** Ebenen, die ein frisch geladenes LV offen zeigt (Projekt + Lose). */
const START_DEPTH = 2;
const EMPTY_SET: ReadonlySet<string> = new Set();

export interface SelectionState {
  /** Angewählter Abschnitt bzw. Los — steuert Eigenschaften-Panel und Tabelle. */
  nodeId: string | null;
  positionId: string | null;
  hoveredNodeId: string | null;
  /**
   * Knoten, deren Kinder gezeigt werden — **eine** Quelle für Baum und Graph,
   * damit beide Ansichten nie auseinanderlaufen (Issue #18).
   */
  expanded: ReadonlySet<string>;
  /** Aufgelöste Cluster-Bubbles — reine Graph-Darstellung (Issue #10). */
  openClusters: ReadonlySet<string>;
  /**
   * Positionen im Vergleich (WP-N). Eine **Liste**, keine Menge: die
   * Reihenfolge ist die Reihenfolge der Spalten, und wer zuerst gewählt wurde,
   * steht links. Die Ansicht begrenzt, wie viele davon nebeneinander passen —
   * der Zustand selbst vergisst nichts.
   */
  compare: readonly string[];
}

export type SelectionAction =
  | { type: 'selectNode'; id: string | null }
  | { type: 'selectPosition'; nodeId: string | null; positionId: string | null }
  | { type: 'hover'; id: string | null }
  /** Ohne `open` umschalten, mit `open` gezielt auf- bzw. zuklappen. */
  | { type: 'toggleExpanded'; id: string; open?: boolean }
  | { type: 'expandAll' }
  | { type: 'collapseAll' }
  | { type: 'toggleCluster'; id: string }
  /** Position in den Vergleich nehmen bzw. wieder herausnehmen (WP-N). */
  | { type: 'toggleCompare'; positionId: string }
  /** Mehrere auf einmal in den Vergleich legen — ersetzt die bisherige Auswahl. */
  | { type: 'setCompare'; positionIds: readonly string[] }
  | { type: 'clearCompare' }
  /** Eine Ebene zurück: erst die Position, dann der Knoten (Escape). */
  | { type: 'back' }
  /** Schwebende Auswahlkarte im Graphen schließen (X, Klick daneben, Escape
   *  auf der Karte) — anders als `back` immer komplett, nie nur eine Ebene. */
  | { type: 'closeSelection' };

export const INITIAL_SELECTION_STATE: SelectionState = {
  nodeId: null,
  positionId: null,
  hoveredNodeId: null,
  expanded: EMPTY_SET,
  openClusters: EMPTY_SET,
  compare: [],
};

/** Auswahlzustand für ein frisch geladenes LV: Projekt und Lose offen. */
export function selectionForTree(tree: LVNode): SelectionState {
  return { ...INITIAL_SELECTION_STATE, expanded: expandedToDepth(tree, START_DEPTH) };
}

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
  tree: LVNode | null,
): SelectionState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, nodeId: action.id, positionId: null };
    case 'selectPosition':
      return { ...state, nodeId: action.nodeId, positionId: action.positionId };
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
      if (tree === null) return state;
      // Auch die Sammel-Bubbles gehen auf — sonst zeigte „Alles ausklappen"
      // bei vielen Geschwistern nur eine Handvoll Knoten (Issue #41).
      return { ...state, expanded: allExpanded(tree), openClusters: allClusterParents(tree) };
    case 'collapseAll':
      if (tree === null) return state;
      // Die Wurzel bleibt offen — sonst stünde der Graph auf einer einzigen
      // Bubble und der Baum wäre leer.
      return { ...state, expanded: expandedToDepth(tree, 1), openClusters: EMPTY_SET };
    case 'toggleCompare': {
      const compare = state.compare.includes(action.positionId)
        ? state.compare.filter((id) => id !== action.positionId)
        : [...state.compare, action.positionId];
      return { ...state, compare };
    }
    case 'setCompare':
      return { ...state, compare: [...action.positionIds] };
    case 'clearCompare':
      return { ...state, compare: [] };
    case 'toggleCluster': {
      const openClusters = new Set(state.openClusters);
      if (!openClusters.delete(action.id)) openClusters.add(action.id);
      return { ...state, openClusters };
    }
    case 'back':
      // Der Ansichtsmodus ist eine bewusste, dauerhafte Wahl (Issue #30) —
      // Escape wechselt ihn nicht, sondern nimmt nur die Auswahl zurück.
      if (state.positionId !== null) return { ...state, positionId: null };
      if (state.nodeId !== null) return { ...state, nodeId: null };
      return state;
    case 'closeSelection':
      return { ...state, nodeId: null, positionId: null };
    default:
      return state;
  }
}
