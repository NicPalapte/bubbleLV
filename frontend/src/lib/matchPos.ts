// Einzige Quelle für Filter- und Suchlogik. Tree, Tabelle und Bubble-Graph
// benutzen ausschließlich diese Funktion, damit Sichtbarkeit/Dimmen überall
// identisch entscheidet (docs/architecture/frontend.md).

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

export function hasActiveFilters(filters: Filters): boolean {
  if (filters.menge !== null) return true;
  return Object.values(filters.facets).some((values) => values.size > 0);
}

export function countActiveFilters(filters: Filters): number {
  const facetCount = Object.values(filters.facets).reduce((sum, values) => sum + values.size, 0);
  return facetCount + (filters.menge === null ? 0 : 1);
}

export function isFiltering(filters: Filters, search: string): boolean {
  return hasActiveFilters(filters) || search.trim() !== '';
}

export function matchPos(position: PositionSummary, filters: Filters, search: string): boolean {
  for (const facet of FACETS) {
    const selected = filters.facets[facet.id];
    if (selected === undefined || selected.size === 0) continue;
    const values = facet.get(position);
    if (!values.some((value) => selected.has(value))) return false;
  }

  if (filters.menge !== null) {
    const [low, high] = filters.menge;
    const quantity = position.quantity ?? 0;
    if (quantity < low || quantity > high) return false;
  }

  const query = search.trim().toLowerCase();
  if (query !== '') {
    const beton = attrString(position.attributes, 'beton') ?? '';
    const haystack = [position.shortText, position.oz, beton, position.longText]
      .join('\n')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}
