// Eigene Notizen in Begleitdokumenten (PDF) zur letzten Datei (Entscheidung 0072):
// angestrichene Textstellen und ihre Verknüpfung mit Positionen.
//
// Eine Stelle ist Dokument + Seite + Lage im Seitentext + angestrichener Text — wie
// die Anstreichung im Langtext (Entscheidung 0063). Sie trägt eine Farbe, eine
// Verknüpfung mit Positionen oder beides. Verknüpft wird nur von Hand; Conocto
// schlägt nichts vor und deutet nichts (Owner, 2026-10-23).
//
// Das Dokument selbst wird nicht gespeichert, nur seine Kennung (SHA-256 der Bytes)
// und sein Name. Positionen stehen in der Sitzung unter der Knoten-ID, im Speicher
// unter dem Positions-Hash (Entscheidung 0055) — wie alle Notizen (`rekeyDocNotes`).
//
// Reine Funktionen über einem unveränderlichen Wert; Zeitpunkte kommen von außen.

import { isPaint, MAX_PAINT_LENGTH, type Paint } from '../paints';

/** Ein Begleitdokument, das in diesem LV schon einmal offen war. */
export interface DocInfo {
  readonly name: string;
  readonly pages: number;
}

/** Wo eine Stelle steht. `page` zählt ab 1; `start` im Textinhalt der Seite. */
export interface DocSpot {
  readonly doc: string;
  readonly page: number;
  readonly start: number;
  readonly text: string;
}

export interface DocMark extends DocSpot {
  /** `null`: nur verknüpft, nicht angestrichen. */
  readonly paint: Paint | null;
  /** Verknüpfte Positionen, ohne Doppelte. */
  readonly links: readonly string[];
  readonly at: number;
}

export interface DocNotes {
  readonly docs: ReadonlyMap<string, DocInfo>;
  /** Nach Dokument, Seite und Lage sortiert. */
  readonly marks: readonly DocMark[];
}

export const EMPTY_DOC_NOTES: DocNotes = { docs: new Map(), marks: [] };

/** Länge der Dokument-Kennung in Hex-Zeichen — wie die Datei-ID des LV. */
export const DOC_ID_LENGTH = 12;

const sameSpot = (a: DocSpot, b: DocSpot): boolean =>
  a.doc === b.doc && a.page === b.page && a.start === b.start && a.text === b.text;

function order(a: DocMark, b: DocMark): number {
  if (a.doc !== b.doc) return a.doc < b.doc ? -1 : 1;
  return a.page - b.page || a.start - b.start;
}

function validSpot(spot: DocSpot): boolean {
  return (
    spot.doc !== '' &&
    Number.isInteger(spot.page) &&
    spot.page >= 1 &&
    Number.isInteger(spot.start) &&
    spot.start >= 0 &&
    spot.text.trim() !== '' &&
    spot.text.length <= MAX_PAINT_LENGTH
  );
}

/** Ersetzt die Stelle `spot` durch `next`; `null` entfernt sie. */
function put(notes: DocNotes, spot: DocSpot, next: DocMark | null): DocNotes {
  const rest = notes.marks.filter((mark) => !sameSpot(mark, spot));
  if (next === null) {
    return rest.length === notes.marks.length ? notes : { ...notes, marks: rest };
  }
  return { ...notes, marks: [...rest, next].sort(order) };
}

export function markAt(notes: DocNotes, spot: DocSpot): DocMark | null {
  return notes.marks.find((mark) => sameSpot(mark, spot)) ?? null;
}

/** Merkt sich ein geöffnetes Dokument; ein neuer Name ersetzt den alten. */
export function registerDoc(notes: DocNotes, id: string, info: DocInfo): DocNotes {
  const known = notes.docs.get(id);
  if (known?.name === info.name && known.pages === info.pages) return notes;
  const docs = new Map(notes.docs);
  docs.set(id, { name: info.name, pages: info.pages });
  return { ...notes, docs };
}

/** Streicht eine Stelle an; ist sie schon verknüpft, behält sie ihre Verknüpfungen. */
export function paintDocMark(notes: DocNotes, spot: DocSpot, paint: Paint, at: number): DocNotes {
  if (!validSpot(spot)) return notes;
  const known = markAt(notes, spot);
  if (known?.paint === paint) return notes;
  return put(notes, spot, { ...spotOf(spot), paint, links: known?.links ?? [], at });
}

/** Nimmt die Farbe weg; eine verknüpfte Stelle bleibt als Verknüpfung stehen. */
export function unpaintDocMark(notes: DocNotes, spot: DocSpot): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || known.paint === null) return notes;
  return put(notes, spot, known.links.length === 0 ? null : { ...known, paint: null });
}

/** Verknüpft eine Stelle mit Positionen; legt sie an, wenn es sie noch nicht gibt. */
export function linkDocMark(
  notes: DocNotes,
  spot: DocSpot,
  ids: readonly string[],
  at: number,
): DocNotes {
  if (!validSpot(spot) || ids.length === 0) return notes;
  const known = markAt(notes, spot);
  const links = [...new Set([...(known?.links ?? []), ...ids])];
  if (known !== null && links.length === known.links.length) return notes;
  return put(notes, spot, {
    ...spotOf(spot),
    paint: known?.paint ?? null,
    links,
    at: known?.at ?? at,
  });
}

/** Löst die Verknüpfung mit einer Position; ohne Farbe und Verknüpfung fällt die Stelle weg. */
export function unlinkDocMark(notes: DocNotes, spot: DocSpot, id: string): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || !known.links.includes(id)) return notes;
  const links = known.links.filter((link) => link !== id);
  return put(notes, spot, links.length === 0 && known.paint === null ? null : { ...known, links });
}

/** Stellen einer Seite. */
export function marksOnPage(notes: DocNotes, doc: string, page: number): DocMark[] {
  return notes.marks.filter((mark) => mark.doc === doc && mark.page === page);
}

/** Stellen, die mit einer Position verknüpft sind. */
export function marksOfPosition(notes: DocNotes, id: string): DocMark[] {
  return notes.marks.filter((mark) => mark.links.includes(id));
}

/** Positionen mit mindestens einer verknüpften Stelle. */
export function linkedIds(notes: DocNotes): Set<string> {
  const out = new Set<string>();
  for (const mark of notes.marks) for (const id of mark.links) out.add(id);
  return out;
}

/** Stellen eines Dokuments, nach Seite und Lage. */
export function marksOfDoc(notes: DocNotes, doc: string): DocMark[] {
  return notes.marks.filter((mark) => mark.doc === doc);
}

function spotOf(spot: DocSpot): DocSpot {
  return { doc: spot.doc, page: spot.page, start: spot.start, text: spot.text };
}

/** Schlüssel der Verknüpfungen austauschen; Unbekannte bleiben (wie `rekey`). */
export function rekeyDocNotes(notes: DocNotes, keys: ReadonlyMap<string, string>): DocNotes {
  if (notes.marks.length === 0) return notes;
  return {
    ...notes,
    marks: notes.marks.map((mark) =>
      mark.links.length === 0
        ? mark
        : { ...mark, links: [...new Set(mark.links.map((id) => keys.get(id) ?? id))] },
    ),
  };
}

/** Stellen aus einer Notiz-Datei dazunehmen: Farbe aus `more`, Verknüpfungen vereinigt. */
export function mergeDocNotes(notes: DocNotes, more: DocNotes): DocNotes {
  let out = notes;
  for (const [id, info] of more.docs) if (!out.docs.has(id)) out = registerDoc(out, id, info);
  for (const mark of more.marks) {
    if (mark.paint !== null) out = paintDocMark(out, mark, mark.paint, mark.at);
    out = linkDocMark(out, mark, mark.links, mark.at);
  }
  return out;
}

/** Form für IndexedDB und Notiz-Datei: Arrays statt Map. */
export interface StoredDocNotes {
  readonly docs: ReadonlyArray<readonly [string, DocInfo]>;
  readonly marks: readonly DocMark[];
}

export function toStoredDocNotes(notes: DocNotes): StoredDocNotes {
  return { docs: [...notes.docs], marks: notes.marks };
}

/** Eine Stelle aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toDocMark(value: unknown): DocMark | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { doc, page, start, text, paint } = raw;
  if (typeof doc !== 'string' || typeof text !== 'string') return null;
  if (typeof page !== 'number' || typeof start !== 'number') return null;
  const spot = { doc, page, start, text };
  if (!validSpot(spot)) return null;
  const links = Array.isArray(raw.links)
    ? [...new Set(raw.links.filter((id): id is string => typeof id === 'string' && id !== ''))]
    : [];
  const ownPaint = isPaint(paint) ? paint : null;
  if (ownPaint === null && links.length === 0) return null;
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  return { ...spot, paint: ownPaint, links, at };
}

function toDocInfo(value: unknown): DocInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== 'string') return null;
  const pages = typeof raw.pages === 'number' && Number.isInteger(raw.pages) ? raw.pages : 0;
  return { name: raw.name, pages: Math.max(0, pages) };
}

/** Liest die gespeicherte Form; fehlt sie oder ist kaputt, gibt es keine Stellen. */
export function fromStoredDocNotes(value: unknown): DocNotes {
  if (typeof value !== 'object' || value === null) return EMPTY_DOC_NOTES;
  const raw = value as Record<string, unknown>;
  const docs = new Map<string, DocInfo>();
  if (Array.isArray(raw.docs)) {
    for (const entry of raw.docs) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      const info = toDocInfo(entry[1]);
      if (info !== null) docs.set(entry[0], info);
    }
  }
  let notes: DocNotes = { docs, marks: [] };
  if (Array.isArray(raw.marks)) {
    const marks = raw.marks.map(toDocMark).filter((mark): mark is DocMark => mark !== null);
    // Über `mergeDocNotes`, damit doppelte Stellen zu einer werden.
    notes = mergeDocNotes(notes, { docs: new Map(), marks });
  }
  return notes.docs.size === 0 && notes.marks.length === 0 ? EMPTY_DOC_NOTES : notes;
}

/** Stelle im Seitentext wiederfinden: erst an ihrer Lage, sonst irgendwo auf der Seite. */
export function locateOnPage(text: string, spot: Pick<DocSpot, 'start' | 'text'>): number {
  if (text.slice(spot.start, spot.start + spot.text.length) === spot.text) return spot.start;
  return text.indexOf(spot.text);
}
