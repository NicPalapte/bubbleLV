// CSV für Excel in deutscher Spracheinstellung — gemeinsam für alle CSV-Exporte.

/** Zeichen, mit denen Excel und LibreOffice eine Formel beginnen lassen. */
const FORMELSTART = /^[=+\-@\t\r]/;

/** Eine Zahl, wie der Positions-Export sie schreibt — die darf so bleiben. */
const ZAHL = /^-?\d+(?:,\d+)?$/;

/**
 * Formel-Start entschärfen (CSV-Injection, CWE-1236). Texte stammen aus der
 * geladenen Datei, und die kommt im Vergabeverfahren selten vom Leser selbst:
 * ein Kurztext `=HYPERLINK("…")` würde beim Öffnen der Datei in Excel als
 * Formel ausgeführt. Das führende Apostroph macht daraus wieder Text.
 *
 * Zahlen bleiben unangetastet: ein negativer Einheitspreis („-50") ist eine
 * Zahl und soll in Excel auch als Zahl ankommen.
 */
function entschaerfen(value: string): string {
  return FORMELSTART.test(value) && !ZAHL.test(value) ? `'${value}` : value;
}

/**
 * Ein CSV-Feld. Semikolon als Trennzeichen, weil Excel in deutscher
 * Spracheinstellung nur das als Spaltentrenner liest — mit Komma landet die
 * ganze Zeile in einer Zelle. Zeilenumbrüche im Langtext bleiben erhalten;
 * in Anführungszeichen ist das gültiges CSV.
 */
function feld(roh: string): string {
  const value = entschaerfen(roh);
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Zeilen als CSV-Text; die erste Zeile ist die Kopfzeile. */
export function csvText(zeilen: readonly (readonly string[])[]): string {
  // CRLF: Excel erwartet es, jeder Texteditor kommt damit zurecht.
  return `${zeilen.map((zeile) => zeile.map(feld).join(';')).join('\r\n')}\r\n`;
}
