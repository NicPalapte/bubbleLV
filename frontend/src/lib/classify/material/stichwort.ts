// Schreibweise der Stichworte in den Materialtabellen (docs/setup/materialwissen.md).
// Sie ist für Excel gedacht, nicht für Programmierer:
//   `*`   beliebig viele Buchstaben oder Ziffern  („beton*" trifft „Betonwand")
//   `#`   eine Zahl                               („C#/#" trifft „C30/37")
//   ` `   beliebiger Leerraum, auch Zeilenumbruch
// Alles andere gilt wörtlich, ohne Rücksicht auf Groß-/Kleinschreibung. Ein
// Stichwort trifft nur ganze Wörter: „beton" trifft nicht „Betonstahl".

/** Buchstabe oder Ziffer, auch Umlaute — die Wortgrenze der Stichworte. */
const WORD_CHAR = '[\\p{L}\\p{N}]';

function toSource(stichwort: string): string {
  let source = '';
  for (const char of stichwort.trim()) {
    if (char === '*') source += `${WORD_CHAR}*`;
    else if (char === '#') source += '\\d+';
    else if (/\s/.test(char)) {
      if (!source.endsWith('\\s+')) source += '\\s+';
    }
    // Mit dem Flag `u` darf nur ein Syntaxzeichen escapt werden — „\-" wäre ein Fehler.
    else source += char.replace(/[.+?^${}()|[\]\\/]/g, '\\$&');
  }
  return source;
}

/** Stichworte einer Zelle, pipe-getrennt; leere Einträge fallen weg. */
export function splitStichworte(cell: string): string[] {
  return cell
    .split('|')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Ein Suchmuster aus allen Stichworten einer Zelle. Längere Stichworte stehen
 * vorn, damit „stahlbeton*" vor „beton*" greift und die ganze Fundstelle trägt.
 * `null`, wenn die Zelle leer ist.
 */
export function compileStichworte(stichworte: readonly string[]): RegExp | null {
  if (stichworte.length === 0) return null;
  const sources = [...stichworte].sort((a, b) => b.length - a.length).map(toSource);
  return new RegExp(`(?<!${WORD_CHAR})(?:${sources.join('|')})(?!${WORD_CHAR})`, 'giu');
}

/** Wie `compileStichworte`, aber für eine ganze Fundstelle — die Spalte „ausser". */
export function compileAusser(stichworte: readonly string[]): RegExp | null {
  if (stichworte.length === 0) return null;
  return new RegExp(`^(?:${stichworte.map(toSource).join('|')})$`, 'iu');
}
