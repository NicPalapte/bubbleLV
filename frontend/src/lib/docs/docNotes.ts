// Eigene Notizen in Begleitdokumenten (PDF) zur letzten Datei (Entscheidung 0072):
// angestrichene Textstellen und ihre Verknüpfung mit Positionen.
//
// Eine Stelle ist Dokument + Seite + Lage im Seitentext + angestrichener Text — wie
// die Anstreichung im Langtext (Entscheidung 0063). Sie trägt eine Farbe, eine
// Verknüpfung mit Positionen oder beides. Verknüpft wird von Hand oder per Klick auf
// einen Vorschlag (OZ oder Menge, Entscheidung 0080); woher eine Verknüpfung kam, steht
// in `sources`. Abgelehnte Vorschläge stehen in `rejected`, damit sie nicht wiederkommen.
// Ausgeblendete Arten von Vorschlag stehen in `hidden` (Entscheidung 0087): Sie gelten für
// dieses LV, ein neues LV beginnt mit allen.
//
// Das Dokument selbst wird nicht gespeichert, nur seine Kennung (SHA-256 der Bytes)
// und sein Name. Positionen stehen in der Sitzung unter der Knoten-ID, im Speicher
// unter dem Positions-Hash (Entscheidung 0055) — wie alle Notizen (`rekeyDocNotes`).
//
// Reine Funktionen über einem unveränderlichen Wert; Zeitpunkte kommen von außen.

import { isPaint, MAX_PAINT_LENGTH, type Paint } from '../paints';
import { isLinkSource, type DocSuggestion, type LinkSource } from './docSuggest';

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
  /** Herkunft je Verknüpfung aus einem Vorschlag; von Hand verknüpfte fehlen hier. */
  readonly sources?: Readonly<Record<string, LinkSource>>;
  readonly at: number;
}

/** Abgelehnter Vorschlag: diese Stelle nicht mit dieser Position (`id`). */
export interface DocRejection extends DocSpot {
  readonly id: string;
  readonly at: number;
}

export interface DocNotes {
  readonly docs: ReadonlyMap<string, DocInfo>;
  /** Nach Dokument, Seite und Lage sortiert. */
  readonly marks: readonly DocMark[];
  /** Abgelehnte Vorschläge (Entscheidung 0080); fehlt, solange es keine gibt. */
  readonly rejected?: readonly DocRejection[];
  /** Ausgeblendete Arten von Vorschlag (0087); leer oder fehlt: alle gezeigt. */
  readonly hidden?: readonly LinkSource[];
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
  return put(
    notes,
    spot,
    withSources({ ...spotOf(spot), paint, links: known?.links ?? [], at }, known?.sources),
  );
}

/** Nimmt die Farbe weg; eine verknüpfte Stelle bleibt als Verknüpfung stehen. */
export function unpaintDocMark(notes: DocNotes, spot: DocSpot): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || known.paint === null) return notes;
  return put(notes, spot, known.links.length === 0 ? null : { ...known, paint: null });
}

/** Herkunft nur für verknüpfte Positionen; leer fällt das Feld weg. */
function withSources(
  mark: DocMark,
  sources: Readonly<Record<string, LinkSource>> | undefined,
): DocMark {
  const own: Record<string, LinkSource> = {};
  for (const id of mark.links) {
    const source = sources?.[id];
    if (source !== undefined) own[id] = source;
  }
  const base: DocMark = {
    doc: mark.doc,
    page: mark.page,
    start: mark.start,
    text: mark.text,
    paint: mark.paint,
    links: mark.links,
    at: mark.at,
  };
  return Object.keys(own).length === 0 ? base : { ...base, sources: own };
}

/**
 * Verknüpft eine Stelle mit Positionen; legt sie an, wenn es sie noch nicht gibt.
 * `source`: aus einem Vorschlag übernommen (Entscheidung 0080), sonst von Hand.
 */
export function linkDocMark(
  notes: DocNotes,
  spot: DocSpot,
  ids: readonly string[],
  at: number,
  source?: LinkSource,
): DocNotes {
  if (!validSpot(spot) || ids.length === 0) return notes;
  const known = markAt(notes, spot);
  const links = [...new Set([...(known?.links ?? []), ...ids])];
  if (known !== null && links.length === known.links.length) return notes;
  const sources: Record<string, LinkSource> = { ...known?.sources };
  if (source !== undefined)
    for (const id of ids) if (!known?.links.includes(id)) sources[id] = source;
  return put(
    notes,
    spot,
    withSources(
      { ...spotOf(spot), paint: known?.paint ?? null, links, at: known?.at ?? at },
      sources,
    ),
  );
}

/** Löst die Verknüpfung mit einer Position; ohne Farbe und Verknüpfung fällt die Stelle weg. */
export function unlinkDocMark(notes: DocNotes, spot: DocSpot, id: string): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || !known.links.includes(id)) return notes;
  const links = known.links.filter((link) => link !== id);
  return put(
    notes,
    spot,
    links.length === 0 && known.paint === null
      ? null
      : withSources({ ...known, links }, known.sources),
  );
}

const sameRejection = (a: DocRejection, b: DocSpot & { id: string }): boolean =>
  sameSpot(a, b) && a.id === b.id;

/** Merkt sich einen abgelehnten Vorschlag: Stelle `spot` gehört nicht zu `id`. */
export function rejectSuggestion(notes: DocNotes, spot: DocSpot, id: string, at: number): DocNotes {
  if (!validSpot(spot) || id === '') return notes;
  const rejected = notes.rejected ?? [];
  if (rejected.some((entry) => sameRejection(entry, { ...spot, id }))) return notes;
  return { ...notes, rejected: [...rejected, { ...spotOf(spot), id, at }] };
}

/** Wurde dieser Vorschlag schon abgelehnt? */
export function isRejected(notes: DocNotes, spot: DocSpot, id: string): boolean {
  return (notes.rejected ?? []).some((entry) => sameRejection(entry, { ...spot, id }));
}

/** Welche Arten von Vorschlag gezeigt werden. */
export function shownSuggestions(notes: DocNotes): Record<LinkSource, boolean> {
  const hidden = notes.hidden ?? [];
  return { oz: !hidden.includes('oz'), menge: !hidden.includes('menge') };
}

/** Eine Art von Vorschlag zeigen oder ausblenden. */
export function showSuggestions(notes: DocNotes, source: LinkSource, on: boolean): DocNotes {
  const hidden = notes.hidden ?? [];
  if (hidden.includes(source) !== on) return notes;
  return { ...notes, hidden: on ? hidden.filter((item) => item !== source) : [...hidden, source] };
}

/** Abgelehnte Vorschläge zu einer Position, für die Notiz-Datei. */
export function rejectionsOfPosition(notes: DocNotes, id: string): DocRejection[] {
  return (notes.rejected ?? []).filter((entry) => entry.id === id);
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
  const rejected = notes.rejected ?? [];
  if (notes.marks.length === 0 && rejected.length === 0) return notes;
  const key = (id: string): string => keys.get(id) ?? id;
  const out: DocNotes = {
    ...notes,
    marks: notes.marks.map((mark) => {
      if (mark.links.length === 0) return mark;
      const links = [...new Set(mark.links.map(key))];
      if (mark.sources === undefined) return { ...mark, links };
      const sources: Record<string, LinkSource> = {};
      for (const [id, source] of Object.entries(mark.sources)) sources[key(id)] = source;
      return withSources({ ...mark, links }, sources);
    }),
  };
  return rejected.length === 0
    ? out
    : { ...out, rejected: rejected.map((entry) => ({ ...entry, id: key(entry.id) })) };
}

/** Stellen aus einer Notiz-Datei dazunehmen: Farbe aus `more`, Verknüpfungen vereinigt. */
export function mergeDocNotes(notes: DocNotes, more: DocNotes): DocNotes {
  let out = notes;
  for (const [id, info] of more.docs) if (!out.docs.has(id)) out = registerDoc(out, id, info);
  for (const entry of more.rejected ?? []) out = rejectSuggestion(out, entry, entry.id, entry.at);
  if (more.marks.length === 0) return out;
  // Einmal über eine Tabelle statt Stelle für Stelle über `put`: Notiz-Dateien und der
  // Speicher können viele Stellen bringen, und `put` sortiert jedes Mal alles neu.
  const keyOf = (spot: DocSpot): string =>
    `${spot.doc}\u0000${spot.page}\u0000${spot.start}\u0000${spot.text}`;
  const byKey = new Map(out.marks.map((mark) => [keyOf(mark), mark]));
  let changed = false;
  for (const mark of more.marks) {
    if (!validSpot(mark)) continue;
    const key = keyOf(mark);
    let known = byKey.get(key) ?? null;
    if (mark.paint !== null && known?.paint !== mark.paint) {
      known = withSources(
        { ...spotOf(mark), paint: mark.paint, links: known?.links ?? [], at: mark.at },
        known?.sources,
      );
      byKey.set(key, known);
      changed = true;
    }
    if (mark.links.length === 0) continue;
    const links = [...new Set([...(known?.links ?? []), ...mark.links])];
    if (known !== null && links.length === known.links.length) continue;
    // Bekannte Herkunft bleibt; neue Verknüpfungen bringen ihre mit.
    byKey.set(
      key,
      withSources(
        { ...spotOf(mark), paint: known?.paint ?? null, links, at: known?.at ?? mark.at },
        { ...mark.sources, ...known?.sources },
      ),
    );
    changed = true;
  }
  return changed ? { ...out, marks: [...byKey.values()].sort(order) } : out;
}

/** Form für IndexedDB und Notiz-Datei: Arrays statt Map. */
export interface StoredDocNotes {
  readonly docs: ReadonlyArray<readonly [string, DocInfo]>;
  readonly marks: readonly DocMark[];
  /** Seit 0080; ältere Fassungen lesen das Feld nicht und behalten den Rest. */
  readonly rejected?: readonly DocRejection[];
  /** Seit 0087, ebenso. */
  readonly hidden?: readonly LinkSource[];
}

export function toStoredDocNotes(notes: DocNotes): StoredDocNotes {
  const rejected = notes.rejected ?? [];
  const hidden = notes.hidden ?? [];
  return {
    docs: [...notes.docs],
    marks: notes.marks,
    ...(rejected.length === 0 ? {} : { rejected }),
    ...(hidden.length === 0 ? {} : { hidden }),
  };
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
  const sources: Record<string, LinkSource> = {};
  if (typeof raw.sources === 'object' && raw.sources !== null) {
    for (const [id, source] of Object.entries(raw.sources)) {
      if (isLinkSource(source)) sources[id] = source;
    }
  }
  return withSources({ ...spot, paint: ownPaint, links, at }, sources);
}

/** Ein abgelehnter Vorschlag aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toDocRejection(value: unknown): DocRejection | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { doc, page, start, text, id } = raw;
  if (typeof doc !== 'string' || typeof text !== 'string' || typeof id !== 'string') return null;
  if (typeof page !== 'number' || typeof start !== 'number' || id === '') return null;
  const spot = { doc, page, start, text };
  if (!validSpot(spot)) return null;
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  return { ...spot, id, at };
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
  if (Array.isArray(raw.rejected)) {
    const rejected = raw.rejected
      .map(toDocRejection)
      .filter((entry): entry is DocRejection => entry !== null);
    notes = mergeDocNotes(notes, { docs: new Map(), marks: [], rejected });
  }
  if (Array.isArray(raw.hidden)) {
    for (const source of raw.hidden) {
      if (isLinkSource(source)) notes = showSuggestions(notes, source, false);
    }
  }
  const empty = notes.docs.size === 0 && notes.marks.length === 0;
  const plain = (notes.rejected ?? []).length === 0 && (notes.hidden ?? []).length === 0;
  return empty && plain ? EMPTY_DOC_NOTES : notes;
}

/** Stelle im Seitentext wiederfinden: erst an ihrer Lage, sonst irgendwo auf der Seite. */
export function locateOnPage(text: string, spot: Pick<DocSpot, 'start' | 'text'>): number {
  if (text.slice(spot.start, spot.start + spot.text.length) === spot.text) return spot.start;
  return text.indexOf(spot.text);
}

/**
 * Vorschläge, die noch offen sind: Art eingeschaltet, nicht abgelehnt und die Position
 * nicht schon an einer Stelle verknüpft, die den Vorschlag berührt (Entscheidung 0080).
 */
export function pendingSuggestions(
  notes: DocNotes,
  doc: string,
  list: readonly DocSuggestion[],
  enabled: Readonly<Record<LinkSource, boolean>>,
): DocSuggestion[] {
  if (list.length === 0) return [];
  const marks = marksOfDoc(notes, doc);
  return list.filter((item) => {
    if (!enabled[item.source]) return false;
    const spot = { doc, page: item.page, start: item.start, text: item.text };
    if (isRejected(notes, spot, item.id)) return false;
    const end = item.start + item.text.length;
    return !marks.some(
      (mark) =>
        mark.page === item.page &&
        mark.links.includes(item.id) &&
        mark.start < end &&
        mark.start + mark.text.length > item.start,
    );
  });
}
