// Stichwort an der Positions-Bubble (WP-Q, Schritt 3; Issue #51: „es muss
// durch eine Beschriftung oder Stichworte erkennbar sein, was dahinter
// steckt"). Ein Punkt mit OZ sagt nichts — ein Wort schon.
//
// Die Wortwahl läuft über dieselbe Normalisierung wie die Ähnlichkeit
// (lib/relate/text.ts): kleingeschrieben, Zahlen und Einheiten maskiert,
// Funktionswörter raus. Dadurch stehen im Graphen dieselben Begriffe, nach
// denen die Ansicht „Ähnlichkeit" gruppiert.

import { relateTokens } from '../relate/text';
import type { PositionSummary } from '../../types/lvNode';

/** So viele Wörter vom Anfang kommen in die Auswahl. */
const FENSTER = 6;

/**
 * Merkspeicher an der Position selbst statt an ihrem Text: die Wortwahl kostet
 * rund 7 µs, und beim Ziehen im Graphen stehen hunderte Punkte gleichzeitig auf
 * dem Schirm — jeden Frame neu zu rechnen wäre spürbar. Eine `WeakMap` hält
 * dabei nichts fest: lädt jemand eine andere Datei, verschwinden die Einträge
 * mit ihren Positionen, statt die Texte des alten LV in der Sitzung zu
 * behalten.
 */
const cache = new WeakMap<PositionSummary, string>();

/** Stichwort einer Position; das Ergebnis hängt an ihr, nicht am Modul. */
export function keywordFor(position: PositionSummary): string {
  const known = cache.get(position);
  if (known !== undefined) return known;
  const keyword = pickKeyword(position.shortText);
  cache.set(position, keyword);
  return keyword;
}

/**
 * Die Wortwahl selbst: das **längste** Wort unter den ersten paar — im
 * Deutschen trägt das Kompositum die Aussage („Stahlbetonwand" gegen
 * „liefern"), und es steht fast immer vorn.
 */
export function pickKeyword(shortText: string): string {
  let best = '';
  for (const token of relateTokens(shortText).slice(0, FENSTER)) {
    // Die Maskierungen aus der Normalisierung sind keine Wörter.
    if (token.startsWith('#')) continue;
    if (token.length > best.length) best = token;
  }
  // Ungekürzt: ein Kompositum mitten im Wort abzuschneiden macht es unlesbar.
  // Gekürzt wird erst beim Zeichnen, mit Auslassungszeichen (BubbleNode).
  return best === '' ? '' : capitalize(best);
}

/** Großschreibung wie im Fließtext — die Normalisierung hat sie genommen. */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
