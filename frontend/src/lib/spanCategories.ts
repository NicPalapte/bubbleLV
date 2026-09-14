// Anzeige-Kategorien der Fundstellen (WP-J, Schritt 4). Ein Span trägt den
// Attribut-Key, unter dem er gefunden wurde; hier steht, wie er heißt und welche
// Farbe er im Langtext bekommt.
//
// Die Farben folgen der Scope-Einteilung „Geld · Menge · Risiko · Norm · Frist"
// (docs/scope.md) und kommen aus den Design-Tokens (src/index.css) — keine
// eigenen Hex-Werte, damit ein Themenwechsel sie mitnimmt.

import type { Span } from './classify';

export interface SpanCategory {
  /** Attribut-Key, den die Spans dieser Kategorie tragen. */
  key: string;
  label: string;
  /** Rahmen- und Textfarbe der Markierung (CSS-Variable). */
  color: string;
  /** Flächenfarbe der Markierung (CSS-Variable). */
  background: string;
}

/**
 * Reihenfolge = Anzeigereihenfolge der Schalter. Keys ohne Eintrag werden
 * neutral gezeichnet — ein neues Merkmal verschwindet nicht, nur weil es hier
 * noch nicht steht.
 */
export const SPAN_CATEGORIES: readonly SpanCategory[] = [
  { key: 'normen', label: 'Normen', color: 'var(--blueD)', background: 'var(--blueS)' },
  { key: 'fristen', label: 'Zeitbezug', color: 'var(--amber)', background: 'var(--amberS)' },
  {
    key: 'platzhalter',
    label: 'Offene Stellen',
    color: 'var(--redD)',
    background: 'var(--redS)',
  },
  { key: 'material', label: 'Material', color: 'var(--greenD)', background: 'var(--greenS)' },
  { key: 'verweise', label: 'Verweise', color: 'var(--cyan)', background: 'var(--cyanS)' },
  { key: 'dicke', label: 'Maße', color: 'var(--dim)', background: 'var(--grid)' },
  { key: 'hoehe', label: 'Maße', color: 'var(--dim)', background: 'var(--grid)' },
  { key: 'laenge', label: 'Maße', color: 'var(--dim)', background: 'var(--grid)' },
  { key: 'gewicht', label: 'Maße', color: 'var(--dim)', background: 'var(--grid)' },
];

const NEUTRAL: SpanCategory = {
  key: '',
  label: 'Merkmal',
  color: 'var(--dim)',
  background: 'var(--grid)',
};

const BY_KEY: ReadonlyMap<string, SpanCategory> = new Map(
  SPAN_CATEGORIES.map((category) => [category.key, category]),
);

export function categoryOf(key: string): SpanCategory {
  return BY_KEY.get(key) ?? { ...NEUTRAL, key };
}

/**
 * Die Kategorien, die in diesen Spans tatsächlich vorkommen — in der Reihenfolge
 * von `SPAN_CATEGORIES`, je Anzeigename nur einmal (die vier Maß-Keys teilen
 * sich einen Schalter).
 */
export function presentCategories(spans: readonly Span[]): SpanCategory[] {
  const keys = new Set(spans.map((span) => span.key));
  const out: SpanCategory[] = [];
  const seenLabels = new Set<string>();
  for (const key of keys) {
    const category = categoryOf(key);
    if (seenLabels.has(category.label)) continue;
    seenLabels.add(category.label);
    out.push(category);
  }
  const order = SPAN_CATEGORIES.map((category) => category.label);
  return out.sort((a, b) => {
    const ia = order.indexOf(a.label);
    const ib = order.indexOf(b.label);
    if (ia < 0 && ib < 0) return a.label.localeCompare(b.label, 'de');
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
}

/** Alle Keys, die unter demselben Anzeigenamen laufen — ein Schalter, vier Keys. */
export function keysOfLabel(label: string): string[] {
  return SPAN_CATEGORIES.filter((category) => category.label === label).map(
    (category) => category.key,
  );
}
