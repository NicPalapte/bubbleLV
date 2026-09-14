// Zeitbezüge: feste Termine und die Umstände, die eine Leistung zeitlich binden
// — Bauzeit, Winterbau, Vorleistungen Dritter, Arbeiten unter Verkehr,
// Nacht- und Wochenendarbeit.
//
// Das ist eine der vier „wichtig"-Kategorien aus dem Scope (Geld · Risiko ·
// Norm · Frist). Der Wert ist die Art des Zeitbezugs, die Fundstelle trägt den
// Wortlaut — ein Termin bleibt damit im Text auffindbar, ohne dass „14.05.2026"
// als eigener Filterwert die Facette zumüllt.
//
// Bewertet wird nichts: dass eine Frist knapp oder ein Winterbau teuer ist, sagt
// Bubble nicht.

import { collect, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

interface FristRegel {
  value: string;
  pattern: RegExp;
}

const REGELN: readonly FristRegel[] = [
  {
    value: 'Termin',
    // "14.05.2026", "14.5.26", "KW 14", "KW14/2026", "2. Quartal 2026", "Q2/2026"
    pattern:
      /\b(?:\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|kw\s?\d{1,2}(?:\/\d{2,4})?|q[1-4]\/\d{2,4}|[1-4]\.\s?quartal\s+\d{4})\b/gi,
  },
  {
    value: 'Bauzeit',
    pattern:
      /\b(?:bauzeit|bauzeitenplan|ausführungszeitraum|ausfuehrungszeitraum|fertigstellung(?:stermin)?|zwischentermin|vertragsfrist|einzelfrist)\w*/gi,
  },
  {
    value: 'Winterbau',
    pattern:
      /\b(?:winterbau|winterbaumaßnahm\w*|winterbaumassnahm\w*|frostperiode|winterperiode)/gi,
  },
  {
    value: 'Vorleistung',
    pattern: /\b(?:vorleistung\w*|vorgewerk\w*|nach\s+fertigstellung\s+der\s+vorleistung\w*)/gi,
  },
  {
    value: 'Arbeiten unter Verkehr',
    pattern:
      /\b(?:unter\s+(?:fließendem\s+|fliessendem\s+|rollendem\s+)?verkehr|bei\s+laufendem\s+betrieb|unter\s+betrieb)/gi,
  },
  {
    value: 'Nacht- und Wochenendarbeit',
    pattern: /\b(?:nachtarbeit|nachtschicht|wochenendarbeit|sonntagsarbeit|feiertagsarbeit)\w*/gi,
  },
  {
    value: 'Bauablauf',
    pattern: /\b(?:bauabschnitt\w*|bauphase\w*|taktplan\w*|sperrpause\w*)/gi,
  },
];

export function findFristen(longText: string): Hit[] {
  const hits: Hit[] = [];
  for (const regel of REGELN) {
    for (const match of longText.matchAll(regel.pattern)) {
      const start = match.index ?? 0;
      hits.push({
        value: regel.value,
        start,
        end: start + match[0].length,
        label: tidy(match[0]),
      });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

export const fristenExtractor: Extractor = {
  id: 'fristen',
  extract(context: ExtractorContext): ExtractorResult {
    const { values, spans } = collect('fristen', findFristen(context.longText));
    return { attributes: values.length === 0 ? {} : { fristen: values }, spans };
  },
};
