// Normverweise im Text: DIN, DIN EN, DIN EN ISO, EN, ISO, VOB/C, ATV und die
// ZTV-Reihen des Straßen- und Ingenieurbaus.
//
// Erkannt wird ausschließlich die **Bezeichnung, die dasteht** — es wird nichts
// aufgelöst, ergänzt oder auf Gültigkeit geprüft. "DIN EN 206" heißt hier: diese
// Zeichenfolge steht im Langtext, an dieser Stelle. Ob die Norm einschlägig oder
// zurückgezogen ist, sagt Bubble nicht (docs/domain/README.md).

import { collect, dropContained, findAll, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/**
 * DIN/EN/ISO-Familie inklusive Teilnummer und Ausgabestand:
 * "DIN 1045-2", "DIN EN 206", "DIN EN ISO 9001", "EN 1992-1-1", "ISO 4287".
 * Der führende Wortanfang verhindert Treffer mitten in Wörtern.
 */
const DIN_EN_ISO = /\b(?:DIN\s+)?(?:EN\s+)?(?:ISO\s+)?\d{2,5}(?:-\d+)*\b/g;
const NORM_PREFIX = /\b(?:DIN|EN|ISO)\b/;

/** Vorschriftenwerke ohne Nummer im Namen: "VOB/C", "ATV DIN 18331", "ZTV-ING". */
const REGELWERK =
  /\b(?:VOB\/[ABC]|ATV(?:\s+DIN\s+\d{4,5})?|ZTV[- ][A-Za-zÄÖÜäöüß-]+(?:\s+\d{2,4})?)/g;

/**
 * Ausgabestand hinter der Nummer, z. B. "DIN EN 206:2021-06". Er gehört zur
 * Fundstelle, nicht zum Wert — sonst wäre jede Ausgabe ein eigener Filterwert.
 */
const AUSGABESTAND = /^:\d{4}(?:-\d{2})?/;

/** Nur mit einem Präfix ist eine Zahl eine Norm; "206" allein ist eine Zahl. */
function normValue(match: RegExpMatchArray): string | null {
  const raw = tidy(match[0]);
  return NORM_PREFIX.test(raw) ? raw.toUpperCase() : null;
}

/** Die Fundstelle um einen direkt folgenden Ausgabestand verlängern. */
function withAusgabestand(text: string, hit: Hit): Hit {
  const suffix = AUSGABESTAND.exec(text.slice(hit.end));
  if (suffix === null) return hit;
  const end = hit.end + suffix[0].length;
  return { ...hit, end, label: tidy(text.slice(hit.start, end)) };
}

export function findNormen(longText: string): Hit[] {
  const hits = [
    ...findAll(longText, DIN_EN_ISO, normValue),
    ...findAll(longText, REGELWERK, (match) => tidy(match[0]).toUpperCase()),
  ];
  return dropContained(hits)
    .map((hit) => withAusgabestand(longText, hit))
    .sort((a, b) => a.start - b.start);
}

export const normenExtractor: Extractor = {
  id: 'normen',
  extract(context: ExtractorContext): ExtractorResult {
    const { values, spans } = collect('normen', findNormen(context.longText));
    return { attributes: values.length === 0 ? {} : { normen: values }, spans };
  },
};
