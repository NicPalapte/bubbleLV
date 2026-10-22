// Als Material gelernte Begriffe als Werte der Facette „Material" (Entscheidung 0066,
// ändert 0053): was der Langtext grün als Material zeigt, steht auch im Filter.
//
// Läuft im Viewer, nicht in der Klassifizierung: die im Browser gelernten Begriffe
// kennt der Worker nicht, und sie ändern sich ohne neues Laden. Einmal je LV und je
// Änderung der Begriffe — nie im Render einer Ansicht.

import { FACETS } from '../facets';
import { termFound, type LearnedTerm } from '../highlight/terms';
import type { PositionIndex } from './positionIndex';

const MATERIAL_SLOT = FACETS.findIndex((facet) => facet.id === 'material');

/** Nur die Begriffe der Kategorie „Material". */
export function materialTerms(terms: readonly LearnedTerm[]): readonly LearnedTerm[] {
  return terms.filter((term) => term.kategorie === 'material');
}

/**
 * Index mit den gelernten Materialien in der Facette `material`. Ohne Begriffe
 * oder ohne Treffer kommt derselbe Index zurück. Ein Begriff, der als Material
 * schon dasteht (ohne Groß/klein), kommt nicht doppelt.
 */
export function withLearnedMaterials(
  index: PositionIndex,
  terms: readonly LearnedTerm[],
): PositionIndex {
  if (terms.length === 0 || MATERIAL_SLOT < 0) return index;
  let changed = false;
  const facts = index.facts.map((own, slot) => {
    const position = index.positions[slot];
    const text = `${position.shortText}\n${position.longText}`;
    const values = own.facetValues[MATERIAL_SLOT];
    const known = new Set(values.map((value) => value.toLowerCase()));
    const added: string[] = [];
    for (const term of terms) {
      const key = term.begriff.toLowerCase();
      if (known.has(key) || !termFound(text, term.begriff)) continue;
      known.add(key);
      added.push(term.begriff);
    }
    if (added.length === 0) return own;
    changed = true;
    const facetValues = [...own.facetValues];
    facetValues[MATERIAL_SLOT] = [...values, ...added];
    return { ...own, facetValues };
  });
  return changed ? { ...index, facts } : index;
}
