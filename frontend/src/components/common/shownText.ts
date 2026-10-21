// Text, wie `Highlighted` ihn anzeigt. Eigenes Modul, damit `Highlighted` und
// die Anstreichungen (Entscheidung 0063) dieselbe Zerlegung nutzen.

import type { Span } from '../../lib/classify';

/** Die zu zeichnenden Fundstellen: sichtbar, im Text liegend, nach `start`. */
export function visibleSpans(
  text: string,
  spans: readonly Span[],
  activeKeys: ReadonlySet<string> | undefined,
): Span[] {
  return spans
    .filter((span) => activeKeys === undefined || activeKeys.has(span.key))
    .filter((span) => span.start >= 0 && span.end <= text.length && span.end > span.start)
    .sort((a, b) => a.start - b.start);
}

const stripStars = (text: string): string => text.replace(/\*\*([^*]+)\*\*/g, '$1');

/**
 * Angezeigter Text: `**…**` ohne Sternchen, aber wie in `Highlighted` je Stück
 * zwischen Fundstellen-Grenzen. Ein `**`-Paar über einer Grenze bleibt stehen.
 * Darauf beziehen sich `Highlight.start` und die Auswahl.
 */
export function shownText(
  text: string,
  spans: readonly Span[] = [],
  activeKeys?: ReadonlySet<string>,
): string {
  let out = '';
  let cursor = 0;
  for (const span of visibleSpans(text, spans, activeKeys)) {
    if (span.start < cursor) continue;
    out +=
      stripStars(text.slice(cursor, span.start)) + stripStars(text.slice(span.start, span.end));
    cursor = span.end;
  }
  return out + stripStars(text.slice(cursor));
}
