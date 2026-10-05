// Wortweiser Vergleich der Langtexte (WP-N, Schritt 3).

import { describe, expect, it } from 'vitest';
import { markCommonWords } from '../../src/lib/compare/textDiff';

/** Die hervorgehobenen Wörter einer Spalte. */
function unterschiede(parts: { text: string; common: boolean }[]): string[] {
  return parts.filter((part) => !part.common).map((part) => part.text);
}

describe('markCommonWords', () => {
  it('markiert genau die abweichenden Wörter', () => {
    const [links, rechts] = markCommonWords([
      'Wand aus Beton C25/30 herstellen',
      'Wand aus Beton C30/37 herstellen',
    ]);
    expect(unterschiede(links)).toEqual(['C25/30']);
    expect(unterschiede(rechts)).toEqual(['C30/37']);
  });

  it('lässt gleiche Texte ganz unmarkiert', () => {
    const [links, rechts] = markCommonWords(['Beton liefern', 'Beton liefern']);
    expect(unterschiede(links)).toEqual([]);
    expect(unterschiede(rechts)).toEqual([]);
  });

  it('markiert kein Wort, das in allen Spalten vorkommt — auch nicht das häufigere', () => {
    // Sonst stünde rechts eine Marke an einem Wort, das links wortgleich
    // danebensteht. Das ist Rauschen, kein Unterschied.
    const [links, rechts] = markCommonWords(['Beton', 'Beton Beton Beton']);
    expect(unterschiede(links)).toEqual([]);
    expect(unterschiede(rechts)).toEqual([]);
  });

  it('übersieht Groß-/Kleinschreibung und Satzzeichen am Rand', () => {
    const [links, rechts] = markCommonWords(['Beton herstellen.', 'beton herstellen']);
    expect(unterschiede(links)).toEqual([]);
    expect(unterschiede(rechts)).toEqual([]);
  });

  it('behält Zahlen und Maße als Unterschied — anders als der Ähnlichkeitsvergleich', () => {
    const [links] = markCommonWords(['Dicke 24 cm', 'Dicke 30 cm']);
    expect(unterschiede(links)).toEqual(['24']);
  });

  it('vergleicht auch drei Spalten gegeneinander', () => {
    const spalten = markCommonWords(['Wand Beton', 'Wand Stahl', 'Wand Holz']);
    expect(spalten).toHaveLength(3);
    expect(unterschiede(spalten[0])).toEqual(['Beton']);
    expect(unterschiede(spalten[2])).toEqual(['Holz']);
  });

  it('gibt den Text einer einzelnen Spalte unmarkiert zurück', () => {
    const [nur] = markCommonWords(['Alleine steht nichts zur Auswahl']);
    expect(unterschiede(nur)).toEqual([]);
  });

  it('setzt den Text aus den Teilen unverändert wieder zusammen', () => {
    const text = 'Wand   aus Beton\nC25/30 herstellen';
    const [teile] = markCommonWords([text, 'anders']);
    expect(teile.map((part) => part.text).join('')).toBe(text);
  });
});
