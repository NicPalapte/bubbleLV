// Textausschnitt rund um einen Suchtreffer. Die Tabelle zeigt nur den
// Kurztext; trifft die Suche nur den Langtext, sähe man sonst nicht, warum
// die Zeile überhaupt in der Trefferliste steht (Issue #100).

/** Zeichen links und rechts vom Treffer, bevor gekürzt wird. */
const RADIUS = 40;

/**
 * Ausschnitt aus `text` um das erste Vorkommen von `query` (ohne Groß-/
 * Kleinschreibung), Zeilenumbrüche und `**`-Markierungen geglättet; gekürzte
 * Ränder enden in „…". `null`, wenn die Suche leer ist oder nicht vorkommt.
 */
export function searchSnippet(text: string, query: string, radius = RADIUS): string | null {
  const needle = query.trim().toLowerCase();
  if (needle === '') return null;
  const flat = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const at = flat.toLowerCase().indexOf(needle);
  if (at < 0) return null;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + needle.length + radius);
  const head = start > 0 ? '…' : '';
  const tail = end < flat.length ? '…' : '';
  return `${head}${flat.slice(start, end).trim()}${tail}`;
}
