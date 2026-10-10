// Textausschnitt rund um einen Suchtreffer. Die Tabelle zeigt nur den
// Kurztext; trifft die Suche nur den Langtext, sähe man sonst nicht, warum
// die Zeile überhaupt in der Trefferliste steht (Issue #100).

/** Zeichen links und rechts vom Treffer, bevor gekürzt wird. */
const RADIUS = 40;

/**
 * Ausschnitt aus `text` um das erste Vorkommen von `query` (ohne Groß-/
 * Kleinschreibung); gekürzte Ränder enden in „…". Gesucht wird im Rohtext wie
 * in `matchPos`, erst der Ausschnitt wird von Zeilenumbrüchen und
 * `**`-Markierungen befreit — sonst fehlte er, wo die Suche über eine solche
 * Stelle hinweg trifft. `null`, wenn die Suche leer ist oder nicht vorkommt.
 */
export function searchSnippet(text: string, query: string, radius = RADIUS): string | null {
  const needle = query.trim().toLowerCase();
  if (needle === '') return null;
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return null;
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + needle.length + radius);
  const flat = (part: string): string => part.replace(/\*\*/g, '').replace(/\s+/g, ' ');
  const middle = flat(text.slice(start, end)).trim();
  const head = flat(text.slice(0, start)).trim() !== '' ? '…' : '';
  const tail = flat(text.slice(end)).trim() !== '' ? '…' : '';
  return `${head}${middle}${tail}`;
}
