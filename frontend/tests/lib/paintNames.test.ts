// Eigene Namen der Markierfarben (Entscheidung 0063): Regeln, Speicher, Notiz-Datei, CSV.

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { addHighlight, EMPTY_ANNOTATIONS } from '../../src/lib/annotations';
import {
  adoptPaintNames,
  MAX_PAINT_NAME_LENGTH,
  paintName,
  toPaintNames,
  withPaintName,
} from '../../src/lib/paintNames';
import { readPaintNames, savePaintNames } from '../../src/lib/persist/lastLv';
import { notesFileText, parseNotesFile } from '../../src/lib/notesFile';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('Namen der Markierfarben', () => {
  it('kürzt Leerraum, begrenzt die Länge und löscht mit leerem Text', () => {
    let names = withPaintName({}, 'gelb', '  sehr   wichtig ');
    expect(names).toEqual({ gelb: 'sehr wichtig' });
    expect(paintName(names, 'gelb')).toBe('sehr wichtig');
    expect(paintName(names, 'gruen')).toBe('Grün');
    expect(withPaintName(names, 'gelb', 'sehr wichtig')).toBe(names);
    names = withPaintName(names, 'blau', 'x'.repeat(50));
    expect(names.blau).toHaveLength(MAX_PAINT_NAME_LENGTH);
    expect(withPaintName(names, 'gelb', ' ')).toEqual({ blau: names.blau });
  });

  it('liest nur bekannte Farben mit Text', () => {
    expect(toPaintNames({ gelb: 'wichtig', pink: 'x', gruen: 3, lila: '' })).toEqual({
      gelb: 'wichtig',
    });
    expect(toPaintNames(null)).toEqual({});
  });

  it('übernimmt aus einer Notiz-Datei nur Farben ohne eigenen Namen', () => {
    expect(adoptPaintNames({ gelb: 'wichtig' }, { gelb: 'prüfen', gruen: 'Maß' })).toEqual({
      gelb: 'wichtig',
      gruen: 'Maß',
    });
  });

  it('bleibt im Browser gespeichert', async () => {
    expect(await readPaintNames()).toEqual({});
    expect(await savePaintNames({ gruen: 'Maß' })).toBe(true);
    expect(await readPaintNames()).toEqual({ gruen: 'Maß' });
  });

  it('steht in der Notiz-Datei', () => {
    const notizen = addHighlight(EMPTY_ANNOTATIONS, 'p1', {
      paint: 'gruen',
      start: 0,
      text: '12 m',
      at: 1,
    });
    const text = notesFileText(notizen, [], { fileName: 'a.x83', fileId: 'a' }, 0, {
      gruen: 'Maß',
    });
    expect(parseNotesFile(text).farben).toEqual({ gruen: 'Maß' });
    const v2 = parseNotesFile('{"art":"bubble-notizen","version":2,"positionen":[]}');
    expect(v2.farben).toEqual({});
  });
});
