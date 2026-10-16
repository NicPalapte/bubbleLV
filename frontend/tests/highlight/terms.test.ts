// Gelernte Hervorhebungen (Entscheidung 0053): reine Funktionen.

import { describe, expect, it } from 'vitest';
import {
  applyTerms,
  parseTerms,
  patternOf,
  TABLE_TERMS,
  termsCsv,
  type LearnedTerm,
} from '../../src/lib/highlight/terms';
import type { Span } from '../../src/lib/classify';

const TEXT = 'Ortbeton C30/37, Sichtbetonklasse SB2, Wasserhaltung bauseits.';
const beton: Span = { key: 'material', start: 0, end: 15, label: 'Ortbeton C30/37' };

describe('applyTerms', () => {
  it('ergänzt gelernte Begriffe, ohne Fundstellen der Klassifizierung zu überdecken', () => {
    const terms: LearnedTerm[] = [
      { begriff: 'Sichtbetonklasse SB#', kategorie: 'wichtig' },
      { begriff: 'C#/#', kategorie: 'masse' },
    ];
    const spans = applyTerms(TEXT, [beton], terms);
    expect(spans.map((span) => [span.key, TEXT.slice(span.start, span.end)])).toEqual([
      ['material', 'Ortbeton C30/37'],
      ['wichtig', 'Sichtbetonklasse SB2'],
    ]);
  });

  it('nimmt mit „Nicht hervorheben" eine Fundstelle weg', () => {
    const spans = applyTerms(TEXT, [beton], [{ begriff: 'Ortbeton', kategorie: 'aus' }]);
    expect(spans).toEqual([]);
  });

  it('trifft ohne Groß/klein, nur ganze Wörter', () => {
    const spans = applyTerms(TEXT, [], [{ begriff: 'BAUSEITS', kategorie: 'wichtig' }]);
    expect(spans).toHaveLength(1);
    expect(applyTerms(TEXT, [], [{ begriff: 'bause', kategorie: 'wichtig' }])).toEqual([]);
  });

  it('lässt die Fundstellen ohne Begriffe unverändert', () => {
    expect(applyTerms(TEXT, [beton], [])).toEqual([beton]);
  });
});

describe('Tabelle und CSV', () => {
  it('liest nur bekannte Kategorien und schreibt das Format der Tabelle', () => {
    const csv = termsCsv([
      { begriff: 'SB#', kategorie: 'wichtig' },
      { begriff: 'bauseits; frei', kategorie: 'aus' },
    ]);
    expect(parseTerms(csv)).toEqual([
      { begriff: 'SB#', kategorie: 'wichtig' },
      { begriff: 'bauseits; frei', kategorie: 'aus' },
    ]);
    expect(parseTerms('begriff,kategorie\nx,quatsch\n,material\n')).toEqual([]);
  });

  it('liest die gepflegte Tabelle ohne Fehler', () => {
    expect(Array.isArray(TABLE_TERMS)).toBe(true);
  });

  it('macht aus Zahlen ein Muster', () => {
    expect(patternOf('C30/37')).toBe('C#/#');
    expect(patternOf('Wanddicke 24,5 cm')).toBe('Wanddicke # cm');
    expect(patternOf('bauseits')).toBeNull();
  });
});
