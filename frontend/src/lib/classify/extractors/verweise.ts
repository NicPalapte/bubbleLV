// Verweise aus dem Text heraus: auf andere Positionen, auf Anlagen, auf
// Vorbemerkungen, auf Pläne und Gutachten.
//
// Der Wert ist die **Art** des Verweises ("Positionsverweis"), die Fundstelle
// trägt den Wortlaut ("siehe Pos. 01.02.0010"). So bleibt der Wert als Facette
// brauchbar, und im Langtext steht trotzdem, worauf verwiesen wird.
//
// Aufgelöst wird nichts: ob die genannte Position existiert, ist eine Frage für
// den VOB-Check (WP-K), nicht für die Klassifizierung.

import { collect, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

interface VerweisRegel {
  value: string;
  pattern: RegExp;
}

const REGELN: readonly VerweisRegel[] = [
  {
    value: 'Positionsverweis',
    // "siehe Pos. 01.02.0010", "wie Position 1.10", "vgl. Pos 20"
    pattern: /\b(?:siehe|wie|vgl\.?|gemäß|gemaess|analog)\s+(?:pos\.?|position)\s*[\w.\-/]*/gi,
  },
  {
    value: 'Anlage',
    pattern: /\b(?:laut|gemäß|gemaess|siehe|nach)\s+anlage\s*[\w.\-/]*/gi,
  },
  {
    value: 'Vorbemerkung',
    pattern: /\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:vorbemerkung|vorbemerkungen)[\w.\-/]*/gi,
  },
  {
    value: 'Planunterlage',
    pattern:
      /\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:plan|planung|zeichnung|detail|schalplan|bewehrungsplan)[\w.\-/]*/gi,
  },
  {
    value: 'Gutachten',
    pattern:
      /\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:gutachten|bodengutachten|baugrundgutachten)/gi,
  },
  {
    value: 'Leistungsbeschreibung',
    pattern: /\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:leistungsbeschreibung|baubeschreibung)/gi,
  },
];

export function findVerweise(longText: string): Hit[] {
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

export const verweiseExtractor: Extractor = {
  id: 'verweise',
  extract(context: ExtractorContext): ExtractorResult {
    const { values, spans } = collect('verweise', findVerweise(context.longText));
    return { attributes: values.length === 0 ? {} : { verweise: values }, spans };
  },
};
