// Übernommene und abgelehnte Vorschläge im Begleitdokument (Entscheidung 0080):
// Herkunft je Verknüpfung, Ablehnungen, Speicher und Notiz-Datei. Texte erfunden.

import { describe, expect, it } from 'vitest';
import {
  EMPTY_ANNOTATIONS,
  fromStored,
  rekey,
  storageKeys,
  toStored,
} from '../../src/lib/annotations';
import {
  EMPTY_DOC_NOTES,
  isRejected,
  linkDocMark,
  paintDocMark,
  pendingSuggestions,
  rejectSuggestion,
  showSuggestions,
  shownSuggestions,
  unlinkDocMark,
  type DocSpot,
} from '../../src/lib/docs/docNotes';
import type { DocSuggestion } from '../../src/lib/docs/docSuggest';
import { matchNotes, mergeNotes, notesFileText, parseNotesFile } from '../../src/lib/notesFile';
import type { LVNode } from '../../src/types/lvNode';

const SPOT: DocSpot = { doc: 'd0c', page: 2, start: 40, text: '01.02.0030' };
const MENGE: DocSpot = { doc: 'd0c', page: 2, start: 90, text: '120 m³' };

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
      quantity: 120,
      unitPrice: null,
      positionType: 'normal',
      attributes: {},
      hashes: { id: hash, oz: `oz-${oz}`, text, menge: 'menge' },
    },
  } as unknown as LVNode;
}

const vorschlag = (spot: DocSpot, id: string, source: 'oz' | 'menge'): DocSuggestion => ({
  page: spot.page,
  start: spot.start,
  text: spot.text,
  id,
  source,
});

describe('Herkunft einer Verknüpfung', () => {
  it('merkt „über OZ“ nur für die übernommene Position', () => {
    let notes = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1, 'oz');
    notes = linkDocMark(notes, SPOT, ['p2'], 2);
    expect(notes.marks[0]).toMatchObject({ links: ['p1', 'p2'], sources: { p1: 'oz' } });
    notes = unlinkDocMark(notes, SPOT, 'p1');
    expect(notes.marks[0].sources).toBeUndefined();
  });

  it('Anstreichen behält die Herkunft', () => {
    const notes = paintDocMark(
      linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1, 'menge'),
      SPOT,
      'gelb',
      2,
    );
    expect(notes.marks[0]).toMatchObject({ paint: 'gelb', sources: { p1: 'menge' } });
  });
});

describe('Offene Vorschläge', () => {
  const LISTE = [vorschlag(SPOT, 'p1', 'oz'), vorschlag(MENGE, 'p1', 'menge')];
  const ALLE = { oz: true, menge: true };

  it('ohne abgelehnte, schon verknüpfte und abgeschaltete', () => {
    expect(pendingSuggestions(EMPTY_DOC_NOTES, 'd0c', LISTE, ALLE)).toHaveLength(2);
    const verknuepft = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1, 'oz');
    expect(pendingSuggestions(verknuepft, 'd0c', LISTE, ALLE)).toEqual([LISTE[1]]);
    const abgelehnt = rejectSuggestion(EMPTY_DOC_NOTES, MENGE, 'p1', 1);
    expect(isRejected(abgelehnt, MENGE, 'p1')).toBe(true);
    expect(isRejected(abgelehnt, MENGE, 'p2')).toBe(false);
    expect(pendingSuggestions(abgelehnt, 'd0c', LISTE, ALLE)).toEqual([LISTE[0]]);
    expect(pendingSuggestions(EMPTY_DOC_NOTES, 'd0c', LISTE, { oz: false, menge: true })).toEqual([
      LISTE[1],
    ]);
  });

  it('eine Stelle, die mit einer anderen Position verknüpft ist, schlägt weiter vor', () => {
    const anders = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p9'], 1);
    expect(pendingSuggestions(anders, 'd0c', LISTE, ALLE)).toHaveLength(2);
  });
});

describe('Speichern', () => {
  it('IndexedDB: Herkunft und Ablehnung überstehen Hash-Wechsel und Neuladen', () => {
    const keys = storageKeys([pos('p1', '01.02.0030', 'h1', 't1')]);
    let documents = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1, 'oz');
    documents = rejectSuggestion(documents, MENGE, 'p1', 2);
    const stored = toStored(rekey({ ...EMPTY_ANNOTATIONS, documents }, keys.toHash));
    expect(stored.documents.marks[0]).toMatchObject({ links: ['h1'], sources: { h1: 'oz' } });
    expect(stored.documents.rejected).toMatchObject([{ id: 'h1', text: MENGE.text }]);

    const back = rekey(fromStored(JSON.parse(JSON.stringify(stored))), keys.toNode);
    expect(back.documents.marks[0].sources).toEqual({ p1: 'oz' });
    expect(isRejected(back.documents, MENGE, 'p1')).toBe(true);
  });

  it('nur Ablehnungen gehen beim Speichern nicht verloren', () => {
    const keys = storageKeys([pos('p1', '01.02.0030', 'h1', 't1')]);
    const documents = rejectSuggestion(EMPTY_DOC_NOTES, MENGE, 'p1', 2);
    const stored = toStored(rekey({ ...EMPTY_ANNOTATIONS, documents }, keys.toHash));
    expect(stored.documents.rejected).toMatchObject([{ id: 'h1' }]);
  });

  it('ausgeblendete Arten von Vorschlag bleiben für dieses LV gemerkt (0087)', () => {
    expect(shownSuggestions(EMPTY_DOC_NOTES)).toEqual({ oz: true, menge: true });
    const aus = showSuggestions(EMPTY_DOC_NOTES, 'menge', false);
    expect(showSuggestions(aus, 'menge', false)).toBe(aus);
    expect(shownSuggestions(aus)).toEqual({ oz: true, menge: false });
    const back = fromStored(
      JSON.parse(JSON.stringify(toStored({ ...EMPTY_ANNOTATIONS, documents: aus }))),
    );
    expect(shownSuggestions(back.documents)).toEqual({ oz: true, menge: false });
    const wieder = showSuggestions(back.documents, 'menge', true);
    expect(shownSuggestions(wieder)).toEqual({ oz: true, menge: true });
    expect(toStored({ ...EMPTY_ANNOTATIONS, documents: wieder }).documents).not.toHaveProperty(
      'hidden',
    );
    // Kaputte Einträge zählen nicht.
    const kaputt = fromStored({
      ...JSON.parse(JSON.stringify(toStored(EMPTY_ANNOTATIONS))),
      documents: { docs: [], marks: [], hidden: ['oz', 'preis', 3] },
    });
    expect(shownSuggestions(kaputt.documents)).toEqual({ oz: false, menge: true });
  });

  it('Notiz-Datei: „quelle“ und „abgelehnt“ je Position, an der neuen Position wieder da', () => {
    const ALT = [pos('p1', '01.02.0030', 'h1', 't1')];
    let documents = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1000, 'oz');
    documents = rejectSuggestion(documents, MENGE, 'p1', 2000);
    const text = notesFileText(
      { ...EMPTY_ANNOTATIONS, documents },
      ALT,
      {
        fileName: 'a.x83',
        fileId: 'abc',
      },
      0,
    );
    const roh = JSON.parse(text) as { version: number; positionen: Array<Record<string, unknown>> };
    expect(roh.version).toBe(4);
    expect(roh.positionen[0].dokumentstellen).toMatchObject([{ quelle: 'oz' }]);
    expect(roh.positionen[0].abgelehnt).toMatchObject([{ text: MENGE.text, seite: 2 }]);

    const file = parseNotesFile(text);
    const NEU = [pos('n1', '01.02.0030', 'x1', 't1')];
    const merged = mergeNotes(EMPTY_ANNOTATIONS, matchNotes(file, NEU).moved, file.dokumente);
    expect(merged.documents.marks[0]).toMatchObject({ links: ['n1'], sources: { n1: 'oz' } });
    expect(isRejected(merged.documents, MENGE, 'n1')).toBe(true);
  });
});
