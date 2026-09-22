// Stichwort an der Positions-Bubble (WP-Q, Schritt 3; Issue #51).

import { describe, expect, it } from 'vitest';
import { keywordFor } from '../../src/lib/graph/keywords';

describe('keywordFor', () => {
  it('nimmt das Fachwort statt des Tätigkeitsworts', () => {
    expect(keywordFor('Liefern und Einbauen von Stahlbetonfertigteilen')).toBe(
      'Stahlbetonfertigteilen',
    );
    expect(keywordFor('Kalksandstein-Innenwand d=24 cm herstellen')).toBe('Kalksandstein');
  });

  it('lässt Zahlen, Einheiten und Füllwörter aus', () => {
    // „30 cm" und „der" tragen nichts — sie dürfen nie als Stichwort erscheinen.
    expect(keywordFor('Wand 30 cm')).toBe('Wand');
    // Bei gleicher Länge gewinnt das vordere Wort.
    expect(keywordFor('Die Decke der Halle')).toBe('Decke');
  });

  it('gibt nichts zurück, wenn nichts zu sagen ist', () => {
    expect(keywordFor('')).toBe('');
    expect(keywordFor('5 m²')).toBe('');
  });

  it('antwortet auf denselben Text gleich', () => {
    const text = 'Bewehrungsstahl liefern und verlegen';
    expect(keywordFor(text)).toBe(keywordFor(text));
  });
});
