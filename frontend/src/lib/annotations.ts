// Eigene Marker und Kommentar-Verlauf je Position (Entscheidungen 0047, 0053).
//
// In der Sitzung ist der Schlüssel die Knoten-ID der Position (lib/tree/buildTree.ts).
// Gespeichert wird unter dem Positions-Hash (Entscheidung 0055, `hashes.id`): er hängt
// am Inhalt, nicht an OZ und Reihenfolge, und passt so auch nach Umnummerieren.
// Umschlüsseln an der Grenze zum Speicher: `storageKeys` + `rekey`.
//
// Ein Marker ist eine eigene Notiz, nicht der GAEB-Status (Entscheidung 0051):
// „Erledigt" heißt „habe ich kalkuliert", nicht „Status geändert".
//
// Reine Funktionen über einem unveränderlichen Wert; der Zustand liegt im Viewer.
// Zeitpunkte kommen von außen, damit der Reducer rein bleibt.

import type { LVNode } from '../types/lvNode';

export type Marker = 'markiert' | 'wichtig' | 'erledigt';

/** Reihenfolge = Reihenfolge der Knöpfe in der Karte und der Filter oben. */
export const MARKERS: readonly Marker[] = ['markiert', 'wichtig', 'erledigt'];

export interface MarkerInfo {
  readonly label: string;
  readonly glyph: string;
  /** Füllung des Schilds am Punkt und des gedrückten Knopfs. */
  readonly fill: string;
  readonly text: string;
}

export const MARKER_INFO: Readonly<Record<Marker, MarkerInfo>> = {
  markiert: { label: 'Markiert', glyph: '⚑', fill: 'var(--ink)', text: 'var(--surface)' },
  wichtig: { label: 'Wichtig', glyph: '!', fill: 'var(--red)', text: '#fff' },
  erledigt: { label: 'Erledigt', glyph: '✓', fill: 'var(--greenD)', text: '#fff' },
};

/** Ein Eintrag im Verlauf: eigener Kommentar oder Wechsel des Markers. */
export type LogEntry =
  | { readonly kind: 'comment'; readonly at: number; readonly text: string }
  | { readonly kind: 'marker'; readonly at: number; readonly marker: Marker | null };

export interface Annotations {
  readonly markers: ReadonlyMap<string, Marker>;
  /** Verlauf je Position, älteste zuerst; nur Positionen mit mindestens einem Eintrag. */
  readonly log: ReadonlyMap<string, readonly LogEntry[]>;
}

export const EMPTY_ANNOTATIONS: Annotations = { markers: new Map(), log: new Map() };

/** Filter „Nicht erledigt": alles außer Erledigt, auch Positionen ohne Marker. */
export type MarkerFilter = Marker | 'offen';

/** Marker-Filter und „Mit Kommentar" — beide an heißt: beides muss zutreffen. */
export interface AnnotationFilter {
  readonly marker: MarkerFilter | null;
  readonly commented: boolean;
}

export const NO_ANNOTATION_FILTER: AnnotationFilter = { marker: null, commented: false };

function withLog(annotations: Annotations, id: string, entries: readonly LogEntry[]): Annotations {
  const log = new Map(annotations.log);
  if (entries.length === 0) log.delete(id);
  else log.set(id, entries);
  return { ...annotations, log };
}

/** Setzt den Marker (`null` nimmt ihn weg) und schreibt den Wechsel in den Verlauf. */
export function setMarker(
  annotations: Annotations,
  id: string,
  marker: Marker | null,
  at: number,
): Annotations {
  if ((annotations.markers.get(id) ?? null) === marker) return annotations;
  const markers = new Map(annotations.markers);
  if (marker === null) markers.delete(id);
  else markers.set(id, marker);
  const entries = [...(annotations.log.get(id) ?? []), { kind: 'marker', at, marker } as const];
  return withLog({ ...annotations, markers }, id, entries);
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

export function markerCounts(annotations: Annotations): Record<Marker, number> {
  const counts: Record<Marker, number> = { markiert: 0, wichtig: 0, erledigt: 0 };
  for (const marker of annotations.markers.values()) counts[marker]++;
  return counts;
}

/**
 * Positionen, die der Filter zulässt — `null`, wenn er aus ist. Als ID-Menge
 * vorberechnet, damit `matchPos` je Position nur einmal nachschlägt.
 * `allIds` braucht nur „Nicht erledigt": dort zählen auch Positionen ohne Notiz.
 */
export function annotationAllowList(
  annotations: Annotations,
  filter: AnnotationFilter,
  allIds: Iterable<string>,
): ReadonlySet<string> | null {
  if (filter.marker === null && !filter.commented) return null;
  let candidates: Iterable<string>;
  if (filter.marker === null) candidates = commentedIds(annotations);
  else if (filter.marker === 'offen') candidates = allIds;
  else candidates = annotations.markers.keys();

  const allowed = new Set<string>();
  for (const id of candidates) {
    const marker = annotations.markers.get(id);
    if (filter.marker === 'offen' && marker === 'erledigt') continue;
    if (filter.marker !== null && filter.marker !== 'offen' && marker !== filter.marker) continue;
    if (filter.commented && !hasComment(annotations, id)) continue;
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
  if (annotations.markers.size === 0 && annotations.log.size === 0) return annotations;
  const key = (id: string): string => keys.get(id) ?? id;
  return {
    markers: new Map([...annotations.markers].map(([id, marker]) => [key(id), marker])),
    log: new Map([...annotations.log].map(([id, entries]) => [key(id), entries])),
  };
}

/**
 * Form für die IndexedDB: Arrays statt Set/Map, damit auch ältere Browser klonen.
 * `v: 3`: Schlüssel ist der Positions-Hash. `v: 2` (drei Marker) und ohne `v`
 * (v0.15, Entscheidung 0047) tragen die Knoten-ID.
 */
export interface StoredAnnotations {
  readonly v: 3;
  readonly markers: ReadonlyArray<readonly [string, Marker]>;
  readonly log: ReadonlyArray<readonly [string, readonly LogEntry[]]>;
}

/** `annotations` muss schon nach Hash geschlüsselt sein (`rekey(…, keys.toHash)`). */
export function toStored(annotations: Annotations): StoredAnnotations {
  return { v: 3, markers: [...annotations.markers], log: [...annotations.log] };
}

function isMarker(value: unknown): value is Marker {
  return value === 'markiert' || value === 'wichtig' || value === 'erledigt';
}

function toEntry(value: unknown): LogEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  if (raw.kind === 'comment' && typeof raw.text === 'string' && raw.text.trim() !== '') {
    return { kind: 'comment', at, text: raw.text };
  }
  if (raw.kind === 'marker' && (raw.marker === null || isMarker(raw.marker))) {
    return { kind: 'marker', at, marker: raw.marker };
  }
  return null;
}

function pairs(value: unknown): Array<[string, unknown]> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is [string, unknown] => Array.isArray(entry) && typeof entry[0] === 'string',
  );
}

/** Gespeicherte Notizen mit ihren Schlüsseln wie gespeichert; danach `rekey(…, keys.toNode)`. */
export function fromStored(value: unknown): Annotations {
  if (typeof value !== 'object' || value === null) return EMPTY_ANNOTATIONS;
  const raw = value as Record<string, unknown>;

  if (raw.v !== 2 && raw.v !== 3) {
    // v0.15: eine Markierung (an/aus) und ein Kommentarfeld je Position. Die
    // Markierung wird „Markiert", der Kommentar ein Eintrag ohne Zeitpunkt.
    const marked = Array.isArray(raw.marked)
      ? raw.marked.filter((id): id is string => typeof id === 'string')
      : [];
    const log = new Map<string, LogEntry[]>();
    for (const [id, text] of pairs(raw.notes)) {
      if (typeof text === 'string' && text.trim() !== '') {
        log.set(id, [{ kind: 'comment', at: 0, text }]);
      }
    }
    return { markers: new Map(marked.map((id) => [id, 'markiert' as const])), log };
  }

  const markers = new Map<string, Marker>();
  for (const [id, marker] of pairs(raw.markers)) if (isMarker(marker)) markers.set(id, marker);
  const log = new Map<string, LogEntry[]>();
  for (const [id, entries] of pairs(raw.log)) {
    if (!Array.isArray(entries)) continue;
    const valid = entries.map(toEntry).filter((entry): entry is LogEntry => entry !== null);
    if (valid.length > 0) log.set(id, valid);
  }
  return { markers, log };
}
