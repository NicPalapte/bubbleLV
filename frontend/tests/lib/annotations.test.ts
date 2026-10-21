// Eigene Marker und Kommentar-Verlauf (Entscheidungen 0047, 0053, 0062): reine Funktionen.

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
  setImportant,
  setProgress,
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
  it('führt Fortschritt und „Wichtig" getrennt und schreibt jeden Wechsel in den Verlauf', () => {
    let a = setProgress(EMPTY_ANNOTATIONS, 'a', 'bearbeitung', 1);
    a = setImportant(a, 'a', true, 2);
    a = setProgress(a, 'a', 'fertig', 3);
    expect(a.progress.get('a')).toBe('fertig');
    expect(a.important.has('a')).toBe(true);
    expect(setProgress(a, 'a', 'fertig', 4)).toBe(a);
    expect(setImportant(a, 'a', true, 4)).toBe(a);
    a = setProgress(a, 'a', null, 5);
    a = setImportant(a, 'a', false, 6);
    expect(a.progress.has('a')).toBe(false);
    expect(a.important.has('a')).toBe(false);
    expect(a.log.get('a')?.map((entry) => entry.at)).toEqual([1, 2, 3, 5, 6]);
    expect(hasComment(a, 'a')).toBe(false);
    expect(EMPTY_ANNOTATIONS.progress.size + EMPTY_ANNOTATIONS.important.size).toBe(0);
  });

  it('hängt Kommentare an, verwirft Leerraum und löscht nur Kommentare', () => {
    let a = addComment(EMPTY_ANNOTATIONS, 'a', ' Boden prüfen ', 1);
    expect(addComment(a, 'a', '  \n', 2)).toBe(a);
    a = setImportant(a, 'a', true, 3);
    a = addComment(a, 'a', 'AG gefragt', 4);
    expect(commentsOf(a, 'a')).toEqual(['Boden prüfen', 'AG gefragt']);
    expect(removeComment(a, 'a', 1)).toBe(a);
    a = removeComment(a, 'a', 0);
    expect(commentsOf(a, 'a')).toEqual(['AG gefragt']);
    a = removeComment(a, 'a', 1);
    expect(hasComment(a, 'a')).toBe(false);
  });

  it('filtert nach Fortschritt, „Offen", „Wichtig" und Kommentar', () => {
    let a = setProgress(EMPTY_ANNOTATIONS, 'b', 'bearbeitung', 1);
    a = setProgress(a, 'f', 'fertig', 1);
    a = setImportant(a, 'f', true, 1);
    a = setImportant(a, 'w', true, 1);
    a = addComment(a, 'w', 'x', 1);
    a = addComment(a, 'k', 'y', 1);
    const alle = ['b', 'f', 'w', 'k', 'leer'];
    const filter = (
      progress: 'offen' | 'bearbeitung' | 'fertig' | null,
      important = false,
      commented = false,
    ) => annotationAllowList(a, { progress, important, commented }, alle);
    expect(filter(null)).toBeNull();
    expect(ids(filter('fertig'))).toEqual(['f']);
    expect(ids(filter('offen'))).toEqual(['k', 'leer', 'w']);
    expect(ids(filter(null, true))).toEqual(['f', 'w']);
    expect(ids(filter('fertig', true))).toEqual(['f']);
    expect(ids(filter(null, false, true))).toEqual(['k', 'w']);
    expect(ids(filter('offen', true, true))).toEqual(['w']);
    expect(markerCounts(a)).toEqual({ bearbeitung: 1, fertig: 1, wichtig: 2 });
  });

  it('übersteht den Weg durch den Speicher und verwirft Unbrauchbares', () => {
    let a = setProgress(EMPTY_ANNOTATIONS, 'm', 'bearbeitung', 4);
    a = addComment(setImportant(a, 'm', true, 5), 'k', 'Text', 6);
    expect(fromStored(toStored(a))).toEqual(a);
    expect(fromStored(null)).toBe(EMPTY_ANNOTATIONS);
    expect(
      fromStored({
        v: 4,
        progress: [['m', 'bearbeitung'], ['x', 'kaputt'], 3],
        important: ['m', 7],
        log: [
          [
            'm',
            [
              { kind: 'progress', at: 4, progress: 'bearbeitung' },
              { kind: 'important', at: 5, on: true },
              { kind: 'important', at: 5 },
            ],
          ],
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

  it('übernimmt die drei Marker bis v0.25 samt Verlauf', () => {
    const alt = fromStored({
      v: 3,
      markers: [
        ['m', 'markiert'],
        ['w', 'wichtig'],
        ['e', 'erledigt'],
        ['x', 'kaputt'],
      ],
      log: [
        [
          'e',
          [
            { kind: 'marker', at: 1, marker: 'markiert' },
            { kind: 'comment', at: 2, text: 'prüfen' },
            { kind: 'marker', at: 3, marker: 'wichtig' },
            { kind: 'marker', at: 4, marker: 'erledigt' },
          ],
        ],
        [
          'w',
          [
            { kind: 'marker', at: 5, marker: 'erledigt' },
            { kind: 'marker', at: 6, marker: null },
          ],
        ],
      ],
    });
    expect([...alt.progress]).toEqual([['e', 'fertig']]);
    expect([...alt.important].sort()).toEqual(['m', 'w']);
    expect(alt.log.get('e')).toEqual([
      { kind: 'important', at: 1, on: true },
      { kind: 'comment', at: 2, text: 'prüfen' },
      { kind: 'progress', at: 4, progress: 'fertig' },
      { kind: 'important', at: 4, on: false },
    ]);
    expect(alt.log.get('w')).toEqual([
      { kind: 'progress', at: 5, progress: 'fertig' },
      { kind: 'progress', at: 6, progress: null },
    ]);
  });

  it('speichert unter dem Positions-Hash und findet beim Laden die Knoten-ID wieder', () => {
    const keys = storageKeys([
      { id: 'position:01', position: { hashes: { id: 'h1' } } },
      { id: 'position:02', position: { hashes: { id: 'h2' } } },
      { id: 'section:01', position: null },
    ] as unknown as Parameters<typeof storageKeys>[0]);
    let a = setImportant(EMPTY_ANNOTATIONS, 'position:01', true, 5);
    a = addComment(setProgress(a, 'position:02', 'fertig', 5), 'alt', 'x', 6);

    const stored = toStored(rekey(a, keys.toHash));
    expect(stored.v).toBe(4);
    expect(stored.important).toEqual(['h1']);
    expect(stored.progress).toEqual([['h2', 'fertig']]);
    // Ohne passende Position bleibt der Schlüssel, die Notiz geht nicht verloren.
    expect(stored.log.map(([id]) => id)).toEqual(['h1', 'h2', 'alt']);
    expect(rekey(fromStored(stored), keys.toNode)).toEqual(a);
  });

  it('findet Notizen aus v0.21 (Knoten-ID) direkt wieder', () => {
    const keys = storageKeys([
      { id: 'position:01', position: { hashes: { id: 'h1' } } },
    ] as unknown as Parameters<typeof storageKeys>[0]);
    const alt = fromStored({ v: 2, markers: [['position:01', 'markiert']], log: [] });
    expect([...rekey(alt, keys.toNode).important]).toEqual(['position:01']);
    expect(rekey(EMPTY_ANNOTATIONS, keys.toHash)).toBe(EMPTY_ANNOTATIONS);
  });

  it('übernimmt Markierung und Kommentar aus v0.15', () => {
    const alt = fromStored({ marked: ['m', 3], notes: [['k', 'Text'], ['l', ' '], 'kaputt'] });
    expect([...alt.important]).toEqual(['m']);
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
