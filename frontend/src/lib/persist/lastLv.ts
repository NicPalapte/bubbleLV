// Zuletzt geöffnete GAEB-Datei im Browser behalten (Entscheidung 0046).
//
// Genau ein Projekt: die Original-Bytes und ein paar Angaben für die Startseite.
// Das geparste LV wird nicht gespeichert; es entsteht beim Öffnen neu aus den Bytes,
// damit eine neue App-Version nie einen veralteten Baum zeigt.
//
// Alles bleibt in der IndexedDB dieses Browsers, kein Request. Fehlt IndexedDB
// (privates Fenster, gesperrte Website-Daten, Tests), gibt jede Funktion still
// `null` bzw. nichts zurück — Bubble läuft dann wie ohne Speicher.
//
// Seit Entscheidung 0047 liegen hier auch die eigenen Markierungen und Kommentare
// zu genau dieser Datei. Eine neue Datei beginnt ohne sie.
//
// Seit Entscheidung 0053 außerdem die Begriffe, die der Admin im Langtext gelernt
// hat. Sie hängen an keiner Datei: weder eine neue Datei noch „Letzte Datei
// löschen" nimmt sie mit.

import type { LearnedTerm } from '../highlight/terms';
import {
  commentedIds,
  EMPTY_ANNOTATIONS,
  fromStored,
  toStored,
  type Annotations,
} from '../annotations';

const DB_NAME = 'bubble';
const DB_VERSION = 1;
const STORE = 'letztesLv';
// Angaben und Bytes unter getrennten Schlüsseln: die Startseite liest nur die
// Angaben und lädt bis zu 50 MB erst, wenn jemand „Öffnen" klickt.
const KEY_META = 'meta';
const KEY_BYTES = 'bytes';
const KEY_NOTES = 'notizen';
const KEY_TERMS = 'begriffe';
/** Kennung für Einträge aus v0.14, die noch keine eigene `id` haben. */
const LEGACY_ID = 'v0.14';

export interface LastLvMeta {
  readonly fileName: string;
  readonly positionCount: number;
  /** Zeitpunkt des Speicherns in ms seit 1970. */
  readonly savedAt: number;
  /**
   * Kennung dieses gespeicherten Projekts. Notizen werden nur geschrieben, wenn
   * sie noch stimmt — so landen sie nie bei einer Datei, die inzwischen ersetzt ist.
   * Fehlt bei Einträgen aus v0.14.
   */
  readonly id?: string;
}

/** Angaben für die Startseite, mit Anzahl der eigenen Notizen. */
export interface LastLvInfo extends LastLvMeta {
  readonly marked: number;
  readonly comments: number;
}

export interface LastLv {
  readonly meta: LastLvMeta;
  readonly bytes: ArrayBuffer;
  readonly annotations: Annotations;
}

/** Kennung, unter der Notizen zu diesem Eintrag gespeichert werden. */
export function persistIdOf(meta: LastLvMeta): string {
  return meta.id ?? LEGACY_ID;
}

/** Neue Kennung für eine frisch gespeicherte Datei. */
export function newPersistId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Anfrage fehlgeschlagen'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB-Transaktion abgebrochen'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB-Transaktion fehlgeschlagen'));
  });
}

async function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    return await requestResult(request);
  } catch {
    return null;
  }
}

function isMeta(value: unknown): value is LastLvMeta {
  if (typeof value !== 'object' || value === null) return false;
  const meta = value as Record<string, unknown>;
  return (
    typeof meta.fileName === 'string' &&
    typeof meta.positionCount === 'number' &&
    typeof meta.savedAt === 'number' &&
    (meta.id === undefined || typeof meta.id === 'string')
  );
}

// `instanceof` reicht nicht: der strukturierte Klon kann aus einem anderen
// JS-Realm kommen (Worker, Testumgebung), dann ist es ein anderer Konstruktor.
function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

/** Angaben zur gespeicherten Datei, ohne die Bytes. `null`, wenn nichts gespeichert ist. */
export async function readLastLvMeta(): Promise<LastLvInfo | null> {
  const db = await openDb();
  if (db === null) return null;
  try {
    const store = db.transaction(STORE, 'readonly').objectStore(STORE);
    const [meta, notes]: unknown[] = await Promise.all([
      requestResult(store.get(KEY_META)),
      requestResult(store.get(KEY_NOTES)),
    ]);
    if (!isMeta(meta)) return null;
    const annotations = fromStored(notes);
    return {
      ...meta,
      marked: annotations.markers.size,
      comments: commentedIds(annotations).length,
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/** Gespeicherte Datei samt Bytes. `null`, wenn nichts (Vollständiges) gespeichert ist. */
export async function readLastLv(): Promise<LastLv | null> {
  const db = await openDb();
  if (db === null) return null;
  try {
    const store = db.transaction(STORE, 'readonly').objectStore(STORE);
    const [meta, bytes, notes]: unknown[] = await Promise.all([
      requestResult(store.get(KEY_META)),
      requestResult(store.get(KEY_BYTES)),
      requestResult(store.get(KEY_NOTES)),
    ]);
    if (!isMeta(meta) || !isArrayBuffer(bytes)) return null;
    return {
      meta,
      bytes,
      annotations: notes === undefined ? EMPTY_ANNOTATIONS : fromStored(notes),
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * Ersetzt das gespeicherte Projekt. Gibt zurück, ob es geklappt hat; ein voller
 * Speicher oder gesperrte Website-Daten sind kein Ladefehler.
 */
export async function saveLastLv(meta: LastLvMeta, bytes: ArrayBuffer): Promise<boolean> {
  const db = await openDb();
  if (db === null) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    // Eine Transaktion für alle Schlüssel: nie Angaben oder Notizen zu einer
    // anderen Datei. Die neue Datei beginnt ohne Notizen.
    store.put(bytes, KEY_BYTES);
    store.put({ ...meta }, KEY_META);
    store.delete(KEY_NOTES);
    await transactionDone(tx);
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Setzt nur den Zeitpunkt neu, die Bytes bleiben unberührt. Ohne gespeichertes
 * Projekt passiert nichts.
 */
export async function touchLastLv(savedAt: number): Promise<void> {
  const db = await openDb();
  if (db === null) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.get(KEY_META);
    // Schreiben direkt im Erfolgs-Callback: nach einem `await` könnte die
    // Transaktion schon abgeschlossen sein.
    request.onsuccess = () => {
      const meta: unknown = request.result;
      if (isMeta(meta)) store.put({ ...meta, savedAt }, KEY_META);
    };
    await transactionDone(tx);
  } catch {
    // Ein alter Zeitpunkt ist kein Fehler, den jemand sehen muss.
  } finally {
    db.close();
  }
}

/**
 * Speichert Markierungen und Kommentare zum gespeicherten Projekt `id`. Ist
 * inzwischen eine andere Datei gespeichert (zweiter Tab), wird nichts geschrieben.
 */
export async function saveAnnotations(id: string, annotations: Annotations): Promise<boolean> {
  const db = await openDb();
  if (db === null) return false;
  let written = false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.get(KEY_META);
    // Prüfen und Schreiben in derselben Transaktion (siehe touchLastLv).
    request.onsuccess = () => {
      const meta: unknown = request.result;
      if (!isMeta(meta) || persistIdOf(meta) !== id) return;
      store.put(toStored(annotations), KEY_NOTES);
      written = true;
    };
    await transactionDone(tx);
    return written;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Löscht das gespeicherte Projekt. Gibt zurück, ob danach sicher nichts mehr
 * gespeichert ist — die Startseite darf das Feld nur dann ausblenden.
 */
export async function clearLastLv(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return true; // ohne IndexedDB nichts gespeichert
  const db = await openDb();
  if (db === null) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    // Nicht `clear()`: die gelernten Begriffe gehören zu keiner Datei.
    for (const key of [KEY_META, KEY_BYTES, KEY_NOTES]) store.delete(key);
    await transactionDone(tx);
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

function isTerm(value: unknown): value is LearnedTerm {
  if (typeof value !== 'object' || value === null) return false;
  const term = value as Record<string, unknown>;
  return (
    typeof term.begriff === 'string' &&
    term.begriff.trim() !== '' &&
    (term.kategorie === 'material' ||
      term.kategorie === 'masse' ||
      term.kategorie === 'wichtig' ||
      term.kategorie === 'aus')
  );
}

/** Begriffe, die der Admin in diesem Browser gelernt hat. Leer ohne IndexedDB. */
export async function readLearnedTerms(): Promise<LearnedTerm[]> {
  const db = await openDb();
  if (db === null) return [];
  try {
    const stored: unknown = await requestResult(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_TERMS),
    );
    return Array.isArray(stored)
      ? stored.filter(isTerm).map(({ begriff, kategorie }) => ({ begriff, kategorie }))
      : [];
  } catch {
    return [];
  } finally {
    db.close();
  }
}

/** Ersetzt die gelernten Begriffe. Gibt zurück, ob es geklappt hat. */
export async function saveLearnedTerms(terms: readonly LearnedTerm[]): Promise<boolean> {
  const db = await openDb();
  if (db === null) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(
      terms.map(({ begriff, kategorie }) => ({ begriff, kategorie })),
      KEY_TERMS,
    );
    await transactionDone(tx);
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}
