// Text als Datei herunterladen (WP-P, Schritt 3).
//
// **Kein Request.** Der Blob entsteht im Browser, `URL.createObjectURL` gibt
// eine lokale Adresse, und der Klick auf ein unsichtbares `<a download>` löst
// den Speichern-Dialog aus. Zu keinem Zeitpunkt geht etwas an einen Server —
// die Bedingung aus .claude/CLAUDE.md gilt auch für den Export.
//
// Die Objekt-URL wird sofort wieder freigegeben: sonst hielte der Browser den
// kompletten Text bis zum Reload im Speicher, und bei einem LV mit 10k
// Langtexten sind das mehrere MB je Export.

/**
 * Ein BOM (U+FEFF) vor CSV-Inhalte: ohne ihn liest Excel die Datei als ANSI, und
 * aus „m³" wird „mÂ³". Andere Programme ignorieren die Marke.
 */
const BOM = '\uFEFF';

export type DownloadType = 'csv' | 'markdown';

const MIME: Record<DownloadType, string> = {
  csv: 'text/csv;charset=utf-8',
  markdown: 'text/markdown;charset=utf-8',
};

export function downloadText(fileName: string, text: string, type: DownloadType): void {
  const inhalt = type === 'csv' ? BOM + text : text;
  const url = URL.createObjectURL(new Blob([inhalt], { type: MIME[type] }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  // Ohne das Anhängen löst der Klick in Firefox nichts aus.
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Dateiname aus dem Namen des LV: „angebot.x83" wird zu
 * „angebot-positionen-2026-09-22.csv". Alles, was in Dateinamen Ärger macht,
 * fällt weg — der Name landet im Dateisystem des Nutzers.
 */
export function exportFileName(source: string, teil: string, endung: string): string {
  const basis = source
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    // Führende und schließende Striche: „***.x83" ergäbe sonst „-".
    .replace(/^-+|-+$/g, '');
  const datum = new Date().toISOString().slice(0, 10);
  return `${basis === '' ? 'lv' : basis}-${teil}-${datum}.${endung}`;
}
