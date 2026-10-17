// Eigene Marker und Kommentar-Verlauf (Entscheidungen 0047, 0053): reine Funktionen.

import { describe, expect, it } from 'vitest';
import {
  addComment,
  annotationAllowList,
  commentsOf,
  EMPTY_ANNOTATIONS,
  fromStored,
  hasComment,
  markerCounts,
  rekey,
  removeComment,
  setMarker,
  storageKeys,
  toStored,
} from '../../src/lib/annotations';
import {
  matchNode,
  prepareFilters,
  EMPTY_FILTERS,
  type PositionFacts,
} from '../../src/lib/matchPos';

const ids = (set: ReadonlySet<string> | null): string[] => [...(set ?? [])].sort();

describe('annotations', () => {
  it('setzt höchstens einen Marker und schreibt jeden Wechsel in den Verlauf', () => {
    let a = setMarker(EMPTY_ANNOTATIONS, 'a', 'markiert', 1);
    a = setMarker(a, 'a', 'erledigt', 2);
    expect(a.markers.get('a')).toBe('erledigt');
    expect(setMarker(a, 'a', 'erledigt', 3)).toBe(a);
    a = setMarker(a, 'a', null, 4);
    expect(a.markers.has('a')).toBe(false);
    expect(a.log.get('a')?.map((entry) => entry.at)).toEqual([1, 2, 4]);
    expect(hasComment(a, 'a')).toBe(false);
    expect(EMPTY_ANNOTATIONS.markers.size).toBe(0);
  });

  it('hängt Kommentare an, verwirft Leerraum und löscht nur Kommentare', () => {
    let a = addComment(EMPTY_ANNOTATIONS, 'a', ' Boden prüfen ', 1);
    expect(addComment(a, 'a', '  \n', 2)).toBe(a);
    a = setMarker(a, 'a', 'wichtig', 3);
    a = addComment(a, 'a', 'AG gefragt', 4);
    expect(commentsOf(a, 'a')).toEqual(['Boden prüfen', 'AG gefragt']);
    expect(removeComment(a, 'a', 1)).toBe(a);
    a = removeComment(a, 'a', 0);
    expect(commentsOf(a, 'a')).toEqual(['AG gefragt']);
    a = removeComment(a, 'a', 1);
    expect(hasComment(a, 'a')).toBe(false);
  });

  it('filtert nach Marker, „Nicht erledigt" und Kommentar', () => {
    let a = setMarker(EMPTY_ANNOTATIONS, 'm', 'markiert', 1);
    a = setMarker(a, 'w', 'wichtig', 1);
    a = setMarker(a, 'e', 'erledigt', 1);
    a = addComment(a, 'w', 'x', 1);
    a = addComment(a, 'k', 'y', 1);
    const alle = ['m', 'w', 'e', 'k', 'leer'];
    expect(annotationAllowList(a, { marker: null, commented: false }, alle)).toBeNull();
    expect(ids(annotationAllowList(a, { marker: 'wichtig', commented: false }, []))).toEqual(['w']);
    expect(ids(annotationAllowList(a, { marker: 'offen', commented: false }, alle))).toEqual([
      'k',
      'leer',
      'm',
      'w',
    ]);
    expect(ids(annotationAllowList(a, { marker: null, commented: true }, []))).toEqual(['k', 'w']);
    expect(ids(annotationAllowList(a, { marker: 'offen', commented: true }, alle))).toEqual([
      'k',
      'w',
    ]);
    expect(markerCounts(a)).toEqual({ markiert: 1, wichtig: 1, erledigt: 1 });
  });

  it('übersteht den Weg durch den Speicher und verwirft Unbrauchbares', () => {
    const a = addComment(setMarker(EMPTY_ANNOTATIONS, 'm', 'wichtig', 5), 'k', 'Text', 6);
    expect(fromStored(toStored(a))).toEqual(a);
    expect(fromStored(null)).toBe(EMPTY_ANNOTATIONS);
    expect(
      fromStored({
        v: 2,
        markers: [['m', 'wichtig'], ['x', 'kaputt'], 3],
        log: [
          ['m', [{ kind: 'marker', at: 5, marker: 'wichtig' }]],
          [
            'k',
            [
              { kind: 'comment', at: 6, text: 'Text' },
              { kind: 'comment', text: ' ' },
            ],
          ],
          ['l', 'kaputt'],
        ],
      }),
    ).toEqual(a);
  });

  it('speichert unter dem Positions-Hash und findet beim Laden die Knoten-ID wieder', () => {
    const keys = storageKeys([
      { id: 'position:01', position: { hashes: { id: 'h1' } } },
      { id: 'position:02', position: { hashes: { id: 'h2' } } },
      { id: 'section:01', position: null },
    ] as unknown as Parameters<typeof storageKeys>[0]);
    const a = addComment(setMarker(EMPTY_ANNOTATIONS, 'position:01', 'wichtig', 5), 'alt', 'x', 6);

    const stored = toStored(rekey(a, keys.toHash));
    expect(stored.v).toBe(3);
    expect(stored.markers).toEqual([['h1', 'wichtig']]);
    // Ohne passende Position bleibt der Schlüssel, die Notiz geht nicht verloren.
    expect(stored.log.map(([id]) => id)).toEqual(['h1', 'alt']);
    expect(rekey(fromStored(stored), keys.toNode)).toEqual(a);
  });

  it('findet Notizen aus v0.21 (Knoten-ID) direkt wieder', () => {
    const keys = storageKeys([
      { id: 'position:01', position: { hashes: { id: 'h1' } } },
    ] as unknown as Parameters<typeof storageKeys>[0]);
    const alt = fromStored({ v: 2, markers: [['position:01', 'markiert']], log: [] });
    expect([...rekey(alt, keys.toNode).markers]).toEqual([['position:01', 'markiert']]);
    expect(rekey(EMPTY_ANNOTATIONS, keys.toHash)).toBe(EMPTY_ANNOTATIONS);
  });

  it('übernimmt Markierung und Kommentar aus v0.15', () => {
    const alt = fromStored({ marked: ['m', 3], notes: [['k', 'Text'], ['l', ' '], 'kaputt'] });
    expect([...alt.markers]).toEqual([['m', 'markiert']]);
    expect(alt.log.get('k')).toEqual([{ kind: 'comment', at: 0, text: 'Text' }]);
    expect(alt.log.has('l')).toBe(false);
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
