// Liste der offenen PDFs für Dokumentwahl und Übersicht (Entscheidung 0094): Name,
// Seiten, verknüpfte Stellen, Dokumentart (0096); Suche im Namen und Sortierung.
// Rein, ohne React.

import { DOC_KINDS, type DocKind, type DocKindGuess } from '@core';
import type { DocNotes } from './docNotes';

export type DocSort = 'art' | 'geoeffnet' | 'name' | 'verknuepft';

export const DOC_SORT_LABEL: Readonly<Record<DocSort, string>> = {
  art: 'Dokumentart',
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
  /** Geltende Dokumentart; `null`: nicht erkannt und nicht gewählt. */
  readonly kind: DocKind | null;
  /** Art von Hand gewählt statt erkannt. */
  readonly manual: boolean;
}

/** Art eines Dokuments: von Hand gewählt (`notes`) vor erkannt (`guesses`). */
export interface DocKindOf {
  readonly kind: DocKind | null;
  readonly manual: boolean;
  /** Was die Erkennung meint; fehlt, solange die erste Seite noch gelesen wird. */
  readonly guess: DocKindGuess | null;
}

export function kindOfDoc(
  id: string,
  notes: DocNotes,
  guesses: ReadonlyMap<string, DocKindGuess>,
): DocKindOf {
  const own = notes.docs.get(id)?.kind;
  const guess = guesses.get(id) ?? null;
  return own === undefined
    ? { kind: guess?.kind ?? null, manual: false, guess }
    : { kind: own, manual: true, guess };
}

/** Rang einer Art in der Sortierung; „nicht erkannt“ zuletzt. */
function rankOf(kind: DocKind | null): number {
  return kind === null ? DOC_KINDS.length : DOC_KINDS.indexOf(kind);
}

export interface DocGroup {
  readonly kind: DocKind | null;
  readonly rows: readonly DocRow[];
}

/** Aufeinanderfolgende Zeilen gleicher Art als Gruppe; für die Sortierung „Dokumentart“. */
export function groupByKind(rows: readonly DocRow[]): DocGroup[] {
  const groups: { kind: DocKind | null; rows: DocRow[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last !== undefined && last.kind === row.kind) last.rows.push(row);
    else groups.push({ kind: row.kind, rows: [row] });
  }
  return groups;
}

/** Verknüpfte Stellen je Dokument-Kennung. */
export function linkedSpotsByDoc(notes: DocNotes): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  for (const mark of notes.marks) {
    if (mark.links.length > 0) out.set(mark.doc, (out.get(mark.doc) ?? 0) + 1);
  }
  return out;
}

const NO_KIND = { kind: null, manual: false } as const;

const pick = ({ kind, manual }: Pick<DocKindOf, 'kind' | 'manual'>) => ({ kind, manual });

const byName = (a: DocRow, b: DocRow): number =>
  a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' });

/**
 * Zeilen in gewünschter Reihenfolge. `query` filtert nach Namensteil, ohne Groß/klein.
 * „Verknüpfungen“: meiste zuerst, bei Gleichstand nach Name. „Dokumentart“: in der Folge
 * von `DOC_KINDS`, nicht erkannte zuletzt, je Art nach Name; `kinds` liefert die Art.
 */
export function docRows(
  docs: readonly DocListInput[],
  linked: ReadonlyMap<string, number>,
  query: string,
  sort: DocSort,
  kinds: (id: string) => Pick<DocKindOf, 'kind' | 'manual'> = () => NO_KIND,
): DocRow[] {
  const needle = query.trim().toLocaleLowerCase('de');
  const rows = docs
    .filter((doc) => needle === '' || doc.name.toLocaleLowerCase('de').includes(needle))
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      pages: doc.pdf.numPages,
      linked: linked.get(doc.id) ?? 0,
      ...pick(kinds(doc.id)),
    }));
  if (sort === 'art') {
    return rows.sort((a, b) => rankOf(a.kind) - rankOf(b.kind) || byName(a, b));
  }
  if (sort === 'name') return rows.sort(byName);
  if (sort === 'verknuepft') return rows.sort((a, b) => b.linked - a.linked || byName(a, b));
  return rows;
}
