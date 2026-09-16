// Textaufbereitung für den Ähnlichkeitsvergleich (WP-M, Schritt 1). Geprüft
// wird die Zusage aus dem Plan: Zahlen und Einheiten sind maskiert, Stoppwörter
// fallen weg, und die Schindeln behalten die Nachbarschaft der Wörter.

import { describe, expect, it } from 'vitest';
import { jaccard, relateTokens, shingles } from '../../src/lib/relate/text';

describe('relateTokens', () => {
  it('maskiert Zahlen und Maßeinheiten', () => {
    expect(relateTokens('Wand d = 24 cm')).toEqual(relateTokens('Wand d = 30 cm'));
    expect(relateTokens('Wand d=24cm')).toEqual(relateTokens('Wand d = 24 cm'));
  });

  it('führt m² und m3 auf dieselbe Form zurück', () => {
    expect(relateTokens('Fläche 12 m²')).toEqual(relateTokens('Fläche 8 m2'));
  });

  it('wirft Funktionswörter weg, nicht aber Fachwörter', () => {
    expect(relateTokens('Liefern und Einbauen der Bewehrung')).toEqual([
      'liefern',
      'einbauen',
      'bewehrung',
    ]);
  });

  it('macht aus Text ohne Wörter eine leere Folge', () => {
    expect(relateTokens('   ')).toEqual([]);
    expect(relateTokens('')).toEqual([]);
  });
});

describe('shingles', () => {
  it('bildet Wortpaare in der Reihenfolge des Texts', () => {
    expect([...shingles(['a', 'b', 'c'])]).toEqual(['a b', 'b c']);
  });

  it('nimmt ein einzelnes Wort für sich, statt gar nichts zu liefern', () => {
    expect([...shingles(['beton'])]).toEqual(['beton']);
    expect(shingles([]).size).toBe(0);
  });

  it('unterscheidet gleiche Wörter in anderer Nachbarschaft', () => {
    const wand = shingles(relateTokens('Wand abbrechen und entsorgen'));
    const decke = shingles(relateTokens('Decke abbrechen und entsorgen'));
    expect(jaccard(wand, decke)).toBeLessThan(1);
    expect(jaccard(wand, decke)).toBeGreaterThan(0);
  });
});

describe('jaccard', () => {
  it('ist 1 bei gleichen und 0 bei fremden Mengen', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
  });

  it('zählt Schnitt durch Vereinigung', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3, 10);
  });

  it('ist 0, sobald eine Seite leer ist', () => {
    expect(jaccard(new Set(), new Set(['a']))).toBe(0);
  });
});
