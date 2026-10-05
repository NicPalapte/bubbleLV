// Materialstichworte — gespeist **ausschließlich** aus der Mappingtabelle
// (docs/domain/reference/zuordnung.csv, Dimension `material`), getrennt von den
// Leistungsbereichen (docs/decisions/0032).
//
// Warum keine eingebaute Wortliste: Baustoffbezeichnungen sind Fachvokabular.
// Eine hier erfundene Liste wäre eine Aussage über die Domäne, die niemand
// gepflegt hat — genau das, was .claude/CLAUDE.md untersagt. Solange die Tabelle
// keine Zeilen für `material` führt, liefert dieser Extraktor nichts; das ist der
// dokumentierte Zustand „Referenzdaten fehlen ⇒ Regel inaktiv, kein Fehler",
// und er füllt sich von selbst, sobald die Tabelle gepflegt wird.

import { collect, dropContained, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Stichwort aus der Tabelle als Anzeigewert: "stahlbeton" → "Stahlbeton". */
function asValue(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export function findMaterial(longText: string, vocabulary: readonly string[]): Hit[] {
  const hits: Hit[] = [];
  for (const word of vocabulary) {
    // Kompositum-freundlich wie überall in der Klassifizierung (text.ts):
    // "Stahlbetonwand" soll auf "stahlbeton" anschlagen.
    for (const match of longText.matchAll(new RegExp(escapeRegExp(word), 'gi'))) {
      const start = match.index ?? 0;
      hits.push({
        value: asValue(word),
        start,
        end: start + match[0].length,
        label: tidy(match[0]),
      });
    }
  }
  // "stahlbeton" und "beton" treffen dieselbe Stelle — nur das längere zählt.
  return dropContained(hits).sort((a, b) => a.start - b.start);
}

export const materialExtractor: Extractor = {
  id: 'material',
  extract(context: ExtractorContext): ExtractorResult {
    const vocabulary = context.mapping.vocabulary('material');
    if (vocabulary.length === 0) return { attributes: {}, spans: [] };
    const { values, spans } = collect('material', findMaterial(context.longText, vocabulary));
    return { attributes: values.length === 0 ? {} : { material: values }, spans };
  },
};
