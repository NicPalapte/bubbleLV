// Notiz-Datei sichern und laden (Entscheidung 0061): Format, Zuordnung, Zusammenführen.

import { describe, expect, it } from 'vitest';
import { addComment, EMPTY_ANNOTATIONS, setMarker } from '../../src/lib/annotations';
import {
  matchNotes,
  mergeNotes,
  NotesFileError,
  notesCount,
  notesFileText,
  parseNotesFile,
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
    setMarker(EMPTY_ANNOTATIONS, 'p1', 'wichtig', 1000),
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
    expect(file.positionen.map((p) => [p.hash, p.text, p.oz, p.marker])).toEqual([
      ['h1', 't1', '01.0010', 'wichtig'],
      ['h2', 't2', '01.0020', null],
    ]);
    expect(file.positionen[1].verlauf).toEqual([{ kind: 'comment', at: 2000, text: 'Boden' }]);
  });

  it('meldet fremde, kaputte und zu neue Dateien verständlich', () => {
    expect(() => parseNotesFile('kein json')).toThrow(NotesFileError);
    expect(() => parseNotesFile('{"art":"etwas"}')).toThrow('keine Notiz-Datei');
    expect(() => parseNotesFile('{"art":"bubble-notizen","version":2,"positionen":[]}')).toThrow(
      'neueren Bubble-Version',
    );
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

describe('mergeNotes', () => {
  const file = parseNotesFile(gesichert());
  const matches = matchNotes(file, ALT).same;

  it('ergänzt Kommentare, ohne gleiche doppelt anzulegen', () => {
    const vorher = addComment(EMPTY_ANNOTATIONS, 'p2', 'Boden', 2000);
    const nachher = mergeNotes(vorher, matches);
    expect(nachher.log.get('p2')).toEqual([{ kind: 'comment', at: 2000, text: 'Boden' }]);
    expect(nachher.markers.get('p1')).toBe('wichtig');
    expect(notesCount(nachher)).toBe(2);
  });

  it('nimmt beim Marker den zuletzt gesetzten', () => {
    const neuer = setMarker(EMPTY_ANNOTATIONS, 'p1', 'erledigt', 5000);
    expect(mergeNotes(neuer, matches).markers.get('p1')).toBe('erledigt');
    const aelter = setMarker(EMPTY_ANNOTATIONS, 'p1', 'erledigt', 500);
    const nachher = mergeNotes(aelter, matches);
    expect(nachher.markers.get('p1')).toBe('wichtig');
    expect(nachher.log.get('p1')?.map((e) => e.at)).toEqual([500, 1000]);
  });

  it('lässt die Notizen unverändert, wenn nichts passt', () => {
    expect(mergeNotes(EMPTY_ANNOTATIONS, [])).toBe(EMPTY_ANNOTATIONS);
  });
});
