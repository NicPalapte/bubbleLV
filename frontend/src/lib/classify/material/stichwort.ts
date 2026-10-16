// Schreibweise der Stichworte in den Materialtabellen (docs/setup/materialwissen.md).
// Sie ist für Excel gedacht, nicht für Programmierer:
//   `*`   beliebig viele Buchstaben oder Ziffern  („beton*" trifft „Betonwand")
//   `#`   eine Zahl                               („C#/#" trifft „C30/37")
//   ` `   beliebiger Leerraum, auch Zeilenumbruch
// Alles andere gilt wörtlich, ohne Rücksicht auf Groß-/Kleinschreibung. Ein
// Stichwort trifft nur ganze Wörter: „beton" trifft nicht „Betonstahl".

/** Buchstabe oder Ziffer, auch Umlaute — die Wortgrenze der Stichworte. */
export const WORD_CHAR = '[\\p{L}\\p{N}]';

// `**` oder `##` hintereinander zählen wie eines: zwei gleiche Wiederholungen in
// Folge lassen den Regex auf langen Texten ohne Treffer stark zurückspringen.
function toSource(stichwort: string): string {
  let source = '';
  const append = (part: string): void => {
    if (!source.endsWith(part)) source += part;
  };
  for (const char of stichwort.trim()) {
    if (char === '*') append(`${WORD_CHAR}*`);
    else if (char === '#') append('\\d+');
    else if (/\s/.test(char)) {
      append('\\s+');
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

/**
 * Die Stichworte als Alternative ohne Wortgrenzen — für Muster, die der Code um
 * die Stichworte herum baut („Fabrikat:" gefolgt von einer Lücke).
 */
export function stichwortQuelle(stichworte: readonly string[]): string | null {
  if (stichworte.length === 0) return null;
  return [...stichworte]
    .sort((a, b) => b.length - a.length)
    .map(toSource)
    .join('|');
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
  return new RegExp(`^(?:${stichworte.map(toSource).join('|')})$`, 'iu');
}
