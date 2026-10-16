// Gelernte Hervorhebungen im Langtext (Entscheidung 0053).
//
// Zwei Quellen, dieselbe Form:
//  - die gepflegte Tabelle docs/domain/reference/hervorhebungen.csv — gilt für alle;
//  - Begriffe, die der Admin im Browser lernt (lib/persist/lastLv.ts) — gelten nur
//    dort, bis er sie als CSV herunterlädt und in die Tabelle übernimmt.
//
// Schreibweise wie in den Materialtabellen (lib/classify/material/stichwort.ts):
// `#` = eine Zahl, `*` = beliebige Buchstaben, sonst wörtlich, ohne Groß/klein.
//
// Gelernte Begriffe färben nur ein — sie werden kein Filter und kein Attribut.
// Deshalb laufen sie beim Anzeigen einer Position statt in der Klassifizierung.

import hervorhebungenCsv from '@reference/hervorhebungen.csv?raw';
import { compileStichworte } from '../classify/material/stichwort';
import { parseCsv } from '../csv';
import { csvText } from '../export/csvText';
import type { Span } from '../classify';

/** `aus` = nie hervorheben: nimmt eine Fundstelle der Klassifizierung weg. */
export type TermCategory = 'material' | 'masse' | 'wichtig' | 'aus';

export const TERM_CATEGORIES: readonly TermCategory[] = ['material', 'masse', 'wichtig', 'aus'];

export const TERM_LABELS: Readonly<Record<TermCategory, string>> = {
  material: 'Material',
  masse: 'Maße',
  wichtig: 'Wichtig',
  aus: 'Nicht hervorheben',
};

export interface LearnedTerm {
  /** Begriff oder Muster, z. B. „Sichtbetonklasse SB#". */
  readonly begriff: string;
  readonly kategorie: TermCategory;
}

function isCategory(value: string): value is TermCategory {
  return (TERM_CATEGORIES as readonly string[]).includes(value);
}

/** Zeilen `begriff,kategorie`; unbekannte Kategorien und leere Begriffe fallen weg. */
export function parseTerms(csv: string): LearnedTerm[] {
  const out: LearnedTerm[] = [];
  for (const row of parseCsv(csv)) {
    const begriff = row.get('begriff').trim();
    const kategorie = row.get('kategorie').trim().toLowerCase();
    if (begriff !== '' && isCategory(kategorie)) out.push({ begriff, kategorie });
  }
  return out;
}

/** CSV im Format der Tabelle — zum Übernehmen nach docs/domain/reference/. */
export function termsCsv(terms: readonly LearnedTerm[]): string {
  return csvText([
    ['begriff', 'kategorie', 'bemerkung'],
    ...terms.map((term) => [term.begriff, term.kategorie, '']),
  ]);
}

/** Begriffe aus der gepflegten Tabelle, einmal beim Laden des Moduls gelesen. */
export const TABLE_TERMS: readonly LearnedTerm[] = parseTerms(hervorhebungenCsv);

/** Gleicher Begriff ohne Rücksicht auf Groß/klein und Leerraum. */
export function sameTerm(a: string, b: string): boolean {
  const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Ziffernfolgen als `#`: „C30/37" → „C#/#". Für den Vorschlag „als Muster
 * lernen" — `null`, wenn der Begriff keine Zahl enthält.
 */
export function patternOf(text: string): string | null {
  const pattern = text.trim().replace(/\d+(?:[.,]\d+)?/g, '#');
  return pattern === text.trim() ? null : pattern;
}

/** Fundstellen eines Begriffs im Text; ein kaputtes Muster liefert keine. */
function matches(text: string, begriff: string): Array<{ start: number; end: number }> {
  const pattern = compileStichworte([begriff]);
  if (pattern === null) return [];
  const out: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (match[0].length > 0) out.push({ start, end: start + match[0].length });
  }
  return out;
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

/**
 * Fundstellen der Klassifizierung plus gelernte Begriffe, überschneidungsfrei
 * und nach `start` sortiert. Fundstellen der Klassifizierung haben Vorrang;
 * `aus` nimmt jede Fundstelle weg, die einen solchen Begriff berührt.
 */
export function applyTerms(
  text: string,
  spans: readonly Span[],
  terms: readonly LearnedTerm[],
): Span[] {
  if (terms.length === 0 || text === '') return [...spans];
  const blocked: Array<{ start: number; end: number }> = [];
  for (const term of terms)
    if (term.kategorie === 'aus') blocked.push(...matches(text, term.begriff));

  const out: Span[] = spans.filter((span) => !blocked.some((b) => overlaps(span, b)));
  // Längere Begriffe zuerst: „Sichtbetonklasse SB2" vor „SB2".
  const learned = terms
    .filter((term) => term.kategorie !== 'aus')
    .sort((a, b) => b.begriff.length - a.begriff.length);
  for (const term of learned) {
    for (const hit of matches(text, term.begriff)) {
      if (blocked.some((b) => overlaps(hit, b))) continue;
      if (out.some((span) => overlaps(span, hit))) continue;
      out.push({ key: term.kategorie, start: hit.start, end: hit.end, label: term.begriff });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
