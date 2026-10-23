// Stellen in Begleitdokumenten (Entscheidung 0072): anstreichen, von Hand verknüpfen,
// speichern, in der Notiz-Datei sichern und wieder laden.

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
  fromStoredDocNotes,
  linkDocMark,
  linkedIds,
  locateOnPage,
  marksOfPosition,
  marksOnPage,
  mergeDocNotes,
  paintDocMark,
  registerDoc,
  rekeyDocNotes,
  toStoredDocNotes,
  unlinkDocMark,
  unpaintDocMark,
  type DocSpot,
} from '../../src/lib/docs/docNotes';
import { looksLikePdf, MAX_PDF_BYTES, openPdf, PdfOpenError } from '../../src/lib/docs/pdf';
import {
  matchNotes,
  mergeNotes,
  notesCount,
  notesFileText,
  parseNotesFile,
} from '../../src/lib/notesFile';
import type { LVNode } from '../../src/types/lvNode';

const SPOT: DocSpot = { doc: 'd0c', page: 3, start: 120, text: 'kapillarbrechende Schicht' };
const OTHER: DocSpot = { doc: 'd0c', page: 1, start: 5, text: 'Fugenbänder' };

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
      unit: 'm2',
      quantity: 10,
      unitPrice: null,
      positionType: 'normal',
      attributes: {},
      hashes: { id: hash, oz: `oz-${oz}`, text, menge: 'menge' },
    },
  } as unknown as LVNode;
}

describe('Stellen anstreichen und verknüpfen', () => {
  it('Farbe und Verknüpfung hängen an derselben Stelle', () => {
    let notes = paintDocMark(EMPTY_DOC_NOTES, SPOT, 'gelb', 1);
    notes = linkDocMark(notes, SPOT, ['p1', 'p2'], 2);
    notes = linkDocMark(notes, SPOT, ['p2'], 3);
    expect(notes.marks).toHaveLength(1);
    expect(notes.marks[0]).toMatchObject({ paint: 'gelb', links: ['p1', 'p2'], at: 1 });
    expect(marksOfPosition(notes, 'p2')).toHaveLength(1);
    expect([...linkedIds(notes)]).toEqual(['p1', 'p2']);
  });

  it('ohne Farbe bleibt eine verknüpfte Stelle, ohne beides fällt sie weg', () => {
    let notes = linkDocMark(paintDocMark(EMPTY_DOC_NOTES, SPOT, 'blau', 1), SPOT, ['p1'], 2);
    notes = unpaintDocMark(notes, SPOT);
    expect(notes.marks[0]).toMatchObject({ paint: null, links: ['p1'] });
    notes = unlinkDocMark(notes, SPOT, 'p1');
    expect(notes.marks).toEqual([]);
  });

  it('Lösen einer Verknüpfung lässt die Farbe stehen', () => {
    let notes = linkDocMark(paintDocMark(EMPTY_DOC_NOTES, SPOT, 'gruen', 1), SPOT, ['p1'], 2);
    notes = unlinkDocMark(notes, SPOT, 'p1');
    expect(notes.marks[0]).toMatchObject({ paint: 'gruen', links: [] });
  });

  it('nimmt keine leere oder unsinnige Stelle an', () => {
    expect(paintDocMark(EMPTY_DOC_NOTES, { ...SPOT, text: '  ' }, 'gelb', 1)).toBe(EMPTY_DOC_NOTES);
    expect(paintDocMark(EMPTY_DOC_NOTES, { ...SPOT, page: 0 }, 'gelb', 1)).toBe(EMPTY_DOC_NOTES);
    expect(linkDocMark(EMPTY_DOC_NOTES, SPOT, [], 1)).toBe(EMPTY_DOC_NOTES);
  });

  it('sortiert nach Seite und Lage und findet die Stellen einer Seite', () => {
    let notes = paintDocMark(EMPTY_DOC_NOTES, SPOT, 'gelb', 1);
    notes = paintDocMark(notes, OTHER, 'rosa', 2);
    expect(notes.marks.map((mark) => mark.page)).toEqual([1, 3]);
    expect(marksOnPage(notes, 'd0c', 3).map((mark) => mark.text)).toEqual([SPOT.text]);
  });

  it('findet eine verschobene Stelle im Seitentext wieder', () => {
    expect(locateOnPage('abc Fugenbänder', { start: 4, text: 'Fugenbänder' })).toBe(4);
    expect(locateOnPage('xx abc Fugenbänder', { start: 4, text: 'Fugenbänder' })).toBe(7);
    expect(locateOnPage('nichts', { start: 0, text: 'Fugenbänder' })).toBe(-1);
  });

  it('merkt sich Name und Seitenzahl eines Dokuments', () => {
    const notes = registerDoc(EMPTY_DOC_NOTES, 'd0c', { name: 'Baubeschreibung.pdf', pages: 48 });
    expect(notes.docs.get('d0c')).toEqual({ name: 'Baubeschreibung.pdf', pages: 48 });
    expect(registerDoc(notes, 'd0c', { name: 'Baubeschreibung.pdf', pages: 48 })).toBe(notes);
  });
});

describe('Speichern', () => {
  it('schlüsselt Verknüpfungen auf den Positions-Hash um und zurück', () => {
    const keys = storageKeys([pos('p1', '01.0010', 'h1', 't1')]);
    const notes = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1', 'unbekannt'], 1);
    const stored = rekeyDocNotes(notes, keys.toHash);
    expect(stored.marks[0].links).toEqual(['h1', 'unbekannt']);
    expect(rekeyDocNotes(stored, keys.toNode)).toEqual(notes);
  });

  it('übersteht den Weg in die IndexedDB-Form (v6) und zurück', () => {
    let documents = registerDoc(EMPTY_DOC_NOTES, 'd0c', { name: 'a.pdf', pages: 3 });
    documents = linkDocMark(paintDocMark(documents, SPOT, 'lila', 1), SPOT, ['h1'], 2);
    const stored = toStored({ ...EMPTY_ANNOTATIONS, documents });
    expect(stored.v).toBe(6);
    expect(fromStored(stored).documents).toEqual(documents);
    expect(fromStoredDocNotes(toStoredDocNotes(documents))).toEqual(documents);
  });

  it('liest ältere Speicherformen ohne Dokumente und verwirft Kaputtes', () => {
    expect(
      fromStored({ v: 5, progress: [], important: [], highlights: [], log: [] }).documents,
    ).toBe(EMPTY_DOC_NOTES);
    const kaputt = fromStoredDocNotes({
      docs: [['d', { name: 1 }], 'x'],
      marks: [{ doc: 'd', page: -1, start: 0, text: 'a', paint: 'gelb' }, { doc: 'd' }],
    });
    expect(kaputt).toBe(EMPTY_DOC_NOTES);
  });

  it('rekey nimmt Dokumentstellen mit', () => {
    const keys = storageKeys([pos('p1', '01.0010', 'h1', 't1')]);
    const documents = linkDocMark(EMPTY_DOC_NOTES, SPOT, ['p1'], 1);
    const out = rekey({ ...EMPTY_ANNOTATIONS, documents }, keys.toHash);
    expect(out.documents.marks[0].links).toEqual(['h1']);
  });
});

describe('Notiz-Datei Version 4', () => {
  const ALT = [pos('p1', '01.0010', 'h1', 't1'), pos('p2', '01.0020', 'h2', 't2')];
  const QUELLE = { fileName: 'rohbau.x83', fileId: 'abc' };

  it('sichert verknüpfte und nur angestrichene Stellen und lädt sie an die neue Position', () => {
    let documents = registerDoc(EMPTY_DOC_NOTES, 'd0c', { name: 'a.pdf', pages: 3 });
    documents = linkDocMark(paintDocMark(documents, SPOT, 'gelb', 1000), SPOT, ['p1'], 1000);
    documents = paintDocMark(documents, OTHER, 'rosa', 2000);
    const annotations = { ...EMPTY_ANNOTATIONS, documents };
    expect(notesCount(annotations)).toBe(2);

    const file = parseNotesFile(notesFileText(annotations, ALT, QUELLE, 0));
    expect(file.positionen).toHaveLength(1);
    expect(file.positionen[0].dokumentstellen.map((mark) => mark.text)).toEqual([SPOT.text]);
    expect(file.dokumente.docs.get('d0c')?.name).toBe('a.pdf');
    expect(file.dokumente.marks.map((mark) => mark.text)).toEqual([OTHER.text]);

    // Neue Fassung: dieselbe Position heißt jetzt anders (umnummeriert, gleicher Text).
    const NEU = [pos('n1', '02.0010', 'x1', 't1')];
    const matching = matchNotes(file, NEU);
    expect(matching.moved).toHaveLength(1);
    const merged = mergeNotes(EMPTY_ANNOTATIONS, matching.moved, file.dokumente);
    expect(marksOfPosition(merged.documents, 'n1').map((mark) => mark.paint)).toEqual(['gelb']);
    expect(merged.documents.marks).toHaveLength(2);
    expect(merged.documents.docs.get('d0c')?.pages).toBe(3);
  });

  it('liest Version 3 weiter, ohne Dokumentstellen', () => {
    const file = parseNotesFile(
      JSON.stringify({ art: 'bubble-notizen', version: 3, positionen: [] }),
    );
    expect(file.dokumente).toBe(EMPTY_DOC_NOTES);
  });

  it('zusammenführen ohne Treffer nimmt trotzdem die Dokumentstellen mit', () => {
    const more = paintDocMark(EMPTY_DOC_NOTES, OTHER, 'gelb', 1);
    expect(mergeDocNotes(EMPTY_DOC_NOTES, more).marks).toHaveLength(1);
    expect(mergeNotes(EMPTY_ANNOTATIONS, [], more).documents.marks).toHaveLength(1);
  });
});

describe('PDF öffnen', () => {
  it('erkennt ein PDF an seiner Kennung', () => {
    expect(looksLikePdf(new TextEncoder().encode('%PDF-1.7\n…').buffer)).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode('<GAEB>').buffer)).toBe(false);
  });

  it('lehnt Dateien ab, die kein PDF sind, mit verständlicher Meldung', async () => {
    const file = new File(['<GAEB/>'], 'lv.x83');
    await expect(openPdf(file)).rejects.toThrow(PdfOpenError);
    await expect(openPdf(file)).rejects.toThrow('kein PDF');
  });

  it('lehnt zu große Dateien ab, ohne sie zu lesen', async () => {
    const riesig = {
      size: MAX_PDF_BYTES + 1,
      arrayBuffer: () => Promise.reject(new Error('gelesen')),
    } as unknown as File;
    await expect(openPdf(riesig)).rejects.toThrow('größer als 200 MB');
  });
});
