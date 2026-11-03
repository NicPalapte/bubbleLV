// Liste der offenen PDFs für Dokumentwahl und Übersicht (Entscheidung 0094): Name,
// Seiten, verknüpfte Stellen; Suche im Namen und Sortierung. Rein, ohne React.

import type { DocNotes } from './docNotes';

export type DocSort = 'geoeffnet' | 'name' | 'verknuepft';

export const DOC_SORT_LABEL: Readonly<Record<DocSort, string>> = {
  geoeffnet: 'Reihenfolge geöffnet',
  name: 'Name',
  verknuepft: 'Verknüpfungen',
};

/** Was die Liste von einem offenen PDF braucht. */
export interface DocListInput {
  readonly id: string;
  readonly name: string;
  readonly pdf: { readonly numPages: number };
}

export interface DocRow {
  readonly id: string;
  readonly name: string;
  readonly pages: number;
  /** Stellen mit mindestens einer verknüpften Position. */
  readonly linked: number;
}

/** Verknüpfte Stellen je Dokument-Kennung. */
export function linkedSpotsByDoc(notes: DocNotes): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  for (const mark of notes.marks) {
    if (mark.links.length > 0) out.set(mark.doc, (out.get(mark.doc) ?? 0) + 1);
  }
  return out;
}

const byName = (a: DocRow, b: DocRow): number =>
  a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' });

/**
 * Zeilen in gewünschter Reihenfolge. `query` filtert nach Namensteil, ohne Groß/klein.
 * „Verknüpfungen“: meiste zuerst, bei Gleichstand nach Name.
 */
export function docRows(
  docs: readonly DocListInput[],
  linked: ReadonlyMap<string, number>,
  query: string,
  sort: DocSort,
): DocRow[] {
  const needle = query.trim().toLocaleLowerCase('de');
  const rows = docs
    .filter((doc) => needle === '' || doc.name.toLocaleLowerCase('de').includes(needle))
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      pages: doc.pdf.numPages,
      linked: linked.get(doc.id) ?? 0,
    }));
  if (sort === 'name') return rows.sort(byName);
  if (sort === 'verknuepft') return rows.sort((a, b) => b.linked - a.linked || byName(a, b));
  return rows;
}
