// Liste der offenen PDFs (Entscheidung 0094): Suche im Namen, Sortierung, verknüpfte Stellen.

import { describe, expect, it } from 'vitest';
import { docRows, linkedSpotsByDoc } from '../../src/lib/docs/docList';
import { EMPTY_DOC_NOTES, type DocMark, type DocNotes } from '../../src/lib/docs/docNotes';

const doc = (id: string, name: string, numPages: number) => ({ id, name, pdf: { numPages } });

const DOCS = [
  doc('a', 'Plan 10.pdf', 1),
  doc('b', 'baubeschreibung.pdf', 24),
  doc('c', 'Plan 2.pdf', 1),
];

const mark = (docId: string, links: string[], start: number): DocMark => ({
  doc: docId,
  page: 1,
  start,
  text: 'Stelle',
  paint: null,
  links,
  at: 0,
});

describe('docRows', () => {
  it('lässt die Reihenfolge des Öffnens stehen', () => {
    expect(docRows(DOCS, new Map(), '', 'geoeffnet').map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('sortiert nach Name ohne Groß/klein und mit Zahlen in natürlicher Folge', () => {
    expect(docRows(DOCS, new Map(), '', 'name').map((row) => row.name)).toEqual([
      'baubeschreibung.pdf',
      'Plan 2.pdf',
      'Plan 10.pdf',
    ]);
  });

  it('sortiert nach Verknüpfungen, meiste zuerst, sonst nach Name', () => {
    const linked = new Map([['c', 3]]);
    expect(docRows(DOCS, linked, '', 'verknuepft').map((row) => row.id)).toEqual(['c', 'b', 'a']);
  });

  it('filtert nach einem Teil des Namens', () => {
    const rows = docRows(DOCS, new Map(), '  PLAN ', 'geoeffnet');
    expect(rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(rows[0]).toEqual({ id: 'a', name: 'Plan 10.pdf', pages: 1, linked: 0 });
  });
});

describe('linkedSpotsByDoc', () => {
  it('zählt nur Stellen mit verknüpfter Position', () => {
    const notes: DocNotes = {
      ...EMPTY_DOC_NOTES,
      marks: [mark('a', ['p1', 'p2'], 0), mark('a', [], 10), mark('b', ['p3'], 0)],
    };
    const linked = linkedSpotsByDoc(notes);
    expect(linked.get('a')).toBe(1);
    expect(linked.get('b')).toBe(1);
    expect(linked.has('c')).toBe(false);
  });
});
