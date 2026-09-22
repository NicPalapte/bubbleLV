// Wortweiser Textvergleich für die Ansicht „Vergleich" (WP-N, Schritt 3).
//
// Markiert wird, was **nicht in allen** verglichenen Texten vorkommt. Bewusst
// über die Wortmenge statt über eine längste gemeinsame Teilfolge: die
// Unterschiede zwischen zwei Positionstexten sind im LV fast immer Austausche
// an Ort und Stelle („C25/30" gegen „C30/37", „24 cm" gegen „30 cm"), und die
// Regel gilt unverändert für drei bis fünf Spalten. Eine Teilfolge müsste dafür
// paarweise rechnen und hätte bei mehr als zwei Spalten keine klare Antwort.
//
// Gezählt wird **nicht**, wie oft ein Wort vorkommt: steht „mit" links zweimal
// und rechts dreimal, wäre sonst rechts irgendein „mit" markiert — und zwar
// eines, das links wortgleich danebensteht. Solche Marken sind Rauschen; wer
// zwei Positionen vergleicht, sucht das andere Wort, nicht das häufigere.
//
// Keine Bibliothek: das hier sind vierzig Zeilen, und eine Abhängigkeit für
// einen Wortvergleich wäre schwerer zu rechtfertigen als zu pflegen.
//
// Anders als `relateTokens` (lib/relate/text.ts) wird hier **nicht** maskiert:
// dort sollen „24 cm" und „30 cm" gleich aussehen, hier ist genau das der
// Unterschied, den man sehen will.

/** Ein Stück Text: Wort oder Zwischenraum, mit Urteil über die Gemeinsamkeit. */
export interface DiffPart {
  text: string;
  /** Wort, das in allen Texten vorkommt. Zwischenräume sind immer `true`. */
  common: boolean;
}

/** Vergleichsform eines Worts: Kleinschreibung ohne umschließende Satzzeichen. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/^[^0-9a-zäöüß]+|[^0-9a-zäöüß²³/]+$/g, '');
}

/** Wörter und Zwischenräume, in der Reihenfolge des Texts. */
function split(text: string): string[] {
  return text.split(/(\s+)/).filter((part) => part !== '');
}

function wordsOf(parts: readonly string[]): Set<string> {
  const words = new Set<string>();
  for (const part of parts) {
    if (/^\s+$/.test(part)) continue;
    const word = normalize(part);
    if (word !== '') words.add(word);
  }
  return words;
}

/**
 * Zerlegt jeden Text in Teile und markiert, welche Wörter in **allen** Texten
 * vorkommen. Ein Wort, das jede Spalte führt, bleibt überall unmarkiert — auch
 * wenn es unterschiedlich oft vorkommt.
 */
export function markCommonWords(texts: readonly string[]): DiffPart[][] {
  const parts = texts.map(split);
  if (parts.length === 0) return [];
  if (parts.length === 1) {
    return [parts[0].map((text) => ({ text, common: true }))];
  }

  const perText = parts.map(wordsOf);
  const common = new Set<string>();
  for (const word of perText[0]) {
    if (perText.every((words) => words.has(word))) common.add(word);
  }

  return parts.map((words) =>
    words.map((text) => {
      if (/^\s+$/.test(text)) return { text, common: true };
      const word = normalize(text);
      return { text, common: word === '' || common.has(word) };
    }),
  );
}
