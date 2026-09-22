// Stichwort an der Positions-Bubble (WP-Q, Schritt 3; Issue #51: „es muss
// durch eine Beschriftung oder Stichworte erkennbar sein, was dahinter
// steckt"). Ein Punkt mit OZ sagt nichts — ein Wort schon.
//
// Die Wortwahl läuft über dieselbe Normalisierung wie die Ähnlichkeit
// (lib/relate/text.ts): kleingeschrieben, Zahlen und Einheiten maskiert,
// Funktionswörter raus. Dadurch stehen im Graphen dieselben Begriffe, nach
// denen die Ansicht „Ähnlichkeit" gruppiert.

import { relateTokens } from '../relate/text';

/** So viele Wörter vom Anfang kommen in die Auswahl. */
const FENSTER = 6;

const cache = new Map<string, string>();

/**
 * Ein Stichwort aus dem Kurztext. Gewählt wird das **längste** Wort unter den
 * ersten paar — im Deutschen trägt das Kompositum die Aussage
 * („Stahlbetonwand" gegen „liefern"), und es steht fast immer vorn.
 *
 * Ergebnisse werden gemerkt: in einem LV wiederholen sich Kurztexte, und die
 * Beschriftung entsteht beim Zeichnen.
 */
export function keywordFor(shortText: string): string {
  const known = cache.get(shortText);
  if (known !== undefined) return known;

  let best = '';
  for (const token of relateTokens(shortText).slice(0, FENSTER)) {
    // Die Maskierungen aus der Normalisierung sind keine Wörter.
    if (token.startsWith('#')) continue;
    if (token.length > best.length) best = token;
  }
  // Ungekürzt: ein Kompositum mitten im Wort abzuschneiden macht es unlesbar.
  // Gekürzt wird erst beim Zeichnen, mit Auslassungszeichen (BubbleNode).
  const keyword = best === '' ? '' : capitalize(best);
  cache.set(shortText, keyword);
  return keyword;
}

/** Großschreibung wie im Fließtext — die Normalisierung hat sie genommen. */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
