// Registry der gewerkeunabhängigen Extraktoren. Sie laufen **vor** den
// gewerkespezifischen Rulesets (ruleBased.ts); ein Ruleset darf ihre Werte
// überschreiben, aber keinen löschen — deshalb wird hier gemergt und nicht
// ersetzt.
//
// Reihenfolge = Zeichenreihenfolge bei Überlappungen (spans.ts#mergeSpans):
// steht "DIN EN 206" auch in einem Maß-Treffer, gewinnt der zuerst eingetragene
// Extraktor. Normen zuerst, weil eine Normnummer nie ein Maß ist.

import { fristenExtractor } from './fristen';
import { masseExtractor } from './masse';
import { materialExtractor } from './material';
import { normenExtractor } from './normen';
import { platzhalterExtractor } from './platzhalter';
import { mergeSpans } from './spans';
import { verweiseExtractor } from './verweise';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

export const GENERIC_EXTRACTORS: readonly Extractor[] = [
  normenExtractor,
  masseExtractor,
  materialExtractor,
  platzhalterExtractor,
  verweiseExtractor,
  fristenExtractor,
];

/** Alle Extraktoren nacheinander; Attribute gemergt, Spans überschneidungsfrei. */
export function runExtractors(
  context: ExtractorContext,
  extractors: readonly Extractor[] = GENERIC_EXTRACTORS,
): ExtractorResult {
  const attributes: Record<string, unknown> = {};
  const spans = [];
  for (const extractor of extractors) {
    const result = extractor.extract(context);
    Object.assign(attributes, result.attributes);
    spans.push(...result.spans);
  }
  return { attributes, spans: mergeSpans(spans) };
}

export { mergeSpans } from './spans';
export type { Extractor, ExtractorContext, ExtractorResult } from './types';
