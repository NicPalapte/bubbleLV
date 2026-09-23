// Bau-Stand der App — eine Quelle für alle, die ihn zeigen: die Kopfleiste
// (Issue #71) und der Meldetext (lib/export/issueLink.ts). Stünde der Wert an
// zwei Stellen, könnte der Nutzer etwas anderes lesen, als in seiner Meldung
// landet — und genau daran hängt, ob eine Meldung einzuordnen ist.
//
// Gesetzt wird beides beim Bauen (vite.config.ts). Lokal gibt es keinen
// Commit, dann steht „dev".

declare const __BUILD_ID__: string;
declare const __BUILD_TIME__: string;

/** Kurzer Commit-Stand, in CI aus `GITHUB_SHA`; lokal „dev". */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Bau-Tag als `JJJJ-MM-TT`; leer, wenn der Wert fehlt. */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

/**
 * Bau-Tag deutsch (`TT.MM.JJJJ`). Ohne `Intl`: das Datum kommt als feste
 * Zeichenkette aus dem Build, eine Zeitzone gibt es dabei nicht — `new Date()`
 * könnte hier je nach Zone einen Tag zurückspringen.
 */
export function buildDate(): string {
  const teile = BUILD_TIME.split('-');
  if (teile.length !== 3) return '';
  const [jahr, monat, tag] = teile;
  return `${tag}.${monat}.${jahr}`;
}
