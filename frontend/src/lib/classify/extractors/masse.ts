// Maße: Zahl + Einheit **mit Kontext**. Ohne Kontext wäre "30 cm" nur eine Zahl —
// erst das Wort davor ("Dicke", "d =") sagt, was gemessen wurde. Deshalb erkennt
// dieser Extraktor nur benannte Maße und nie eine freistehende Zahl.
//
// Dieselben Muster galten bis WP-J im Fallback-Ruleset (`extractMasse`). Sie
// liegen jetzt hier, weil ein Maß in jedem Gewerk dasselbe bedeutet; die
// Rulesets erben sie, statt sie zu wiederholen.

import { collect, tidy, type Hit } from './spans';
import type { Span } from '../types';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/** Längeneinheiten, wie sie in LV-Texten vorkommen. */
const LAENGE_EINHEIT = '(?:mm|cm|dm|m)';
const GEWICHT_EINHEIT = '(?:kg|t|to)';

/** Zahl mit optionaler Nachkommastelle; deutsches Komma ist der Normalfall. */
const ZAHL = '\\d+(?:[.,]\\d+)?';

/**
 * Benanntes Maß: Stichwort, optionales Gleichheits-/Doppelpunktzeichen, Zahl,
 * Einheit. `\s*` statt `\s+` erlaubt "d=30cm" ohne Leerzeichen.
 *
 * Bewusst **ohne** Wortgrenze vor dem Stichwort: deutsche LV-Texte schreiben
 * "Wandstärke 30 cm" und "Plattendicke 24 cm" als Kompositum, eine Wortgrenze
 * würde beides verwerfen.
 */
function named(words: string, einheit: string): RegExp {
  return new RegExp(`(?:${words})\\s*[:=]?\\s*${ZAHL}\\s*${einheit}\\b`, 'gi');
}

/**
 * Kurzform mit Formelzeichen: "d = 30 cm", "h=4m". Das Gleichheits- bzw.
 * Doppelpunktzeichen ist Pflicht — ein einzelnes "d" steckt sonst in jedem
 * zweiten Wort ("wird 30 cm") und erzeugte reihenweise falsche Maße.
 */
function formula(letters: string, einheit: string): RegExp {
  return new RegExp(`\\b(?:${letters})\\s*[:=]\\s*${ZAHL}\\s*${einheit}\\b`, 'gi');
}

/** Nachgestellte Schreibweise: "30 cm dick", "4 m hoch". */
function suffixed(einheit: string, words: string): RegExp {
  return new RegExp(`${ZAHL}\\s*${einheit}\\s*(?:${words})\\b`, 'gi');
}

interface MassRegel {
  key: string;
  einheit: string;
  patterns: RegExp[];
}

const REGELN: readonly MassRegel[] = [
  {
    key: 'dicke',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('dicke|dick|stärke|staerke', LAENGE_EINHEIT),
      formula('d', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, 'dick'),
    ],
  },
  {
    key: 'hoehe',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('höhe|hoehe|hoch', LAENGE_EINHEIT),
      formula('h', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, 'hoch'),
    ],
  },
  {
    key: 'laenge',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('länge|laenge|lang', LAENGE_EINHEIT),
      formula('l', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, 'lang'),
    ],
  },
  {
    key: 'gewicht',
    einheit: GEWICHT_EINHEIT,
    patterns: [
      named('gewicht|schwer', GEWICHT_EINHEIT),
      formula('g|m', GEWICHT_EINHEIT),
      suffixed(GEWICHT_EINHEIT, 'schwer'),
    ],
  },
];

/** Den reinen Messwert aus der Fundstelle lösen: "d = 30 cm" → "30 cm". */
function valueOf(raw: string, einheit: string): string | null {
  const match = new RegExp(`${ZAHL}\\s*${einheit}\\b`, 'i').exec(raw);
  return match === null ? null : tidy(match[0]).toLowerCase();
}

/** Erster Treffer je Regel — ein Bauteil hat eine Dicke, nicht fünf. */
function findMass(text: string, regel: MassRegel): Hit | null {
  let best: Hit | null = null;
  for (const pattern of regel.patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = valueOf(match[0], regel.einheit);
      if (value === null) continue;
      const start = match.index ?? 0;
      if (best === null || start < best.start) {
        best = { value, start, end: start + match[0].length, label: tidy(match[0]) };
      }
    }
  }
  return best;
}

/**
 * Alle benannten Maße als Key→Wert, plus Fundstellen im Langtext.
 *
 * Der Kurztext wird nachrangig durchsucht: "Wand 24 cm dick" steht oft nur dort.
 * Ein Treffer von dort liefert den Wert, aber **keinen** Span — Spans sind per
 * Definition Stellen im Langtext (docs/architecture/data-model.md#spans).
 */
export function extractMasse(
  longText: string,
  shortText = '',
): { attributes: Record<string, string>; spans: Span[] } {
  const attributes: Record<string, string> = {};
  const spans: Span[] = [];
  for (const regel of REGELN) {
    const hit = findMass(longText, regel);
    if (hit !== null) {
      const collected = collect(regel.key, [hit]);
      attributes[regel.key] = collected.values[0];
      spans.push(...collected.spans);
      continue;
    }
    const fromShort = findMass(shortText, regel);
    if (fromShort !== null) attributes[regel.key] = fromShort.value;
  }
  return { attributes, spans };
}

export const masseExtractor: Extractor = {
  id: 'masse',
  extract(context: ExtractorContext): ExtractorResult {
    return extractMasse(context.longText, context.shortText);
  },
};
