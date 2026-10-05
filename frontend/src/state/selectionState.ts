// Auswahlzustand — angewählter Knoten, angewählte Position, Mauszeiger.
// Ein Ansichtswechsel fasst diesen Zustand nie an.

export interface SelectionState {
  /** Angewählter Abschnitt bzw. Los — steuert Eigenschaften-Panel und Tabelle. */
  nodeId: string | null;
  positionId: string | null;
  hoveredNodeId: string | null;
  /** Positionen im Vergleichsfenster, in der Reihenfolge des Dazunehmens. */
  compare: readonly string[];
}

/** So viele Positionen passen nebeneinander ins Vergleichsfenster. */
export const MAX_COMPARE = 4;

export type SelectionAction =
  | { type: 'selectNode'; id: string | null }
  | { type: 'selectPosition'; nodeId: string | null; positionId: string | null }
  | { type: 'hover'; id: string | null }
  /** Eine Ebene zurück: erst die Position, dann der Knoten (Escape). */
  | { type: 'back' }
  /** Schwebende Auswahlkarte im Graphen schließen (X, Klick daneben, Escape
   *  auf der Karte) — anders als `back` immer komplett, nie nur eine Ebene. */
  | { type: 'closeSelection' }
  /** Position in den Vergleich nehmen oder wieder heraus; ab MAX_COMPARE bleibt es dabei. */
  | { type: 'toggleCompare'; positionId: string }
  | { type: 'clearCompare' };

export const INITIAL_SELECTION_STATE: SelectionState = {
  nodeId: null,
  positionId: null,
  hoveredNodeId: null,
  compare: [],
};

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, nodeId: action.id, positionId: null };
    case 'selectPosition':
      return { ...state, nodeId: action.nodeId, positionId: action.positionId };
    case 'hover':
      return { ...state, hoveredNodeId: action.id };
    case 'back':
      // Der Ansichtsmodus ist eine bewusste, dauerhafte Wahl (Issue #30) —
      // Escape wechselt ihn nicht, sondern nimmt nur die Auswahl zurück.
      if (state.positionId !== null) return { ...state, positionId: null };
      if (state.nodeId !== null) return { ...state, nodeId: null };
      return state;
    case 'closeSelection':
      return { ...state, nodeId: null, positionId: null };
    case 'toggleCompare':
      if (state.compare.includes(action.positionId)) {
        return { ...state, compare: state.compare.filter((id) => id !== action.positionId) };
      }
      return state.compare.length >= MAX_COMPARE
        ? state
        : { ...state, compare: [...state.compare, action.positionId] };
    case 'clearCompare':
      return state.compare.length === 0 ? state : { ...state, compare: [] };
    default:
      return state;
  }
}
