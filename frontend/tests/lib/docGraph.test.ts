// Verknüpfungen mit Begleit-PDFs im Graphen (Entscheidung 0096): Karten je PDF und Zahl der
// Stellen je Position, nur aus verknüpften Stellen und nur für bekannte Positionen.

import { describe, expect, it } from 'vitest';
import { docGraphOf, EMPTY_DOC_GRAPH, marksForPosition } from '../../src/lib/docs/docGraph';
import {
  EMPTY_DOC_NOTES,
  linkDocMark,
  paintDocMark,
  registerDoc,
  type DocSpot,
} from '../../src/lib/docs/docNotes';

const spot = (doc: string, page: number, start: number, text = 'Stelle'): DocSpot => ({
  doc,
  page,
  start,
  text,
});

const all = (): boolean => true;

function sample() {
  let notes = registerDoc(EMPTY_DOC_NOTES, 'bb0000000001', { name: 'Baubeschreibung', pages: 48 });
  notes = registerDoc(notes, 'gu0000000002', { name: 'Bodengutachten', pages: 30 });
  notes = registerDoc(notes, 'vb0000000003', { name: 'Vorbemerkungen', pages: 12 });
  notes = linkDocMark(notes, spot('gu0000000002', 7, 10), ['p2'], 1);
  notes = linkDocMark(notes, spot('bb0000000001', 12, 40), ['p4', 'p5'], 1);
  notes = linkDocMark(notes, spot('bb0000000001', 6, 0), ['p2'], 1);
  notes = paintDocMark(notes, spot('vb0000000003', 2, 0), 'gelb', 1);
  return notes;
}

describe('docGraphOf', () => {
  it('liefert ohne Verknüpfungen den leeren Graphen', () => {
    expect(docGraphOf(EMPTY_DOC_NOTES, all)).toBe(EMPTY_DOC_GRAPH);
  });

  it('legt je PDF mit Verknüpfung eine Karte an, in der Reihenfolge der PDFs', () => {
    const graph = docGraphOf(sample(), all);
    expect(graph.cards.map((card) => card.name)).toEqual(['Baubeschreibung', 'Bodengutachten']);
    const [bb] = graph.cards;
    expect(bb.pages).toBe(48);
    expect(bb.marks.map((mark) => mark.page)).toEqual([6, 12]);
    expect(bb.positions).toEqual(['p2', 'p4', 'p5']);
  });

  it('zählt angestrichene Stellen ohne Verknüpfung nicht', () => {
    const graph = docGraphOf(sample(), all);
    expect(graph.cards.some((card) => card.doc === 'vb0000000003')).toBe(false);
  });

  it('zählt die Stellen je Position über alle PDFs', () => {
    const { countOf } = docGraphOf(sample(), all);
    expect(countOf.get('p2')).toBe(2);
    expect(countOf.get('p4')).toBe(1);
    expect(countOf.has('p9')).toBe(false);
  });

  it('lässt Positionen weg, die das geladene LV nicht kennt', () => {
    const graph = docGraphOf(sample(), (id) => id !== 'p5' && id !== 'p2');
    expect(graph.cards.map((card) => card.name)).toEqual(['Baubeschreibung']);
    expect(graph.cards[0].marks).toHaveLength(1);
    expect(graph.cards[0].marks[0].links).toEqual(['p4']);
    expect(graph.countOf.has('p5')).toBe(false);
  });

  it('nennt ein PDF ohne gemerkten Namen „Dokument“', () => {
    const notes = linkDocMark(EMPTY_DOC_NOTES, spot('xx0000000009', 1, 0), ['p1'], 1);
    expect(docGraphOf(notes, all).cards[0].name).toBe('Dokument');
  });
});

describe('marksForPosition', () => {
  it('findet die Stellen einer Karte zu einer Position', () => {
    const [bb] = docGraphOf(sample(), all).cards;
    expect(marksForPosition(bb, 'p2').map((mark) => mark.page)).toEqual([6]);
    expect(marksForPosition(bb, 'p7')).toEqual([]);
  });
});
