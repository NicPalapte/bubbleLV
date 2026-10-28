// Schreibweise der Stichworte in den Materialtabellen (docs/setup/materialwissen.md).
// Sie ist für Excel gedacht, nicht für Programmierer:
//   `*`   beliebig viele Buchstaben oder Ziffern  („beton*" trifft „Betonwand")
//   `#`   eine Zahl                               („C#/#" trifft „C30/37")
//   ` `   beliebiger Leerraum, auch Zeilenumbruch
// Alles andere gilt wörtlich, ohne Rücksicht auf Groß-/Kleinschreibung. Ein
// Stichwort trifft nur ganze Wörter: „beton" trifft nicht „Betonstahl".

// Übersetzung der Schreibweise liegt im Kern (packages/core/src/text/stichwort.ts), weil
// auch die Regeln (bubble-rule-v1) sie brauchen. Hier bleibt, was nur die App nutzt.
import { stichwortSource } from '@core';

export { compileStichworte, stichwortQuelle, WORD_CHAR } from '@core';

/** Stichworte einer Zelle, pipe-getrennt; leere Einträge fallen weg. */
export function splitStichworte(cell: string): string[] {
  return cell
    .split('|')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

export interface StichwortTreffer {
  /** Fundstelle mit vereinheitlichtem Leerraum. */
  text: string;
  start: number;
  end: number;
}

/** Alle Fundstellen eines Musters, ohne die, die `ausser` ausschließt. */
export function findeStichworte(
  text: string,
  pattern: RegExp,
  ausser: RegExp | null,
): StichwortTreffer[] {
  const out: StichwortTreffer[] = [];
  for (const match of text.matchAll(pattern)) {
    const found = match[0].replace(/\s+/g, ' ').trim();
    if (ausser?.test(found) === true) continue;
    const start = match.index ?? 0;
    out.push({ text: found, start, end: start + match[0].length });
  }
  return out;
}

/** Wie `compileStichworte`, aber für eine ganze Fundstelle — die Spalte „ausser". */
export function compileAusser(stichworte: readonly string[]): RegExp | null {
  if (stichworte.length === 0) return null;
  return new RegExp(`^(?:${stichworte.map(stichwortSource).join('|')})$`, 'iu');
}
