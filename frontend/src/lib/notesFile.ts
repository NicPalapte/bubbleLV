// Notizen als Datei sichern und wieder laden (Entscheidung 0061).
//
// Eine JSON-Datei je LV: Marker und Verlauf je Position, dazu OZ, Kurztext und Menge,
// damit ein Mensch sie lesen kann und das Laden Positionen auch in einer geänderten
// Fassung wiederfindet. Zuordnung in drei Stufen (Entscheidung 0055): gleicher
// Positions-Hash, sonst gleicher Text-Fingerabdruck (umnummeriert), sonst gleiche OZ
// (Text oder Menge geändert). Mehrdeutiges wird nicht zugeordnet. Die Datei entsteht
// und wird gelesen im Browser — kein Request.

import { isMarker, toEntry, type Annotations, type LogEntry, type Marker } from './annotations';
import type { LVNode } from '../types/lvNode';

export const NOTES_FILE_KIND = 'bubble-notizen';
const NOTES_FILE_VERSION = 1;

type FileEntry =
  | { readonly zeit: string | null; readonly marker: Marker | null }
  | { readonly zeit: string | null; readonly kommentar: string };

export interface NotesFilePosition {
  readonly hash: string;
  /** Fingerabdruck aus Kurz- und Langtext, ohne OZ (`hashes.text`); leer, wenn unbekannt. */
  readonly text: string;
  readonly oz: string;
  readonly kurztext: string;
  readonly menge: number | null;
  readonly einheit: string | null;
  readonly marker: Marker | null;
  readonly verlauf: readonly LogEntry[];
}

export interface NotesFile {
  readonly datei: string;
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
  return entry.kind === 'comment'
    ? { zeit: iso(entry.at), kommentar: entry.text }
    : { zeit: iso(entry.at), marker: entry.marker };
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
): string {
  const byId = new Map<string, LVNode>();
  for (const node of nodes) if (node.position !== null) byId.set(node.id, node);
  const ids = new Set([...annotations.markers.keys(), ...annotations.log.keys()]);
  const positionen = [...ids].map((id) => {
    const position = byId.get(id)?.position ?? null;
    return {
      hash: position?.hashes.id ?? id,
      text: position?.hashes.text ?? '',
      oz: position?.oz ?? '',
      kurztext: position?.shortText ?? '',
      menge: position?.quantity ?? null,
      einheit: position?.unit ?? null,
      marker: annotations.markers.get(id) ?? null,
      verlauf: (annotations.log.get(id) ?? []).map(fileEntry),
    };
  });
  const file = {
    art: NOTES_FILE_KIND,
    version: NOTES_FILE_VERSION,
    datei: source.fileName,
    dateiId: source.fileId,
    gesichert: new Date(now).toISOString(),
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
  if ('kommentar' in raw)
    return toEntry({ kind: 'comment', at: at(raw.zeit), text: raw.kommentar });
  if ('marker' in raw) return toEntry({ kind: 'marker', at: at(raw.zeit), marker: raw.marker });
  return null;
}

function readPosition(value: unknown): NotesFilePosition | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const hash = text(raw.hash);
  if (hash === '') return null;
  const verlauf = Array.isArray(raw.verlauf)
    ? raw.verlauf.map(readEntry).filter((entry): entry is LogEntry => entry !== null)
    : [];
  const marker = isMarker(raw.marker) ? raw.marker : null;
  if (marker === null && verlauf.length === 0) return null;
  return {
    hash,
    text: text(raw.text),
    oz: text(raw.oz).trim(),
    kurztext: text(raw.kurztext),
    menge: typeof raw.menge === 'number' && Number.isFinite(raw.menge) ? raw.menge : null,
    einheit: typeof raw.einheit === 'string' ? raw.einheit : null,
    marker,
    verlauf,
  };
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
  if (file.version !== NOTES_FILE_VERSION) {
    throw new NotesFileError('Die Notiz-Datei stammt aus einer neueren Bubble-Version.');
  }
  return {
    datei: text(file.datei),
    gesichert: at(file.gesichert),
    positionen: file.positionen
      .map(readPosition)
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
  return entry.kind === 'comment'
    ? `c|${entry.at}|${entry.text}`
    : `m|${entry.at}|${entry.marker ?? ''}`;
}

/** Zuletzt gesetzter Marker laut Verlauf; `null`, wenn der Verlauf keinen kennt. */
function lastMarker(entries: readonly LogEntry[]): { marker: Marker | null; at: number } | null {
  let last: { marker: Marker | null; at: number } | null = null;
  for (const entry of entries) {
    if (entry.kind === 'marker' && (last === null || entry.at >= last.at)) {
      last = { marker: entry.marker, at: entry.at };
    }
  }
  return last;
}

/**
 * Übernimmt die Notizen aus der Datei. Kommentare werden ergänzt (gleiche bleiben
 * einmal), der Verlauf nach Zeit sortiert. Beim Marker gilt der zuletzt gesetzte.
 */
export function mergeNotes(current: Annotations, matches: readonly NotesMatch[]): Annotations {
  if (matches.length === 0) return current;
  const markers = new Map(current.markers);
  const log = new Map(current.log);
  for (const { entry, nodeId } of matches) {
    const before = log.get(nodeId) ?? [];
    const seen = new Set(before.map(entryKey));
    const added = entry.verlauf.filter((item) => !seen.has(entryKey(item)));
    // Stabil sortiert: Einträge ohne Zeitpunkt (v0.15) bleiben vorn, wie gespeichert.
    const merged = [...before, ...added].sort((a, b) => a.at - b.at);
    if (merged.length > 0) log.set(nodeId, merged);

    const mine = lastMarker(before);
    const theirs = lastMarker(entry.verlauf);
    const ownMarker = markers.get(nodeId) ?? null;
    let marker: Marker | null = ownMarker;
    if (theirs !== null && (mine === null || theirs.at > mine.at)) marker = theirs.marker;
    else if (theirs === null && mine === null && ownMarker === null) marker = entry.marker;
    if (marker === null) markers.delete(nodeId);
    else markers.set(nodeId, marker);
  }
  return { markers, log };
}

/** Anzahl der Positionen mit Marker oder Kommentar. */
export function notesCount(annotations: Annotations): number {
  return new Set([...annotations.markers.keys(), ...annotations.log.keys()]).size;
}
