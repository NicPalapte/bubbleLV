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

/** Alle Vorkommen von `needle` (schon klein) in `text`, auch überlappende. */
export function hitsInPage(text: string, needle: string, page: number): DocHit[] {
  if (needle === '') return [];
  const lower = text.toLowerCase();
  const out: DocHit[] = [];
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, at + 1)) {
    out.push({ page, start: at, text: text.slice(at, at + needle.length) });
  }
  return out;
}
