// Materialstichworte — gespeist **ausschließlich** aus dem STLB-Bau-Katalog
// (docs/domain/reference/stlb-bau-leistungsbereiche.csv, Spalte `keywords`).
//
// Warum keine eingebaute Wortliste: Baustoffbezeichnungen sind Fachvokabular.
// Eine hier erfundene Liste wäre eine Aussage über die Domäne, die niemand
// gepflegt hat — genau das, was .claude/CLAUDE.md untersagt. Solange die
// `keywords`-Spalte leer ist, liefert dieser Extraktor nichts; das ist der
// dokumentierte Zustand „Referenzdaten fehlen ⇒ Regel inaktiv, kein Fehler",
// und er füllt sich von selbst, sobald der Katalog gepflegt wird.

import { collect, dropContained, tidy, type Hit } from './spans';
import type { StlbLeistungsbereich } from '../stlbCatalog';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stichworte, die eine reine Tätigkeit benennen, sind kein Material.
 * "Betonarbeiten" ist ein Gewerk — es steht schon als `gewerk` in den
 * Attributen und hätte hier nur Rauschen erzeugt.
 */
function isMaterialKeyword(keyword: string): boolean {
  return !keyword.endsWith('arbeiten') && !keyword.endsWith('anlagen');
}

/** Alle Materialstichworte des Katalogs, dedupliziert und längste zuerst. */
export function materialVocabulary(catalog: readonly StlbLeistungsbereich[]): string[] {
  const words = new Set<string>();
  for (const lb of catalog) {
    for (const keyword of lb.keywords) {
      if (isMaterialKeyword(keyword)) words.add(keyword);
    }
  }
  // Längste zuerst: "stahlbeton" soll gewinnen, wo auch "beton" stünde.
  return [...words].sort((a, b) => b.length - a.length);
}

/** Katalog-Stichwort als Anzeigewert: "stahlbeton" → "Stahlbeton". */
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
    const vocabulary = materialVocabulary(context.catalog);
    if (vocabulary.length === 0) return { attributes: {}, spans: [] };
    const { values, spans } = collect('material', findMaterial(context.longText, vocabulary));
    return { attributes: values.length === 0 ? {} : { material: values }, spans };
  },
};
