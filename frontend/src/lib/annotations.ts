// Eigene Marker und Kommentar-Verlauf je Position (Entscheidungen 0047, 0053, 0062).
//
// In der Sitzung ist der Schlüssel die Knoten-ID der Position (lib/tree/buildTree.ts).
// Gespeichert wird unter dem Positions-Hash (Entscheidung 0055, `hashes.id`): er hängt
// am Inhalt der Datei (OZ, Text, Menge), nicht an der Reihenfolge beim Einlesen.
// Umnummerierte Positionen findet erst die Notiz-Datei wieder (lib/notesFile.ts).
// Umschlüsseln an der Grenze zum Speicher: `storageKeys` + `rekey`.
//
// Zwei unabhängige Marker (Entscheidung 0062): Fortschritt (offen → in Bearbeitung →
// fertig) und „Wichtig". Beides ist eine eigene Notiz, nicht der GAEB-Status
// (Entscheidung 0051): „Erledigt" heißt „habe ich kalkuliert", nicht „Status geändert".
//
// Dazu eigene Anstreichungen im Langtext (Entscheidung 0063): Textstelle + Farbe.
//
// Reine Funktionen über einem unveränderlichen Wert; der Zustand liegt im Viewer.
// Zeitpunkte kommen von außen, damit der Reducer rein bleibt.

import type { LVNode } from '../types/lvNode';

/** Fortschritt; „offen" ist kein Wert, sondern das Fehlen eines Eintrags. */
export type Progress = 'bearbeitung' | 'fertig';

/** Reihenfolge = Reihenfolge der Knöpfe in der Karte und der Filter oben. */
export const PROGRESS: readonly Progress[] = ['bearbeitung', 'fertig'];

export interface MarkerInfo {
  readonly label: string;
  readonly glyph: string;
  /** Farbe des Rings/Schilds am Punkt und des gedrückten Knopfs. */
  readonly fill: string;
  readonly text: string;
}

export const PROGRESS_INFO: Readonly<Record<Progress, MarkerInfo>> = {
  bearbeitung: { label: 'In Bearbeitung', glyph: '◔', fill: 'var(--blue)', text: '#fff' },
  fertig: { label: 'Erledigt', glyph: '✓', fill: 'var(--greenD)', text: '#fff' },
};

export const IMPORTANT_INFO: MarkerInfo = {
  label: 'Wichtig',
  glyph: '!',
  fill: 'var(--red)',
  text: '#fff',
};

/** Ein Eintrag im Verlauf: eigener Kommentar, Fortschritt oder „Wichtig" an/aus. */
export type LogEntry =
  | { readonly kind: 'comment'; readonly at: number; readonly text: string }
  | { readonly kind: 'progress'; readonly at: number; readonly progress: Progress | null }
  | { readonly kind: 'important'; readonly at: number; readonly on: boolean };

/** Farben zum Anstreichen; Reihenfolge = Reihenfolge der Knöpfe. */
export const PAINTS = ['gelb', 'orange', 'gruen', 'blau', 'rosa', 'lila'] as const;
export type Paint = (typeof PAINTS)[number];

export const PAINT_INFO: Readonly<Record<Paint, { label: string; fill: string }>> = {
  gelb: { label: 'Gelb', fill: 'var(--paint-gelb)' },
  orange: { label: 'Orange', fill: 'var(--paint-orange)' },
  gruen: { label: 'Grün', fill: 'var(--paint-gruen)' },
  blau: { label: 'Blau', fill: 'var(--paint-blau)' },
  rosa: { label: 'Rosa', fill: 'var(--paint-rosa)' },
  lila: { label: 'Lila', fill: 'var(--paint-lila)' },
};

/** Längere Auswahl ist kein Anstreichen mehr, sondern Kopieren. */
export const MAX_PAINT_LENGTH = 2000;

/**
 * Eine Anstreichung: `start` ist die Stelle im angezeigten Langtext (ohne `**`). Passt
 * der Text dort nicht mehr, sucht die Anzeige ihn im übrigen Langtext.
 */
export interface Highlight {
  readonly paint: Paint;
  readonly start: number;
  readonly text: string;
  readonly at: number;
}

export interface Annotations {
  readonly progress: ReadonlyMap<string, Progress>;
  readonly important: ReadonlySet<string>;
  /** Anstreichungen je Position, nach `start` sortiert; nur Positionen mit welchen. */
  readonly highlights: ReadonlyMap<string, readonly Highlight[]>;
  /** Verlauf je Position, älteste zuerst; nur Positionen mit mindestens einem Eintrag. */
  readonly log: ReadonlyMap<string, readonly LogEntry[]>;
}

export const EMPTY_ANNOTATIONS: Annotations = {
  progress: new Map(),
  important: new Set(),
  highlights: new Map(),
  log: new Map(),
};

/** Gleiche Stelle, gleicher Text: dieselbe Anstreichung. */
const sameSpot = (a: Highlight, b: Highlight): boolean => a.start === b.start && a.text === b.text;

function withHighlights(
  annotations: Annotations,
  id: string,
  list: readonly Highlight[],
): Annotations {
  const highlights = new Map(annotations.highlights);
  if (list.length === 0) highlights.delete(id);
  else
    highlights.set(
      id,
      [...list].sort((a, b) => a.start - b.start),
    );
  return { ...annotations, highlights };
}

/** Streicht eine Stelle an; dieselbe Stelle noch einmal wechselt nur die Farbe. */
export function addHighlight(annotations: Annotations, id: string, mark: Highlight): Annotations {
  if (mark.text.trim() === '' || mark.start < 0) return annotations;
  const list = annotations.highlights.get(id) ?? [];
  const same = list.find((item) => sameSpot(item, mark));
  if (same?.paint === mark.paint) return annotations;
  const rest = list.filter((item) => item !== same);
  return withHighlights(annotations, id, [...rest, mark]);
}

/** Entfernt die Anstreichung an Stelle `position` der Liste. */
export function removeHighlight(
  annotations: Annotations,
  id: string,
  position: number,
): Annotations {
  const list = annotations.highlights.get(id) ?? [];
  if (position < 0 || position >= list.length) return annotations;
  return withHighlights(
    annotations,
    id,
    list.filter((_, i) => i !== position),
  );
}

/** Anstreichungen zusammenführen (Notiz-Datei): neue dazu, gleiche Stelle → Farbe aus `more`. */
export function mergeHighlights(
  annotations: Annotations,
  id: string,
  more: readonly Highlight[],
): Annotations {
  let out = annotations;
  for (const mark of more) out = addHighlight(out, id, mark);
  return out;
}

/** „Offen" = ohne Fortschritt. */
export type ProgressFilter = Progress | 'offen';

/** Fortschritt, „Wichtig" und „Mit Kommentar" — alles, was an ist, muss zutreffen. */
export interface AnnotationFilter {
  readonly progress: ProgressFilter | null;
  readonly important: boolean;
  readonly commented: boolean;
}

export const NO_ANNOTATION_FILTER: AnnotationFilter = {
  progress: null,
  important: false,
  commented: false,
};

function withLog(annotations: Annotations, id: string, entries: readonly LogEntry[]): Annotations {
  const log = new Map(annotations.log);
  if (entries.length === 0) log.delete(id);
  else log.set(id, entries);
  return { ...annotations, log };
}

function appendLog(annotations: Annotations, id: string, entry: LogEntry): Annotations {
  return withLog(annotations, id, [...(annotations.log.get(id) ?? []), entry]);
}

/** Setzt den Fortschritt (`null` = offen) und schreibt den Wechsel in den Verlauf. */
export function setProgress(
  annotations: Annotations,
  id: string,
  progress: Progress | null,
  at: number,
): Annotations {
  if ((annotations.progress.get(id) ?? null) === progress) return annotations;
  const map = new Map(annotations.progress);
  if (progress === null) map.delete(id);
  else map.set(id, progress);
  return appendLog({ ...annotations, progress: map }, id, { kind: 'progress', at, progress });
}

/** Schaltet „Wichtig" und schreibt den Wechsel in den Verlauf. */
export function setImportant(
  annotations: Annotations,
  id: string,
  on: boolean,
  at: number,
): Annotations {
  if (annotations.important.has(id) === on) return annotations;
  const important = new Set(annotations.important);
  if (on) important.add(id);
  else important.delete(id);
  return appendLog({ ...annotations, important }, id, { kind: 'important', at, on });
}

/** Hängt einen Kommentar an; nur Leerraum zählt als nichts. */
export function addComment(
  annotations: Annotations,
  id: string,
  text: string,
  at: number,
): Annotations {
  const trimmed = text.trim();
  if (trimmed === '') return annotations;
  const entry: LogEntry = { kind: 'comment', at, text: trimmed };
  return withLog(annotations, id, [...(annotations.log.get(id) ?? []), entry]);
}

/** Entfernt den Eintrag an Stelle `position` — nur Kommentare, Marker-Wechsel bleiben. */
export function removeComment(annotations: Annotations, id: string, position: number): Annotations {
  const entries = annotations.log.get(id) ?? [];
  if (entries[position]?.kind !== 'comment') return annotations;
  return withLog(
    annotations,
    id,
    entries.filter((_, i) => i !== position),
  );
}

export function commentsOf(annotations: Annotations, id: string): string[] {
  const out: string[] = [];
  for (const entry of annotations.log.get(id) ?? []) {
    if (entry.kind === 'comment') out.push(entry.text);
  }
  return out;
}

export function hasComment(annotations: Annotations, id: string): boolean {
  return (annotations.log.get(id) ?? []).some((entry) => entry.kind === 'comment');
}

/** Positionen mit mindestens einem Kommentar. */
export function commentedIds(annotations: Annotations): string[] {
  const out: string[] = [];
  for (const id of annotations.log.keys()) if (hasComment(annotations, id)) out.push(id);
  return out;
}

/** Positionen mit Fortschritt oder „Wichtig". */
export function markedIds(annotations: Annotations): string[] {
  return [...new Set([...annotations.progress.keys(), ...annotations.important])];
}

export function markerCounts(annotations: Annotations): Record<Progress | 'wichtig', number> {
  const counts = { bearbeitung: 0, fertig: 0, wichtig: annotations.important.size };
  for (const progress of annotations.progress.values()) counts[progress]++;
  return counts;
}

/**
 * Positionen, die der Filter zulässt — `null`, wenn er aus ist. Als ID-Menge
 * vorberechnet, damit `matchPos` je Position nur einmal nachschlägt.
 * `allIds` braucht nur „Offen": dort zählen auch Positionen ohne Notiz.
 */
export function annotationAllowList(
  annotations: Annotations,
  filter: AnnotationFilter,
  allIds: Iterable<string>,
): ReadonlySet<string> | null {
  const { progress, important, commented } = filter;
  if (progress === null && !important && !commented) return null;
  let candidates: Iterable<string>;
  if (progress === 'offen') candidates = allIds;
  else if (progress !== null) candidates = annotations.progress.keys();
  else if (important) candidates = annotations.important;
  else candidates = commentedIds(annotations);

  const allowed = new Set<string>();
  for (const id of candidates) {
    const own = annotations.progress.get(id) ?? 'offen';
    if (progress !== null && own !== progress) continue;
    if (important && !annotations.important.has(id)) continue;
    if (commented && !hasComment(annotations, id)) continue;
    allowed.add(id);
  }
  return allowed;
}

/** Datum und Uhrzeit eines Eintrags, wie im Verlauf und im Export. 0 = unbekannt (v0.15). */
export function formatAt(at: number): string {
  if (at <= 0) return '';
  const date = new Date(at);
  const two = (n: number): string => String(n).padStart(2, '0');
  return (
    `${two(date.getDate())}.${two(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${two(date.getHours())}:${two(date.getMinutes())}`
  );
}

/** Knoten-ID ↔ Positions-Hash für alle Positionen eines LV. */
export interface StorageKeys {
  readonly toHash: ReadonlyMap<string, string>;
  readonly toNode: ReadonlyMap<string, string>;
}

export function storageKeys(nodes: Iterable<LVNode>): StorageKeys {
  const toHash = new Map<string, string>();
  const toNode = new Map<string, string>();
  for (const node of nodes) {
    const hash = node.position?.hashes.id;
    if (hash === undefined) continue;
    toHash.set(node.id, hash);
    toNode.set(hash, node.id);
  }
  return { toHash, toNode };
}

/**
 * Schlüssel austauschen. Unbekannte Schlüssel bleiben, wie sie sind: so gehen
 * Notizen ohne passende Position beim nächsten Speichern nicht verloren, und
 * Notizen aus v0.21 und älter (Knoten-ID) finden ihre Position direkt.
 */
export function rekey(annotations: Annotations, keys: ReadonlyMap<string, string>): Annotations {
  const { progress, important, highlights, log } = annotations;
  const empty = progress.size + important.size + highlights.size + log.size === 0;
  if (empty) return annotations;
  const key = (id: string): string => keys.get(id) ?? id;
  return {
    progress: new Map([...progress].map(([id, value]) => [key(id), value])),
    important: new Set([...important].map(key)),
    highlights: new Map([...highlights].map(([id, list]) => [key(id), list])),
    log: new Map([...log].map(([id, entries]) => [key(id), entries])),
  };
}

/**
 * Form für die IndexedDB: Arrays statt Set/Map, damit auch ältere Browser klonen.
 * `v: 5`: dazu Anstreichungen (Entscheidung 0063). `v: 4`: Fortschritt + Wichtig
 * (Entscheidung 0062). Schlüssel ist der Positions-Hash.
 * Ältere Formen liest `fromStored`: `v: 3` (drei Marker, Hash), `v: 2` (drei Marker,
 * Knoten-ID) und ohne `v` (v0.15, Entscheidung 0047).
 */
export interface StoredAnnotations {
  readonly v: 5;
  readonly progress: ReadonlyArray<readonly [string, Progress]>;
  readonly important: readonly string[];
  readonly highlights: ReadonlyArray<readonly [string, readonly Highlight[]]>;
  readonly log: ReadonlyArray<readonly [string, readonly LogEntry[]]>;
}

/** `annotations` muss schon nach Hash geschlüsselt sein (`rekey(…, keys.toHash)`). */
export function toStored(annotations: Annotations): StoredAnnotations {
  return {
    v: 5,
    progress: [...annotations.progress],
    important: [...annotations.important],
    highlights: [...annotations.highlights],
    log: [...annotations.log],
  };
}

export function isPaint(value: unknown): value is Paint {
  return (PAINTS as readonly unknown[]).includes(value);
}

/** Eine Anstreichung aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toHighlight(value: unknown): Highlight | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { paint, start, text } = raw;
  if (!isPaint(paint) || typeof text !== 'string' || text.trim() === '') return null;
  if (text.length > MAX_PAINT_LENGTH) return null;
  if (typeof start !== 'number' || !Number.isInteger(start) || start < 0) return null;
  return { paint, start, text, at: atOf(raw) };
}

export function isProgress(value: unknown): value is Progress {
  return value === 'bearbeitung' || value === 'fertig';
}

/** Marker bis v0.25: genau einer aus drei je Position. */
export type OldMarker = 'markiert' | 'wichtig' | 'erledigt';

export function isOldMarker(value: unknown): value is OldMarker {
  return value === 'markiert' || value === 'wichtig' || value === 'erledigt';
}

/** „Markiert" und „Wichtig" werden „Wichtig", „Erledigt" bleibt „Erledigt" (Fortschritt `fertig`). */
export const oldIsImportant = (marker: OldMarker | null): boolean =>
  marker === 'markiert' || marker === 'wichtig';
export const oldIsDone = (marker: OldMarker | null): boolean => marker === 'erledigt';

function atOf(raw: Record<string, unknown>): number {
  return typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
}

function commentEntry(raw: Record<string, unknown>): LogEntry | null {
  if (raw.kind !== 'comment' || typeof raw.text !== 'string' || raw.text.trim() === '') {
    return null;
  }
  return { kind: 'comment', at: atOf(raw), text: raw.text };
}

/** Ein Verlaufseintrag aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toEntry(value: unknown): LogEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.kind === 'progress' && (raw.progress === null || isProgress(raw.progress))) {
    return { kind: 'progress', at: atOf(raw), progress: raw.progress };
  }
  if (raw.kind === 'important' && typeof raw.on === 'boolean') {
    return { kind: 'important', at: atOf(raw), on: raw.on };
  }
  return commentEntry(raw);
}

/**
 * Verlauf bis v0.25 (Speicher `v: 2/3`, Notiz-Datei Version 1): ein Marker-Wechsel wird
 * zu den Wechseln, die er heute bedeutet.
 * Dazu wird der vorige Marker mitgeführt — „Marker entfernt" sagt allein nicht, was weg ist.
 */
export function toEntriesOld(entries: readonly unknown[]): LogEntry[] {
  const out: LogEntry[] = [];
  let prev: OldMarker | null = null;
  for (const value of entries) {
    if (typeof value !== 'object' || value === null) continue;
    const raw = value as Record<string, unknown>;
    if (raw.kind !== 'marker') {
      const comment = commentEntry(raw);
      if (comment !== null) out.push(comment);
      continue;
    }
    if (raw.marker !== null && !isOldMarker(raw.marker)) continue;
    const next: OldMarker | null = raw.marker;
    const at = atOf(raw);
    if (oldIsDone(prev) !== oldIsDone(next)) {
      out.push({ kind: 'progress', at, progress: oldIsDone(next) ? 'fertig' : null });
    }
    if (oldIsImportant(prev) !== oldIsImportant(next)) {
      out.push({ kind: 'important', at, on: oldIsImportant(next) });
    }
    prev = next;
  }
  return out;
}

function pairs(value: unknown): Array<[string, unknown]> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is [string, unknown] => Array.isArray(entry) && typeof entry[0] === 'string',
  );
}

function readLog(
  value: unknown,
  read: (entries: unknown[]) => LogEntry[],
): Map<string, LogEntry[]> {
  const log = new Map<string, LogEntry[]>();
  for (const [id, entries] of pairs(value)) {
    if (!Array.isArray(entries)) continue;
    const valid = read(entries);
    if (valid.length > 0) log.set(id, valid);
  }
  return log;
}

/** Gespeicherte Notizen mit ihren Schlüsseln wie gespeichert; danach `rekey(…, keys.toNode)`. */
export function fromStored(value: unknown): Annotations {
  if (typeof value !== 'object' || value === null) return EMPTY_ANNOTATIONS;
  const raw = value as Record<string, unknown>;

  if (raw.v === 4 || raw.v === 5) {
    const progress = new Map<string, Progress>();
    for (const [id, p] of pairs(raw.progress)) if (isProgress(p)) progress.set(id, p);
    const important = new Set(
      Array.isArray(raw.important)
        ? raw.important.filter((id): id is string => typeof id === 'string')
        : [],
    );
    const log = readLog(raw.log, (entries) =>
      entries.map(toEntry).filter((entry): entry is LogEntry => entry !== null),
    );
    const highlights = new Map<string, Highlight[]>();
    for (const [id, list] of pairs(raw.highlights)) {
      if (!Array.isArray(list)) continue;
      const valid = list.map(toHighlight).filter((mark): mark is Highlight => mark !== null);
      if (valid.length > 0)
        highlights.set(
          id,
          valid.sort((a, b) => a.start - b.start),
        );
    }
    return { progress, important, highlights, log };
  }

  if (raw.v === 2 || raw.v === 3) {
    const progress = new Map<string, Progress>();
    const important = new Set<string>();
    for (const [id, marker] of pairs(raw.markers)) {
      if (!isOldMarker(marker)) continue;
      if (oldIsDone(marker)) progress.set(id, 'fertig');
      else important.add(id);
    }
    return { progress, important, highlights: new Map(), log: readLog(raw.log, toEntriesOld) };
  }

  // v0.15: eine Markierung (an/aus) und ein Kommentarfeld je Position. Die
  // Markierung wird „Wichtig", der Kommentar ein Eintrag ohne Zeitpunkt.
  const marked = Array.isArray(raw.marked)
    ? raw.marked.filter((id): id is string => typeof id === 'string')
    : [];
  const log = new Map<string, LogEntry[]>();
  for (const [id, text] of pairs(raw.notes)) {
    if (typeof text === 'string' && text.trim() !== '') {
      log.set(id, [{ kind: 'comment', at: 0, text }]);
    }
  }
  return { progress: new Map(), important: new Set(marked), highlights: new Map(), log };
}
