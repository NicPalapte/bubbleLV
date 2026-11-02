// Eigene Wortlisten (Entscheidung 0090): Grundstock-Listen bleiben in den CSV unter
// docs/domain/reference/. In diesem Browser kommen dazu eigene Wörter, abgeschaltete
// Grundstock-Wörter und eigene Listen. Gespeichert als flache Liste von Einträgen, damit
// das Speichern dieselbe Mechanik nutzt wie die eigenen Regeln (state/admin.tsx).

import type { RuleContext } from '@core';
import { GRUNDSTOCK_LISTS, WISSEN } from './wissen';

/** Ein Eintrag: eigene Liste, eigenes Wort in einer Liste, oder Grundstock-Wort aus. */
export type WordListEntry =
  | { readonly art: 'liste'; readonly liste: string; readonly name: string }
  | { readonly art: 'wort'; readonly liste: string; readonly wort: string }
  | { readonly art: 'aus'; readonly liste: string; readonly wort: string };

/** Eine Liste so, wie der Reiter sie zeigt. */
export interface WordListView {
  readonly id: string;
  readonly name: string;
  readonly grundstock: boolean;
  /** Datei im Repo; eigene Listen haben keine. */
  readonly file: string | null;
  readonly note: string | null;
  /** Wörter aus der CSV, in Reihenfolge der Datei. */
  readonly base: readonly string[];
  /** Davon für diese Firma abgeschaltet. */
  readonly off: readonly string[];
  /** Eigene Wörter, in Reihenfolge des Hinzufügens. */
  readonly own: readonly string[];
}

/**
 * Listen, die schon beim Einlesen der Datei wirken (Klassifizierung im Worker,
 * lib/classify/extractors/platzhalter.ts). Änderungen daran gelten dort noch nicht.
 */
export const LISTS_AT_LOAD: ReadonlySet<string> = new Set(['bieterangabe', 'offenes-feld']);

const MAX_WORD = 200;
const LIST_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Ein Wort aus der Eingabe; `null` bei leer, zu lang oder mit „|“ (Trenner der CSV). */
export function cleanWord(raw: string): string | null {
  const word = raw.trim().replace(/\s+/g, ' ');
  if (word === '' || word.length > MAX_WORD || word.includes('|')) return null;
  return word;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Ein gespeicherter Eintrag; Unbrauchbares wird `null`. */
export function toWordListEntry(value: unknown): WordListEntry | null {
  if (!isObject(value) || typeof value.liste !== 'string' || !LIST_ID.test(value.liste)) {
    return null;
  }
  const { liste } = value;
  if (value.art === 'liste') {
    const name = typeof value.name === 'string' ? value.name.trim().slice(0, 100) : '';
    return name === '' ? null : { art: 'liste', liste, name };
  }
  if (value.art !== 'wort' && value.art !== 'aus') return null;
  const wort = typeof value.wort === 'string' ? cleanWord(value.wort) : null;
  return wort === null ? null : { art: value.art, liste, wort };
}

/** Gleicher Eintrag: gleiche Art, Liste und Wort (bei Listen: gleiche Kennung). */
export function sameEntry(a: WordListEntry, b: WordListEntry): boolean {
  if (a.art !== b.art || a.liste !== b.liste) return false;
  return a.art === 'liste' || (b.art !== 'liste' && a.wort === b.wort);
}

/** Alle Listen für den Reiter: Grundstock in Reihenfolge der CSV, danach eigene. */
export function wordListsOf(entries: readonly WordListEntry[]): WordListView[] {
  const words = (id: string, art: 'wort' | 'aus'): string[] =>
    entries.flatMap((entry) => (entry.art === art && entry.liste === id ? [entry.wort] : []));
  const out: WordListView[] = [...GRUNDSTOCK_LISTS].map(([id, list]) => ({
    id,
    name: id,
    grundstock: true,
    file: list.file,
    note: list.note ?? null,
    base: list.words,
    off: words(id, 'aus').filter((word) => list.words.includes(word)),
    own: words(id, 'wort'),
  }));
  for (const entry of entries) {
    if (entry.art !== 'liste' || GRUNDSTOCK_LISTS.has(entry.liste)) continue;
    if (out.some((list) => list.id === entry.liste)) continue;
    out.push({
      id: entry.liste,
      name: entry.name,
      grundstock: false,
      file: null,
      note: null,
      base: [],
      off: [],
      own: words(entry.liste, 'wort'),
    });
  }
  return out;
}

/** Wörter, mit denen die Regeln suchen: Grundstock ohne abgeschaltete, dazu eigene. */
export function effectiveWords(list: WordListView): string[] {
  return [...list.base.filter((word) => !list.off.includes(word)), ...list.own];
}

/** Listen, deren Wörter vom Grundstock abweichen — eigene Listen immer. */
export function changedLists(entries: readonly WordListEntry[]): Set<string> {
  return new Set(
    wordListsOf(entries)
      .filter((list) => !list.grundstock || list.off.length > 0 || list.own.length > 0)
      .map((list) => list.id),
  );
}

/**
 * Kontext für den Auswerter mit den Listen dieser Firma. Ohne Einträge der Kontext des
 * Grundstocks selbst — so bleiben Zwischenspeicher, die am Objekt hängen, gültig.
 */
export function contextWith(entries: readonly WordListEntry[]): RuleContext {
  if (entries.length === 0) return WISSEN;
  const listen = new Map(WISSEN.listen);
  for (const list of wordListsOf(entries)) listen.set(list.id, effectiveWords(list));
  return { ...WISSEN, listen };
}

/** Freie Kennung für eine eigene Liste aus ihrem Namen, z. B. „Wasser im Baugrund“. */
export function listIdOf(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'liste';
  let id = `eigene-${base}`;
  for (let n = 2; taken.has(id); n++) id = `eigene-${base}-${n}`;
  return id;
}

/** CSV im Format der wortlisten.csv: geänderte und eigene Listen, zum Übernehmen ins Repo. */
export function wordListsCsv(entries: readonly WordListEntry[]): string {
  const quote = (text: string): string =>
    /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  const changed = changedLists(entries);
  const rows = wordListsOf(entries)
    .filter((list) => changed.has(list.id))
    .map((list) =>
      [list.id, effectiveWords(list).join('|'), list.grundstock ? (list.note ?? '') : list.name]
        .map(quote)
        .join(','),
    );
  return `${['liste,stichworte,bemerkung', ...rows].join('\n')}\n`;
}
