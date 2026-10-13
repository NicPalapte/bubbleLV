// Eigene Markierungen und Kommentare (Entscheidung 0047): reine Funktionen.

import { describe, expect, it } from 'vitest';
import {
  annotationAllowList,
  EMPTY_ANNOTATIONS,
  fromStored,
  setNote,
  toggleMark,
  toStored,
} from '../../src/lib/annotations';
import {
  matchNode,
  prepareFilters,
  EMPTY_FILTERS,
  type PositionFacts,
} from '../../src/lib/matchPos';

describe('annotations', () => {
  it('schaltet die Markierung an und wieder aus', () => {
    const an = toggleMark(EMPTY_ANNOTATIONS, 'a');
    expect(an.marked.has('a')).toBe(true);
    expect(toggleMark(an, 'a').marked.has('a')).toBe(false);
    expect(EMPTY_ANNOTATIONS.marked.size).toBe(0);
  });

  it('löscht einen Kommentar, der nur noch Leerraum ist', () => {
    const mit = setNote(EMPTY_ANNOTATIONS, 'a', ' Boden prüfen ');
    expect(mit.notes.get('a')).toBe(' Boden prüfen ');
    expect(setNote(mit, 'a', '  \n').notes.has('a')).toBe(false);
    expect(setNote(mit, 'a', ' Boden prüfen ')).toBe(mit);
  });

  it('filtert markiert, kommentiert oder beides', () => {
    let a = toggleMark(EMPTY_ANNOTATIONS, 'm');
    a = toggleMark(a, 'mk');
    a = setNote(a, 'mk', 'x');
    a = setNote(a, 'k', 'y');
    expect(annotationAllowList(a, { marked: false, commented: false })).toBeNull();
    expect([...(annotationAllowList(a, { marked: true, commented: false }) ?? [])].sort()).toEqual([
      'm',
      'mk',
    ]);
    expect([...(annotationAllowList(a, { marked: false, commented: true }) ?? [])].sort()).toEqual([
      'k',
      'mk',
    ]);
    expect([...(annotationAllowList(a, { marked: true, commented: true }) ?? [])]).toEqual(['mk']);
  });

  it('übersteht den Weg durch den Speicher und verwirft Unbrauchbares', () => {
    const a = setNote(toggleMark(EMPTY_ANNOTATIONS, 'm'), 'k', 'Text');
    expect(fromStored(toStored(a))).toEqual(a);
    expect(fromStored(null)).toBe(EMPTY_ANNOTATIONS);
    expect(fromStored({ marked: ['m', 3], notes: [['k', 'Text'], ['l', ' '], 'kaputt'] })).toEqual(
      a,
    );
  });
});

describe('matchNode', () => {
  const facts: PositionFacts = { facetValues: [], quantity: 1, haystack: 'beton' };

  it('lässt ohne Notiz-Filter alles durch und schränkt mit ihm auf die IDs ein', () => {
    expect(matchNode('a', facts, prepareFilters(EMPTY_FILTERS, ''))).toBe(true);
    const nurB = prepareFilters(EMPTY_FILTERS, '', new Set(['b']));
    expect(nurB.filtering).toBe(true);
    expect(matchNode('a', facts, nurB)).toBe(false);
    expect(matchNode('b', facts, nurB)).toBe(true);
    // Der Notiz-Filter wirkt zusammen mit der Suche, nicht statt ihr.
    expect(matchNode('b', facts, prepareFilters(EMPTY_FILTERS, 'stahl', new Set(['b'])))).toBe(
      false,
    );
  });
});
