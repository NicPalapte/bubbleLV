import { describe, expect, it } from 'vitest';
import { searchSnippet } from '../../src/lib/searchSnippet';

describe('searchSnippet', () => {
  it('liefert null ohne Suche oder ohne Treffer', () => {
    expect(searchSnippet('Ortbeton C25/30', '')).toBeNull();
    expect(searchSnippet('Ortbeton C25/30', '   ')).toBeNull();
    expect(searchSnippet('Ortbeton C25/30', 'Stahl')).toBeNull();
  });

  it('findet den Treffer ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    expect(searchSnippet('Ortbeton C25/30', 'BETON')).toBe('Ortbeton C25/30');
  });

  it('kürzt lange Texte um den Treffer und markiert die Schnitte', () => {
    const text = `${'a'.repeat(100)} Beton ${'b'.repeat(100)}`;
    const snippet = searchSnippet(text, 'beton', 10);
    expect(snippet).toBe(`…${'a'.repeat(9)} Beton ${'b'.repeat(9)}…`);
  });

  it('glättet Zeilenumbrüche und **-Markierungen', () => {
    expect(searchSnippet('Wand\n\n**Beton** C30/37', 'beton')).toBe('Wand Beton C30/37');
  });
});
