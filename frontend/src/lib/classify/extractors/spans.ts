// Werkzeuge, mit denen ein Extraktor Werte und Fundstellen in einem Durchgang
// gewinnt. Ohne sie müsste jeder Extraktor zweimal suchen — einmal für den Wert,
// einmal für die Stelle — und beide könnten auseinanderlaufen.

import type { Span } from '../types';

/**
 * Ein Treffer im Langtext: der Wert, der als Attribut gespeichert wird, und die
 * Stelle, an der er steht.
 */
export interface Hit {
  value: string;
  start: number;
  end: number;
  /** Text der Fundstelle; ohne Angabe der gefundene Rohtext. */
  label?: string;
}

/** Whitespace in einem Treffer vereinheitlichen — "DIN  EN\n206" → "DIN EN 206". */
export function tidy(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Alle Treffer eines globalen Musters. `toValue` bestimmt den Attributwert;
 * gibt es `null` zurück, zählt der Treffer nicht.
 */
export function findAll(
  text: string,
  pattern: RegExp,
  toValue: (match: RegExpMatchArray) => string | null,
): Hit[] {
  const hits: Hit[] = [];
  for (const match of text.matchAll(pattern)) {
    const value = toValue(match);
    if (value === null || value === '') continue;
    const start = match.index ?? 0;
    hits.push({ value, start, end: start + match[0].length, label: tidy(match[0]) });
  }
  return hits;
}

/**
 * Treffer zu einem Extraktor-Ergebnis bündeln: die Werte dedupliziert in
 * Fundreihenfolge als Attribut, jede Fundstelle einzeln als Span. Ohne Treffer
 * bleibt das Ergebnis leer — kein Key mit leerem Array.
 */
export function collect(key: string, hits: readonly Hit[]): { values: string[]; spans: Span[] } {
  const values: string[] = [];
  const seen = new Set<string>();
  const spans: Span[] = [];
  for (const hit of hits) {
    if (!seen.has(hit.value)) {
      seen.add(hit.value);
      values.push(hit.value);
    }
    spans.push({ key, start: hit.start, end: hit.end, label: hit.label ?? hit.value });
  }
  return { values, spans };
}

/**
 * Treffer entfernen, die vollständig in einem anderen stecken. "ATV DIN 18331"
 * enthält "DIN 18331" — ohne diesen Schritt stünden beide als eigener Wert in
 * der Facette, obwohl es eine Fundstelle ist. Der längere gewinnt.
 */
export function dropContained(hits: readonly Hit[]): Hit[] {
  return hits.filter(
    (hit) =>
      !hits.some(
        (other) =>
          other !== hit &&
          other.start <= hit.start &&
          other.end >= hit.end &&
          other.end - other.start > hit.end - hit.start,
      ),
  );
}

/**
 * Spans sortieren und Überlappungen entfernen. Zwei Extraktoren können dieselbe
 * Stelle treffen ("DIN EN 206" ist Norm, "30 cm" ist Maß) — beim Zeichnen darf
 * jedes Zeichen aber nur einmal markiert werden. Der frühere, bei Gleichstand
 * längere Treffer gewinnt.
 */
export function mergeSpans(spans: readonly Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  let reachedTo = -1;
  for (const span of sorted) {
    if (span.start < reachedTo) continue;
    out.push(span);
    reachedTo = span.end;
  }
  return out;
}
