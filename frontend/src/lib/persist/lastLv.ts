// Zuletzt geöffnete GAEB-Datei im Browser behalten (Entscheidung 0046).
//
// Genau ein Projekt: die Original-Bytes und ein paar Angaben für die Startseite.
// Das geparste LV wird nicht gespeichert; es entsteht beim Öffnen neu aus den Bytes,
// damit eine neue App-Version nie einen veralteten Baum zeigt.
//
// Alles bleibt in der IndexedDB dieses Browsers, kein Request. Fehlt IndexedDB
// (privates Fenster, gesperrte Website-Daten, Tests), gibt jede Funktion still
// `null` bzw. nichts zurück — Bubble läuft dann wie ohne Speicher.

const DB_NAME = 'bubble';
const DB_VERSION = 1;
const STORE = 'letztesLv';
// Angaben und Bytes unter getrennten Schlüsseln: die Startseite liest nur die
// Angaben und lädt bis zu 50 MB erst, wenn jemand „Öffnen" klickt.
const KEY_META = 'meta';
const KEY_BYTES = 'bytes';

export interface LastLvMeta {
  readonly fileName: string;
  readonly positionCount: number;
  /** Zeitpunkt des Speicherns in ms seit 1970. */
  readonly savedAt: number;
}

export interface LastLv {
  readonly meta: LastLvMeta;
  readonly bytes: ArrayBuffer;
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
    typeof meta.savedAt === 'number'
  );
}

// `instanceof` reicht nicht: der strukturierte Klon kann aus einem anderen
// JS-Realm kommen (Worker, Testumgebung), dann ist es ein anderer Konstruktor.
function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

/** Angaben zur gespeicherten Datei, ohne die Bytes. `null`, wenn nichts gespeichert ist. */
export async function readLastLvMeta(): Promise<LastLvMeta | null> {
  const db = await openDb();
  if (db === null) return null;
  try {
    const value: unknown = await requestResult(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_META),
    );
    return isMeta(value) ? value : null;
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
    const [meta, bytes]: unknown[] = await Promise.all([
      requestResult(store.get(KEY_META)),
      requestResult(store.get(KEY_BYTES)),
    ]);
    if (!isMeta(meta) || !isArrayBuffer(bytes)) return null;
    return { meta, bytes };
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
    // Eine Transaktion für beide Schlüssel: nie Angaben zu einer anderen Datei.
    store.put(bytes, KEY_BYTES);
    store.put({ ...meta }, KEY_META);
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

/** Löscht das gespeicherte Projekt. */
export async function clearLastLv(): Promise<void> {
  const db = await openDb();
  if (db === null) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    await transactionDone(tx);
  } catch {
    // Nichts zu tun: ohne Zugriff gibt es auch nichts, das stehen bleibt und stört.
  } finally {
    db.close();
  }
}
