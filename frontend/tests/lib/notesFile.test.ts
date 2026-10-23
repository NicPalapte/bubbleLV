// Notiz-Datei sichern und laden (Entscheidungen 0061, 0062): Format, Zuordnung, Zusammenführen.

import { describe, expect, it } from 'vitest';
import {
  addComment,
  addHighlight,
  EMPTY_ANNOTATIONS,
  setImportant,
  setProgress,
} from '../../src/lib/annotations';
import {
  matchNotes,
  mergeNotes,
  NotesFileError,
  notesCount,
  notesFileText,
  parseNotesFile,
  readNotesFile,
  MAX_NOTES_FILE_BYTES,
} from '../../src/lib/notesFile';
import type { LVNode } from '../../src/types/lvNode';

function pos(id: string, oz: string, hash: string, text: string): LVNode {
  return {
    id,
    kind: 'position',
    code: oz,
    children: [],
    position: {
      oz,
      shortText: `Kurztext ${oz}`,
      longText: '',
      unit: 'm3',
      quantity: 12.5,
      unitPrice: null,
      positionType: 'normal',
      attributes: {},
      hashes: { id: hash, oz: `oz-${oz}`, text, menge: 'menge' },
    },
  } as unknown as LVNode;
}

const ALT = [pos('p1', '01.0010', 'h1', 't1'), pos('p2', '01.0020', 'h2', 't2')];
const QUELLE = { fileName: 'rohbau.x83', fileId: 'abc' };

function gesichert(): string {
  const notizen = addComment(
    setImportant(EMPTY_ANNOTATIONS, 'p1', true, 1000),
    'p2',
    'Boden',
    2000,
  );
  return notesFileText(notizen, ALT, QUELLE, Date.UTC(2026, 9, 21));
}

describe('notesFileText und parseNotesFile', () => {
  it('schreibt lesbares JSON und liest es verlustfrei zurück', () => {
    const text = gesichert();
    expect(text).toContain('"art": "bubble-notizen"');
    expect(text).toContain('"kurztext": "Kurztext 01.0010"');
    const file = parseNotesFile(text);
    expect(file.datei).toBe('rohbau.x83');
    expect(file.gesichert).toBe(Date.UTC(2026, 9, 21));
    expect(file.positionen.map((p) => [p.hash, p.text, p.oz, p.fortschritt, p.wichtig])).toEqual([
      ['h1', 't1', '01.0010', null, true],
      ['h2', 't2', '01.0020', null, false],
    ]);
    expect(file.positionen[0].verlauf).toEqual([{ kind: 'important', at: 1000, on: true }]);
    expect(file.positionen[1].verlauf).toEqual([{ kind: 'comment', at: 2000, text: 'Boden' }]);
  });

  it('liest Notiz-Dateien mit drei Markern (Version 1) und deutet sie um', () => {
    const alt = parseNotesFile(
      JSON.stringify({
        art: 'bubble-notizen',
        version: 1,
        positionen: [
          {
            hash: 'h1',
            marker: 'erledigt',
            verlauf: [
              { zeit: '2026-10-20T10:00:00.000Z', marker: 'markiert' },
              { zeit: '2026-10-20T11:00:00.000Z', marker: 'erledigt' },
              { zeit: null, kommentar: 'Boden' },
            ],
          },
          { hash: 'h2', marker: 'wichtig' },
          { hash: 'h3', marker: 'kaputt' },
        ],
      }),
    );
    expect(alt.positionen.map((p) => [p.hash, p.fortschritt, p.wichtig])).toEqual([
      ['h1', 'fertig', false],
      ['h2', null, true],
    ]);
    const zehn = Date.UTC(2026, 9, 20, 10);
    const elf = Date.UTC(2026, 9, 20, 11);
    expect(alt.positionen[0].verlauf).toEqual([
      { kind: 'important', at: zehn, on: true },
      { kind: 'progress', at: elf, progress: 'fertig' },
      { kind: 'important', at: elf, on: false },
      { kind: 'comment', at: 0, text: 'Boden' },
    ]);
  });

  it('nimmt Anstreichungen mit und liest Version 2 ohne sie', () => {
    const notizen = addHighlight(EMPTY_ANNOTATIONS, 'p1', {
      paint: 'orange',
      start: 4,
      text: 'Bewehrung',
      at: Date.UTC(2026, 9, 21),
    });
    const file = parseNotesFile(notesFileText(notizen, ALT, QUELLE, 0));
    expect(file.positionen.map((p) => [p.hash, p.anstreichungen])).toEqual([
      ['h1', [{ paint: 'orange', start: 4, text: 'Bewehrung', at: Date.UTC(2026, 9, 21) }]],
    ]);
    const v2 = parseNotesFile(
      JSON.stringify({
        art: 'bubble-notizen',
        version: 2,
        positionen: [{ hash: 'h1', wichtig: true, verlauf: [] }],
      }),
    );
    expect(v2.positionen[0].anstreichungen).toEqual([]);

    const zusammen = mergeNotes(
      addHighlight(EMPTY_ANNOTATIONS, 'p1', { paint: 'gelb', start: 0, text: 'Beton', at: 1 }),
      matchNotes(file, ALT).same,
    );
    expect(zusammen.highlights.get('p1')?.map((m) => m.text)).toEqual(['Beton', 'Bewehrung']);
    expect(notesCount(zusammen)).toBe(1);
  });

  it('meldet fremde, kaputte und zu neue Dateien verständlich', () => {
    expect(() => parseNotesFile('kein json')).toThrow(NotesFileError);
    expect(() => parseNotesFile('{"art":"etwas"}')).toThrow('keine Notiz-Datei');
    expect(() => parseNotesFile('{"art":"bubble-notizen","version":4,"positionen":[]}')).toThrow(
      'neueren Conocto-Version',
    );
  });
});

describe('readNotesFile', () => {
  it('lehnt zu große Dateien ab, ohne sie zu lesen', async () => {
    const riesig = { size: MAX_NOTES_FILE_BYTES + 1, text: () => Promise.reject(new Error()) };
    await expect(readNotesFile(riesig as unknown as Blob)).rejects.toThrow('zu groß');
  });

  it('liest eine normale Notiz-Datei', async () => {
    const file = await readNotesFile(new Blob([gesichert()]));
    expect(file.positionen).toHaveLength(2);
  });
});

describe('matchNotes', () => {
  const file = parseNotesFile(gesichert());

  it('findet gleiche Positionen über den Positions-Hash', () => {
    const m = matchNotes(file, ALT);
    expect(m.same.map((x) => x.nodeId)).toEqual(['p1', 'p2']);
    expect(m.moved).toHaveLength(0);
  });

  it('findet umnummerierte Positionen über den Text, geänderte über die OZ', () => {
    const neu = [
      pos('n1', '01.0030', 'x1', 't1'), // umnummeriert, Text gleich
      pos('n2', '01.0020', 'x2', 'anders'), // gleiche OZ, Text geändert
    ];
    const m = matchNotes(file, neu);
    expect(m.moved.map((x) => x.nodeId)).toEqual(['n1']);
    expect(m.changed.map((x) => x.nodeId)).toEqual(['n2']);
    expect(m.missing).toHaveLength(0);
  });

  it('ordnet bei mehrdeutigem Text oder doppelter OZ nichts zu', () => {
    const neu = [
      pos('n1', '02.0010', 'x1', 't1'),
      pos('n2', '02.0020', 'x2', 't1'),
      pos('n3', '01.0020', 'x3', 'a'),
      pos('n4', '01.0020', 'x4', 'b'),
    ];
    const m = matchNotes(file, neu);
    expect(m.missing.map((e) => e.hash)).toEqual(['h1', 'h2']);
  });
});

describe('matchNotes: jede Position nur einmal', () => {
  function datei(...eintraege: Array<[string, string, string]>) {
    return parseNotesFile(
      JSON.stringify({
        art: 'bubble-notizen',
        version: 1,
        positionen: eintraege.map(([hash, text, oz]) => ({ hash, text, oz, marker: 'wichtig' })),
      }),
    );
  }

  it('ordnet zwei gleichlautende Einträge nicht derselben Position zu', () => {
    const m = matchNotes(datei(['a', 't', '01'], ['b', 't', '02']), [pos('n', '09', 'x', 't')]);
    expect(m.moved).toHaveLength(0);
    expect(m.missing.map((e) => e.hash)).toEqual(['a', 'b']);
  });

  it('lässt eine schon per Hash vergebene Position nicht noch über den Text zu', () => {
    const m = matchNotes(datei(['x', 't', '01'], ['b', 't', '02']), [pos('n', '09', 'x', 't')]);
    expect(m.same.map((e) => e.entry.hash)).toEqual(['x']);
    expect(m.missing.map((e) => e.hash)).toEqual(['b']);
  });
});

describe('mergeNotes', () => {
  const file = parseNotesFile(gesichert());
  const matches = matchNotes(file, ALT).same;

  it('ergänzt Kommentare, ohne gleiche doppelt anzulegen', () => {
    const vorher = addComment(EMPTY_ANNOTATIONS, 'p2', 'Boden', 2000);
    const nachher = mergeNotes(vorher, matches);
    expect(nachher.log.get('p2')).toEqual([{ kind: 'comment', at: 2000, text: 'Boden' }]);
    expect(nachher.important.has('p1')).toBe(true);
    expect(notesCount(nachher)).toBe(2);
  });

  it('nimmt bei „Wichtig" und beim Fortschritt je den zuletzt gesetzten Stand', () => {
    const neuer = setImportant(
      setImportant(EMPTY_ANNOTATIONS, 'p1', true, 4000),
      'p1',
      false,
      5000,
    );
    expect(mergeNotes(neuer, matches).important.has('p1')).toBe(false);
    let aelter = setImportant(EMPTY_ANNOTATIONS, 'p1', true, 400);
    aelter = setImportant(aelter, 'p1', false, 500);
    aelter = setProgress(aelter, 'p1', 'bearbeitung', 600);
    const nachher = mergeNotes(aelter, matches);
    expect(nachher.important.has('p1')).toBe(true);
    // Die Datei kennt keinen Fortschritt: der eigene bleibt.
    expect(nachher.progress.get('p1')).toBe('bearbeitung');
    expect(nachher.log.get('p1')?.map((e) => e.at)).toEqual([400, 500, 600, 1000]);
  });

  it('lässt die Notizen unverändert, wenn nichts passt', () => {
    expect(mergeNotes(EMPTY_ANNOTATIONS, [])).toBe(EMPTY_ANNOTATIONS);
  });
});
