// Material und seine Merkmale aus den Materialtabellen
// (docs/decisions/0045-materialwissen-als-tabelle.md). Erst wenn ein Material
// erkannt ist, werden seine Merkmale gesucht: „bewehrt" allein macht noch keine
// Betonposition.
//
// Gesucht wird in Kurz- und Langtext; Fundstellen gibt es nur im Langtext, weil
// Spans Zeichen-Indizes darin sind. Alle Fundstellen tragen den Key `material` —
// eine Farbe im Langtext, der Wert steht im Label.

import { materialKatalog, type Matcher, type MaterialDefinition } from '../material/katalog';
import { tidy } from './spans';
import type { Span } from '../types';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

interface Treffer {
  text: string;
  start: number;
  end: number;
}

function treffer(text: string, matcher: Matcher): Treffer[] {
  const out: Treffer[] = [];
  for (const match of text.matchAll(matcher.pattern)) {
    const found = tidy(match[0]);
    if (matcher.ausser?.test(found) === true) continue;
    const start = match.index ?? 0;
    out.push({ text: found, start, end: start + match[0].length });
  }
  return out;
}

function trefferAller(text: string, matchers: readonly Matcher[]): Treffer[] {
  return matchers.flatMap((matcher) => treffer(text, matcher));
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/** Merkmale und Fundstellen einer Position für eine Liste von Materialien. */
export function extractMaterial(
  context: Pick<ExtractorContext, 'shortText' | 'longText'>,
  materials: readonly MaterialDefinition[],
): ExtractorResult {
  const attributes: Record<string, string[]> = {};
  const spans: Span[] = [];

  for (const material of materials) {
    const inLang = trefferAller(context.longText, material.erkennung);
    if (inLang.length === 0 && trefferAller(context.shortText, material.erkennung).length === 0) {
      continue;
    }
    attributes.material ??= [];
    pushUnique(attributes.material, material.name);

    for (const merkmal of material.merkmale) {
      const values: string[] = [];
      for (const { wert, matcher } of merkmal.werte) {
        const lang = treffer(context.longText, matcher);
        const kurz = treffer(context.shortText, matcher);
        for (const hit of [...kurz, ...lang]) pushUnique(values, wert ?? hit.text);
        for (const hit of lang) {
          const label = `${merkmal.name}: ${wert ?? hit.text}`;
          spans.push({ key: 'material', start: hit.start, end: hit.end, label });
        }
      }
      if (values.length > 0) attributes[merkmal.key] = values;
    }
    // Nach den Merkmalen: bei gleicher Stelle behält mergeSpans den ersten Span,
    // und „Bauweise: Ortbeton" sagt mehr als „Beton".
    for (const hit of inLang) {
      spans.push({ key: 'material', start: hit.start, end: hit.end, label: material.name });
    }
  }
  return { attributes, spans };
}

export const materialExtractor: Extractor = {
  id: 'material',
  extract: (context) => extractMaterial(context, materialKatalog()),
};
