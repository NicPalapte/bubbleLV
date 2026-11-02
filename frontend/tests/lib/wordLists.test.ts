// Eigene Wortlisten (Entscheidung 0090): Einträge lesen, zu Listen zusammensetzen,
// Kontext für den Auswerter und CSV für den Grundstock.

import { describe, expect, it } from 'vitest';
import { GRUNDSTOCK_LISTS, WISSEN } from '../../src/lib/rules/wissen';
import {
  changedLists,
  cleanWord,
  contextWith,
  listIdOf,
  sameEntry,
  toWordListEntry,
  wordListsCsv,
  wordListsOf,
  type WordListEntry,
} from '../../src/lib/rules/wordLists';

const RISIKO = GRUNDSTOCK_LISTS.get('risiko')?.words ?? [];

describe('Wortlisten', () => {
  it('liest nur brauchbare Einträge', () => {
    expect(
      toWordListEntry({ art: 'wort', liste: 'risiko', wort: '  bauseits  gestellt ' }),
    ).toEqual({ art: 'wort', liste: 'risiko', wort: 'bauseits gestellt' });
    expect(toWordListEntry({ art: 'liste', liste: 'eigene-x', name: 'X' })).toEqual({
      art: 'liste',
      liste: 'eigene-x',
      name: 'X',
    });
    expect(toWordListEntry({ art: 'wort', liste: 'Risiko!', wort: 'a' })).toBeNull();
    expect(toWordListEntry({ art: 'wort', liste: 'risiko', wort: 'a|b' })).toBeNull();
    expect(toWordListEntry({ art: 'liste', liste: 'eigene-x', name: ' ' })).toBeNull();
    expect(toWordListEntry({ art: 'sonst', liste: 'risiko', wort: 'a' })).toBeNull();
    expect(toWordListEntry('wort')).toBeNull();
    expect(cleanWord('')).toBeNull();
    expect(cleanWord('x'.repeat(201))).toBeNull();
  });

  it('vergleicht Einträge nach Art, Liste und Wort', () => {
    expect(
      sameEntry(
        { art: 'wort', liste: 'risiko', wort: 'a' },
        { art: 'aus', liste: 'risiko', wort: 'a' },
      ),
    ).toBe(false);
    expect(
      sameEntry(
        { art: 'liste', liste: 'eigene-a', name: 'A' },
        { art: 'liste', liste: 'eigene-a', name: 'B' },
      ),
    ).toBe(true);
  });

  it('ohne Einträge gilt der Grundstock selbst', () => {
    expect(contextWith([])).toBe(WISSEN);
    expect(changedLists([])).toEqual(new Set());
    expect(wordListsOf([]).every((list) => list.grundstock)).toBe(true);
  });

  it('setzt eigene und abgeschaltete Wörter in die Liste', () => {
    const first = RISIKO[0];
    const entries: WordListEntry[] = [
      { art: 'aus', liste: 'risiko', wort: first },
      { art: 'wort', liste: 'risiko', wort: 'bauseits gestellt' },
      { art: 'liste', liste: 'eigene-wasser', name: 'Wasser' },
      { art: 'wort', liste: 'eigene-wasser', wort: 'grundwasser*' },
    ];
    const lists = wordListsOf(entries);
    const risiko = lists.find((list) => list.id === 'risiko');
    expect(risiko?.off).toEqual([first]);
    expect(risiko?.own).toEqual(['bauseits gestellt']);
    expect(lists.at(-1)).toMatchObject({ id: 'eigene-wasser', name: 'Wasser', grundstock: false });

    const context = contextWith(entries);
    expect(context.listen?.get('risiko')).toEqual([...RISIKO.slice(1), 'bauseits gestellt']);
    expect(context.listen?.get('eigene-wasser')).toEqual(['grundwasser*']);
    expect(context.einheitGruppen).toBe(WISSEN.einheitGruppen);
    expect(changedLists(entries)).toEqual(new Set(['risiko', 'eigene-wasser']));
  });

  it('übergeht abgeschaltete Wörter, die es im Grundstock nicht mehr gibt', () => {
    const lists = wordListsOf([{ art: 'aus', liste: 'risiko', wort: 'gibt es nicht' }]);
    expect(lists.find((list) => list.id === 'risiko')?.off).toEqual([]);
  });

  it('vergibt freie Kennungen für eigene Listen', () => {
    expect(listIdOf('Wasser im Baugrund', new Set())).toBe('eigene-wasser-im-baugrund');
    expect(listIdOf('Größe', new Set(['eigene-groesse']))).toBe('eigene-groesse-2');
    expect(listIdOf('!!!', new Set())).toBe('eigene-liste');
  });

  it('schreibt geänderte und eigene Listen im Format der wortlisten.csv', () => {
    const csv = wordListsCsv([
      { art: 'liste', liste: 'eigene-wasser', name: 'Wasser, Grund' },
      { art: 'wort', liste: 'eigene-wasser', wort: 'grundwasser*' },
      { art: 'wort', liste: 'eigene-wasser', wort: 'schichtenwasser' },
    ]);
    expect(csv).toBe(
      'liste,stichworte,bemerkung\neigene-wasser,grundwasser*|schichtenwasser,"Wasser, Grund"\n',
    );
  });
});
