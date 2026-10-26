// Die eine Suche auch in Begleitdokumenten (Entscheidung 0077): derselbe Begriff wie in
// der Suchleiste, als zusammenhängender Text ohne Groß/klein gesucht. Keine Deutung,
// nur Fundstellen.

/** Mindestlänge — ein Zeichen fände jede Seite. */
export const DOC_SEARCH_MIN = 2;

/** Fundstelle auf einer Seite (ab 1); `start` zählt im Seitentext wie die Textebene. */
export interface DocHit {
  readonly page: number;
  readonly start: number;
  readonly text: string;
}

/** Suchbegriff fürs Dokument: klein, Leerraum zusammengefasst; leer, wenn zu kurz. */
export function docNeedleOf(search: string): string {
  const needle = search.replace(/\s+/g, ' ').trim().toLowerCase();
  return needle.length >= DOC_SEARCH_MIN ? needle : '';
}

/** Text ohne Leerraum, klein, dazu für jedes Zeichen seine Stelle im Original. */
function squeeze(text: string): { flat: string; at: number[] } {
  let flat = '';
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/\s/.test(char)) continue;
    // `toLowerCase` kann ein Zeichen verlängern (z. B. „İ“); jede Hälfte zeigt aufs Original.
    for (const part of char.toLowerCase()) {
      flat += part;
      at.push(i);
    }
  }
  return { flat, at };
}

/**
 * Alle Vorkommen von `needle` (aus `docNeedleOf`) in `text`, auch überlappende.
 * Leerraum zählt nicht: PDF.js liefert den Seitentext in Stücken, zwischen denen ein
 * Leerzeichen oder Zeilenumbruch fehlen oder doppelt stehen kann. Lage und Text der
 * Treffer beziehen sich aufs Original, wie die Textebene es braucht.
 */
export function hitsInPage(text: string, needle: string, page: number): DocHit[] {
  const wanted = needle.replace(/\s+/g, '');
  if (wanted === '') return [];
  const { flat, at } = squeeze(text);
  const out: DocHit[] = [];
  for (let i = flat.indexOf(wanted); i >= 0; i = flat.indexOf(wanted, i + 1)) {
    const start = at[i];
    const end = at[i + wanted.length - 1] + 1;
    out.push({ page, start, text: text.slice(start, end) });
  }
  return out;
}
