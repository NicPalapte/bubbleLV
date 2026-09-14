// Einzige Quelle für Filter- und Suchlogik. Tree, Tabelle und Bubble-Graph
// benutzen ausschließlich diese Funktion, damit Sichtbarkeit/Dimmen überall
// identisch entscheidet (docs/architecture/frontend.md).
//
// Seit WP-I ist die Entscheidung von der Ableitung getrennt: `positionFacts`
// leitet einmal ab, was ein Filterlauf braucht (Facettenwerte, Suchtext,
// Menge), `prepareFilters` bereitet die Filter einmal je Lauf auf, und
// `matchFacts` entscheidet. Der Positions-Index (lib/index/positionIndex.ts)
// hält die Fakten je Position vor, damit bei ~10k Positionen nicht je
// Tastendruck 10k Arrays und 10k `toLowerCase` über den Langtext entstehen.
// `matchPos` bleibt die öffentliche Hülle für Aufrufer ohne Index.

import { attrString } from './attributes';
import { FACETS } from './facets';
import type { PositionSummary } from '../types/lvNode';

export type Range = [number, number];

export interface Filters {
  /** Facetten-Auswahl je Facetten-ID; leere Menge = Facette inaktiv. */
  facets: Record<string, Set<string>>;
  /** Mengenbereich (inklusiv) oder null. */
  menge: Range | null;
}

export const EMPTY_FILTERS: Filters = { facets: {}, menge: null };

/**
 * Vorberechnete Filtergrundlage einer Position — alles, was `matchFacts`
 * braucht, ohne erneut in `attributes` zu greifen oder Text zu normalisieren.
 */
export interface PositionFacts {
  /** Werte je Facette, in der Reihenfolge von `FACETS`. */
  readonly facetValues: ReadonlyArray<readonly string[]>;
  /** Menge; `null` zählt wie bisher als 0. */
  readonly quantity: number;
  /** Kleingeschriebener Suchtext: Kurztext, OZ, Druckfestigkeit, Langtext. */
  readonly haystack: string;
}

/** Aufbereitete Filter für einen Durchlauf — inaktive Facetten fallen weg. */
export interface ActiveFilters {
  /** Nur die tatsächlich einschränkenden Facetten, mit ihrem `FACETS`-Index. */
  readonly facets: ReadonlyArray<{ slot: number; values: ReadonlySet<string> }>;
  readonly menge: Range | null;
  /** Getrimmte, kleingeschriebene Suchanfrage; leer = keine Suche. */
  readonly query: string;
  /** Mindestens eine Facette, ein Mengenbereich oder eine Suche ist gesetzt. */
  readonly filtering: boolean;
}

/** Anzahl gesetzter Einschränkungen — für den Zähler am „Zurücksetzen"-Chip. */
export function countActiveFilters(filters: Filters): number {
  const facetCount = Object.values(filters.facets).reduce((sum, values) => sum + values.size, 0);
  return facetCount + (filters.menge === null ? 0 : 1);
}

export function positionFacts(position: PositionSummary): PositionFacts {
  const beton = attrString(position.attributes, 'beton') ?? '';
  return {
    facetValues: FACETS.map((facet) => facet.get(position)),
    quantity: position.quantity ?? 0,
    haystack: [position.shortText, position.oz, beton, position.longText].join('\n').toLowerCase(),
  };
}

export function prepareFilters(filters: Filters, search: string): ActiveFilters {
  const facets: Array<{ slot: number; values: ReadonlySet<string> }> = [];
  FACETS.forEach((facet, slot) => {
    const values = filters.facets[facet.id];
    if (values !== undefined && values.size > 0) facets.push({ slot, values });
  });
  const query = search.trim().toLowerCase();
  return {
    facets,
    menge: filters.menge,
    query,
    filtering: facets.length > 0 || filters.menge !== null || query !== '',
  };
}

/** Die eine Filterentscheidung — jede Ansicht läuft durch diese Funktion. */
export function matchFacts(facts: PositionFacts, active: ActiveFilters): boolean {
  for (const { slot, values } of active.facets) {
    const candidates = facts.facetValues[slot];
    let hit = false;
    for (const candidate of candidates) {
      if (values.has(candidate)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }

  if (active.menge !== null) {
    const [low, high] = active.menge;
    if (facts.quantity < low || facts.quantity > high) return false;
  }

  if (active.query !== '' && !facts.haystack.includes(active.query)) return false;

  return true;
}

/** Einzelprüfung ohne Index — leitet die Fakten je Aufruf neu ab. */
export function matchPos(position: PositionSummary, filters: Filters, search: string): boolean {
  return matchFacts(positionFacts(position), prepareFilters(filters, search));
}
