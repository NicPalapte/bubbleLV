// Filterzustand — Suche, Facetten, Mengenbereich, Umgang mit Nicht-Treffern
// und stummgeschaltete Prüfregeln.
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): dieser Zustand
// liegt bewusst neben `selectionState` und `viewState`, damit ein
// Ansichtswechsel ihn gar nicht erst anfassen kann.

import { NO_ANNOTATION_FILTER, type AnnotationFilter, type MarkerFilter } from '../lib/annotations';
import { EMPTY_FILTERS, type Filters, type Range } from '../lib/matchPos';

/** Nicht-Treffer dämpfen oder ganz ausblenden. */
export type HideMode = 'dim' | 'hide';

const EMPTY_SET: ReadonlySet<string> = new Set();

export interface FilterState {
  search: string;
  filters: Filters;
  hideMode: HideMode;
  /**
   * Abgeschaltete Prüfregeln (WP-K). Abgeschaltet verschwindet eine Regel aus
   * allen Ansichten (docs/domain/vob-pruefungen.md) — deshalb steht sie hier
   * und nicht im Zustand der Ansicht „Prüfung".
   */
  mutedRules: ReadonlySet<string>;
  /**
   * Filter auf eigene Marker und Kommentare (Entscheidungen 0047, 0053). Neben
   * `filters`, weil er nicht aus der Datei kommt und nicht in geteilte Links gehört.
   */
  notes: AnnotationFilter;
}

export type FilterAction =
  | { type: 'search'; value: string }
  | { type: 'setFacet'; facetId: string; values: Set<string> }
  | { type: 'setMenge'; range: Range | null }
  | { type: 'resetFilters' }
  | { type: 'hideMode'; value: HideMode }
  /** Prüfregel stummschalten bzw. wieder zulassen. */
  | { type: 'toggleRule'; id: string }
  | { type: 'toggleCommentFilter' }
  /** Marker-Filter; derselbe Wert noch einmal schaltet ihn aus. */
  | { type: 'toggleMarkerFilter'; value: MarkerFilter };

export const INITIAL_FILTER_STATE: FilterState = {
  search: '',
  filters: EMPTY_FILTERS,
  hideMode: 'dim',
  mutedRules: EMPTY_SET,
  notes: NO_ANNOTATION_FILTER,
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
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
      return { ...state, filters: EMPTY_FILTERS, notes: NO_ANNOTATION_FILTER };
    case 'hideMode':
      return { ...state, hideMode: action.value };
    case 'toggleCommentFilter':
      return { ...state, notes: { ...state.notes, commented: !state.notes.commented } };
    case 'toggleMarkerFilter': {
      const marker = state.notes.marker === action.value ? null : action.value;
      return { ...state, notes: { ...state.notes, marker } };
    }
    case 'toggleRule': {
      const mutedRules = new Set(state.mutedRules);
      if (!mutedRules.delete(action.id)) mutedRules.add(action.id);
      return { ...state, mutedRules };
    }
    default:
      return state;
  }
}

/**
 * Einen einzelnen Facettenwert an- oder abwählen. Treemap, Legende und
 * Einheiten-Liste im Überblick filtern damit, ohne die Mengenlogik der
 * Facetten-Knöpfe zu wiederholen.
 */
export function toggleFacetValue(filters: Filters, facetId: string, value: string): Set<string> {
  const values = new Set(filters.facets[facetId] ?? []);
  if (!values.delete(value)) values.add(value);
  return values;
}
