// Notizen als Datei sichern und wieder laden (Entscheidung 0061).
//
// Eine JSON-Datei je LV: Fortschritt, „Wichtig" und Verlauf je Position (Entscheidung
// 0062), dazu OZ, Kurztext und Menge, damit ein Mensch sie lesen kann und das Laden
// Positionen auch in einer geänderten Fassung wiederfindet. Seit Version 3 auch die
// Anstreichungen im Langtext (Entscheidung 0063). Zuordnung in drei Stufen
// (Entscheidung 0055): gleicher Positions-Hash, sonst gleicher Text-Fingerabdruck
// (umnummeriert), sonst gleiche OZ (Text oder Menge geändert). Mehrdeutiges wird
// nicht zugeordnet. Die Datei entsteht und wird gelesen im Browser — kein Request.

import {
  isOldMarker,
  isProgress,
  markedIds,
  mergeHighlights,
  toHighlight,
  oldIsDone,
  oldIsImportant,
  toEntriesOld,
  toEntry,
  type Annotations,
  type Highlight,
  type Paint,
  type LogEntry,
  type Progress,
} from './annotations';
import { NO_PAINT_NAMES, toPaintNames, type PaintNames } from './paintNames';
import type { LVNode } from '../types/lvNode';

export const NOTES_FILE_KIND = 'bubble-notizen';
/**
 * Version 3: dazu Anstreichungen (0063). Version 2: Fortschritt + Wichtig (0062).
 * Ältere Versionen werden gelesen, Version 1 (drei Marker) umgedeutet.
 */
const NOTES_FILE_VERSION = 3;

interface FilePaint {
  readonly farbe: Paint;
  readonly start: number;
  readonly text: string;
  readonly zeit: string | null;
}

type FileEntry =
  | { readonly zeit: string | null; readonly fortschritt: Progress | null }
  | { readonly zeit: string | null; readonly wichtig: boolean }
  | { readonly zeit: string | null; readonly kommentar: string };

export interface NotesFilePosition {
  readonly hash: string;
  /** Fingerabdruck aus Kurz- und Langtext, ohne OZ (`hashes.text`); leer, wenn unbekannt. */
  readonly text: string;
  readonly oz: string;
  readonly kurztext: string;
  readonly menge: number | null;
  readonly einheit: string | null;
  readonly fortschritt: Progress | null;
  readonly wichtig: boolean;
  readonly anstreichungen: readonly Highlight[];
  readonly verlauf: readonly LogEntry[];
}

export interface NotesFile {
  readonly datei: string;
  /** Eigene Namen der Markierfarben (Entscheidung 0063). */
  readonly farben: PaintNames;
  readonly gesichert: number;
  readonly positionen: readonly NotesFilePosition[];
}

/** Datei ist keine Notiz-Datei oder kaputt. Die Meldung ist für Menschen. */
export class NotesFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotesFileError';
  }
}

interface Source {
  readonly fileName: string;
  readonly fileId: string | null;
}

function iso(at: number): string | null {
  return at > 0 ? new Date(at).toISOString() : null;
}

function fileEntry(entry: LogEntry): FileEntry {
  const zeit = iso(entry.at);
  if (entry.kind === 'comment') return { zeit, kommentar: entry.text };
  if (entry.kind === 'progress') return { zeit, fortschritt: entry.progress };
  return { zeit, wichtig: entry.on };
}

/**
 * Text der Notiz-Datei. `annotations` ist nach Knoten-ID geschlüsselt, wie in der
 * Sitzung. Schlüssel ohne Position (alte Notizen, Entscheidung 0057) kommen mit,
 * nur mit Hash — so geht beim Sichern nichts verloren.
 */
export function notesFileText(
  annotations: Annotations,
  nodes: Iterable<LVNode>,
  source: Source,
  now: number,
  names: PaintNames = NO_PAINT_NAMES,
): string {
  const byId = new Map<string, LVNode>();
  for (const node of nodes) if (node.position !== null) byId.set(node.id, node);
  const ids = new Set([
    ...markedIds(annotations),
    ...annotations.highlights.keys(),
    ...annotations.log.keys(),
  ]);
  const positionen = [...ids].map((id) => {
    const position = byId.get(id)?.position ?? null;
    return {
      hash: position?.hashes.id ?? id,
      text: position?.hashes.text ?? '',
      oz: position?.oz ?? '',
      kurztext: position?.shortText ?? '',
      menge: position?.quantity ?? null,
      einheit: position?.unit ?? null,
      fortschritt: annotations.progress.get(id) ?? null,
      wichtig: annotations.important.has(id),
      anstreichungen: (annotations.highlights.get(id) ?? []).map((mark): FilePaint => ({
        farbe: mark.paint,
        start: mark.start,
        text: mark.text,
        zeit: iso(mark.at),
      })),
      verlauf: (annotations.log.get(id) ?? []).map(fileEntry),
    };
  });
  const file = {
    art: NOTES_FILE_KIND,
    version: NOTES_FILE_VERSION,
    datei: source.fileName,
    dateiId: source.fileId,
    gesichert: new Date(now).toISOString(),
    farben: names,
    positionen,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function at(value: unknown): number {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function readEntry(value: unknown): LogEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const zeit = at(raw.zeit);
  if ('kommentar' in raw) return toEntry({ kind: 'comment', at: zeit, text: raw.kommentar });
  if ('fortschritt' in raw)
    return toEntry({ kind: 'progress', at: zeit, progress: raw.fortschritt });
  if ('wichtig' in raw) return toEntry({ kind: 'important', at: zeit, on: raw.wichtig });
  return null;
}

/** Version 1: drei Marker; Verlauf und Stand werden wie im Speicher umgedeutet. */
function readVerlaufV1(value: unknown): LogEntry[] {
  if (!Array.isArray(value)) return [];
  return toEntriesOld(
    value.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) return null;
      const raw = item as Record<string, unknown>;
      const zeit = at(raw.zeit);
      if ('kommentar' in raw) return { kind: 'comment', at: zeit, text: raw.kommentar };
      if ('marker' in raw) return { kind: 'marker', at: zeit, marker: raw.marker };
      return null;
    }),
  );
}

function readPosition(value: unknown, version: number): NotesFilePosition | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const hash = text(raw.hash);
  if (hash === '') return null;
  let verlauf: LogEntry[];
  let fortschritt: Progress | null;
  let wichtig: boolean;
  if (version === 1) {
    verlauf = readVerlaufV1(raw.verlauf);
    const marker = isOldMarker(raw.marker) ? raw.marker : null;
    fortschritt = oldIsDone(marker) ? 'fertig' : null;
    wichtig = oldIsImportant(marker);
  } else {
    verlauf = Array.isArray(raw.verlauf)
      ? raw.verlauf.map(readEntry).filter((entry): entry is LogEntry => entry !== null)
      : [];
    fortschritt = isProgress(raw.fortschritt) ? raw.fortschritt : null;
    wichtig = raw.wichtig === true;
  }
  const anstreichungen = Array.isArray(raw.anstreichungen)
    ? raw.anstreichungen
        .map((item: unknown) => {
          if (typeof item !== 'object' || item === null) return null;
          const paint = item as Record<string, unknown>;
          return toHighlight({
            paint: paint.farbe,
            start: paint.start,
            text: paint.text,
            at: at(paint.zeit),
          });
        })
        .filter((mark): mark is Highlight => mark !== null)
    : [];
  const leer = fortschritt === null && !wichtig && anstreichungen.length === 0;
  if (leer && verlauf.length === 0) return null;
  return {
    hash,
    text: text(raw.text),
    oz: text(raw.oz).trim(),
    kurztext: text(raw.kurztext),
    menge: typeof raw.menge === 'number' && Number.isFinite(raw.menge) ? raw.menge : null,
    einheit: typeof raw.einheit === 'string' ? raw.einheit : null,
    fortschritt,
    wichtig,
    anstreichungen,
    verlauf,
  };
}

/**
 * Obergrenze für eine Notiz-Datei. Selbst 10k Positionen mit langen Kommentaren bleiben
 * weit darunter; größere Dateien würden den Tab beim Lesen nur einfrieren.
 */
export const MAX_NOTES_FILE_BYTES = 20 * 1024 * 1024;

/** Liest eine Notiz-Datei aus dem Dateidialog. Wirft `NotesFileError` bei zu großer Datei. */
export async function readNotesFile(file: Blob): Promise<NotesFile> {
  if (file.size > MAX_NOTES_FILE_BYTES) {
    throw new NotesFileError('Die Datei ist zu groß für eine Notiz-Datei (höchstens 20 MB).');
  }
  return parseNotesFile(await file.text());
}

/** Liest eine Notiz-Datei. Wirft `NotesFileError`, wenn es keine ist. */
export function parseNotesFile(content: string): NotesFile {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new NotesFileError('Die Datei ist keine Notiz-Datei von Bubble.');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new NotesFileError('Die Datei ist keine Notiz-Datei von Bubble.');
  }
  const file = raw as Record<string, unknown>;
  if (file.art !== NOTES_FILE_KIND || !Array.isArray(file.positionen)) {
    throw new NotesFileError('Die Datei ist keine Notiz-Datei von Bubble.');
  }
  const version = file.version;
  if (version !== 1 && version !== 2 && version !== NOTES_FILE_VERSION) {
    throw new NotesFileError('Die Notiz-Datei stammt aus einer neueren Bubble-Version.');
  }
  return {
    datei: text(file.datei),
    gesichert: at(file.gesichert),
    farben: toPaintNames(file.farben),
    positionen: file.positionen
      .map((position) => readPosition(position, version))
      .filter((position): position is NotesFilePosition => position !== null),
  };
}

export interface NotesMatch {
  readonly entry: NotesFilePosition;
  readonly nodeId: string;
  /** Die Position im LV, um sie in der Liste zu zeigen. */
  readonly node: LVNode;
}

export interface NotesMatching {
  /** Gleicher Positions-Hash: OZ, Text und Menge unverändert. */
  readonly same: readonly NotesMatch[];
  /** Gleicher Text unter anderer OZ: umnummeriert. */
  readonly moved: readonly NotesMatch[];
  /** Hash und Text anders, aber genau eine Position mit dieser OZ. */
  readonly changed: readonly NotesMatch[];
  readonly missing: readonly NotesFilePosition[];
}

/** Ordnet die Einträge der Datei den Positionen des geladenen LV zu. */
export function matchNotes(file: NotesFile, nodes: Iterable<LVNode>): NotesMatching {
  const byHash = new Map<string, LVNode>();
  const byText = new Map<string, LVNode | null>();
  const byOz = new Map<string, LVNode | null>();
  // Doppelter Text oder doppelte OZ: keine eindeutige Zuordnung (`null`), dann lieber
  // „nicht gefunden" als die Notiz an die falsche Position hängen.
  const unique = (map: Map<string, LVNode | null>, key: string, node: LVNode): void => {
    map.set(key, map.has(key) ? null : node);
  };
  for (const node of nodes) {
    if (node.position === null) continue;
    byHash.set(node.position.hashes.id, node);
    unique(byText, node.position.hashes.text, node);
    unique(byOz, node.position.oz.trim(), node);
  }
  const same: NotesMatch[] = [];
  const moved: NotesMatch[] = [];
  const changed: NotesMatch[] = [];
  const missing: NotesFilePosition[] = [];
  // Jede Position bekommt höchstens einen Eintrag der Datei, sonst mischen sich die
  // Notizen zweier Positionen. Gleicher Hash hat Vorrang, dann Text, dann OZ.
  const vergeben = new Set<string>();
  const nimm = (list: NotesMatch[], entry: NotesFilePosition, node: LVNode): void => {
    vergeben.add(node.id);
    list.push({ entry, nodeId: node.id, node });
  };
  let offen: NotesFilePosition[] = [];
  for (const entry of file.positionen) {
    const exact = byHash.get(entry.hash);
    if (exact !== undefined && !vergeben.has(exact.id)) nimm(same, entry, exact);
    else offen.push(entry);
  }
  // Auch auf Seite der Datei eindeutig: zwei Einträge mit gleichem Text (oder gleicher
  // OZ) könnten beide passen — dann keiner.
  const stufe = (
    map: Map<string, LVNode | null>,
    keyOf: (entry: NotesFilePosition) => string,
    list: NotesMatch[],
  ): void => {
    const anzahl = new Map<string, number>();
    for (const entry of offen) anzahl.set(keyOf(entry), (anzahl.get(keyOf(entry)) ?? 0) + 1);
    const rest: NotesFilePosition[] = [];
    for (const entry of offen) {
      const key = keyOf(entry);
      const node = key === '' || anzahl.get(key) !== 1 ? null : (map.get(key) ?? null);
      if (node !== null && !vergeben.has(node.id)) nimm(list, entry, node);
      else rest.push(entry);
    }
    offen = rest;
  };
  stufe(byText, (entry) => entry.text, moved);
  stufe(byOz, (entry) => entry.oz, changed);
  missing.push(...offen);
  return { same, moved, changed, missing };
}

function entryKey(entry: LogEntry): string {
  if (entry.kind === 'comment') return `c|${entry.at}|${entry.text}`;
  if (entry.kind === 'progress') return `p|${entry.at}|${entry.progress ?? ''}`;
  return `w|${entry.at}|${entry.on}`;
}

interface Change<T> {
  readonly at: number;
  readonly value: T;
}

/** Letzter Wechsel laut Verlauf; `read` gibt `undefined` für Einträge anderer Art. */
function lastChange<T>(
  entries: readonly LogEntry[],
  read: (entry: LogEntry) => T | undefined,
): Change<T> | null {
  let last: Change<T> | null = null;
  for (const entry of entries) {
    const value = read(entry);
    if (value !== undefined && (last === null || entry.at >= last.at)) {
      last = { at: entry.at, value };
    }
  }
  return last;
}

const progressOf = (entry: LogEntry): Progress | null | undefined =>
  entry.kind === 'progress' ? entry.progress : undefined;
const importantOf = (entry: LogEntry): boolean | undefined =>
  entry.kind === 'important' ? entry.on : undefined;

/**
 * Wert aus Datei oder Sitzung: der zuletzt gesetzte gewinnt. Kennt kein Verlauf einen
 * Wechsel und ist in der Sitzung nichts gesetzt, gilt der Stand aus der Datei.
 */
function pick<T>(
  own: T,
  none: T,
  fromFile: T,
  mine: Change<T> | null,
  theirs: Change<T> | null,
): T {
  if (theirs !== null && (mine === null || theirs.at > mine.at)) return theirs.value;
  if (theirs === null && mine === null && own === none) return fromFile;
  return own;
}

/**
 * Übernimmt die Notizen aus der Datei. Kommentare werden ergänzt (gleiche bleiben
 * einmal), der Verlauf nach Zeit sortiert. Bei Fortschritt und „Wichtig" gilt je der
 * zuletzt gesetzte Stand.
 */
export function mergeNotes(current: Annotations, matches: readonly NotesMatch[]): Annotations {
  if (matches.length === 0) return current;
  const progress = new Map(current.progress);
  const important = new Set(current.important);
  const log = new Map(current.log);
  for (const { entry, nodeId } of matches) {
    const before = log.get(nodeId) ?? [];
    const seen = new Set(before.map(entryKey));
    const added = entry.verlauf.filter((item) => !seen.has(entryKey(item)));
    // Stabil sortiert: Einträge ohne Zeitpunkt (v0.15) bleiben vorn, wie gespeichert.
    const merged = [...before, ...added].sort((a, b) => a.at - b.at);
    if (merged.length > 0) log.set(nodeId, merged);

    const p = pick(
      progress.get(nodeId) ?? null,
      null,
      entry.fortschritt,
      lastChange(before, progressOf),
      lastChange(entry.verlauf, progressOf),
    );
    if (p === null) progress.delete(nodeId);
    else progress.set(nodeId, p);

    const w = pick(
      important.has(nodeId),
      false,
      entry.wichtig,
      lastChange(before, importantOf),
      lastChange(entry.verlauf, importantOf),
    );
    if (w) important.add(nodeId);
    else important.delete(nodeId);
  }
  let out: Annotations = { ...current, progress, important, log };
  for (const { entry, nodeId } of matches) {
    out = mergeHighlights(out, nodeId, entry.anstreichungen);
  }
  return out;
}

/** Anzahl der Positionen mit Marker oder Kommentar. */
export function notesCount(annotations: Annotations): number {
  return new Set([
    ...markedIds(annotations),
    ...annotations.highlights.keys(),
    ...annotations.log.keys(),
  ]).size;
}
