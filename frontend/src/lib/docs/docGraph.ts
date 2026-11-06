// Verknüpfungen mit Begleit-PDFs für den Graphen (Entscheidung 0097): je PDF eine Karte
// am Rand mit ihren verknüpften Stellen und Positionen, je Position die Zahl der Stellen.
//
// Rein und einmal je Notizstand gerechnet, nie je Frame: der Graph liest nur nach.
// Grundlage sind allein die gespeicherten Verknüpfungen (`DocNotes.marks[].links`),
// angestrichene Stellen ohne Verknüpfung zählen nicht.

import type { DocMark, DocNotes } from './docNotes';

/** Ein Begleit-PDF mit mindestens einer Verknüpfung. */
export interface DocCard {
  /** Dokument-Kennung (`DocSpot.doc`). */
  readonly doc: string;
  readonly name: string;
  readonly pages: number;
  /** Verknüpfte Stellen, nach Seite und Lage. */
  readonly marks: readonly DocMark[];
  /** Verknüpfte Positionen (Knoten-IDs), ohne Doppelte, in Reihenfolge der Stellen. */
  readonly positions: readonly string[];
}

export interface DocGraph {
  readonly cards: readonly DocCard[];
  /** Verknüpfte Stellen je Position (Knoten-ID). */
  readonly countOf: ReadonlyMap<string, number>;
}

export const EMPTY_DOC_GRAPH: DocGraph = { cards: [], countOf: new Map() };

/**
 * Karten in der Reihenfolge, in der die PDFs zum ersten Mal offen waren.
 * `known` sortiert Positionen aus, die das geladene LV nicht kennt.
 */
export function docGraphOf(notes: DocNotes, known: (id: string) => boolean): DocGraph {
  const byDoc = new Map<string, { marks: DocMark[]; positions: Set<string> }>();
  const countOf = new Map<string, number>();
  for (const mark of notes.marks) {
    const links = mark.links.filter(known);
    if (links.length === 0) continue;
    let entry = byDoc.get(mark.doc);
    if (entry === undefined) {
      entry = { marks: [], positions: new Set() };
      byDoc.set(mark.doc, entry);
    }
    entry.marks.push(links.length === mark.links.length ? mark : { ...mark, links });
    for (const id of links) {
      entry.positions.add(id);
      countOf.set(id, (countOf.get(id) ?? 0) + 1);
    }
  }
  if (byDoc.size === 0) return EMPTY_DOC_GRAPH;

  const order = [...notes.docs.keys(), ...byDoc.keys()];
  const cards: DocCard[] = [];
  for (const doc of new Set(order)) {
    const entry = byDoc.get(doc);
    if (entry === undefined) continue;
    const info = notes.docs.get(doc);
    cards.push({
      doc,
      name: info?.name ?? 'Dokument',
      pages: info?.pages ?? 0,
      marks: entry.marks,
      positions: [...entry.positions],
    });
  }
  return { cards, countOf };
}

/** Stellen einer Karte, die mit dieser Position verknüpft sind. */
export function marksForPosition(card: DocCard, id: string): readonly DocMark[] {
  return card.marks.filter((mark) => mark.links.includes(id));
}
