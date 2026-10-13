// Speicher für die zuletzt geöffnete Datei (Entscheidung 0046).

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_ANNOTATIONS, setNote, toggleMark } from '../../src/lib/annotations';
import {
  clearLastLv,
  newPersistId,
  persistIdOf,
  readLastLv,
  readLastLvMeta,
  saveAnnotations,
  saveLastLv,
  touchLastLv,
} from '../../src/lib/persist/lastLv';

const meta = { fileName: 'rohbau.x83', positionCount: 12, savedAt: 1_760_000_000_000 };
/** Angaben für die Startseite: ohne Notizen zählen beide Zähler 0. */
const info = { ...meta, marked: 0, comments: 0 };

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('letzte Datei', () => {
  it('ist anfangs leer', async () => {
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLastLv()).toBeNull();
  });

  it('speichert Angaben und Bytes und liest sie zurück', async () => {
    expect(await saveLastLv(meta, bytesOf('<GAEB/>'))).toBe(true);
    expect(await readLastLvMeta()).toEqual(info);
    const last = await readLastLv();
    expect(last?.meta).toEqual(meta);
    expect(new TextDecoder().decode(last?.bytes)).toBe('<GAEB/>');
  });

  it('ersetzt beim zweiten Speichern das erste Projekt', async () => {
    await saveLastLv(meta, bytesOf('alt'));
    await saveLastLv({ ...meta, fileName: 'neu.x84' }, bytesOf('neu'));
    const last = await readLastLv();
    expect(last?.meta.fileName).toBe('neu.x84');
    expect(new TextDecoder().decode(last?.bytes)).toBe('neu');
  });

  it('löscht alles', async () => {
    await saveLastLv(meta, bytesOf('x'));
    await clearLastLv();
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLastLv()).toBeNull();
  });

  it('läuft ohne IndexedDB still weiter', async () => {
    // @ts-expect-error -- privates Fenster / gesperrte Website-Daten nachstellen
    delete globalThis.indexedDB;
    expect(await saveLastLv(meta, bytesOf('x'))).toBe(false);
    expect(await readLastLvMeta()).toBeNull();
    await expect(clearLastLv()).resolves.toBe(true);
  });
});

describe('letzte Datei — Randfälle', () => {
  it('aktualisiert beim Antippen nur den Zeitpunkt', async () => {
    await saveLastLv(meta, bytesOf('inhalt'));
    await touchLastLv(meta.savedAt + 1000);
    const last = await readLastLv();
    expect(last?.meta).toEqual({ ...meta, savedAt: meta.savedAt + 1000 });
    expect(new TextDecoder().decode(last?.bytes)).toBe('inhalt');
  });

  it('legt beim Antippen ohne gespeichertes Projekt nichts an', async () => {
    await touchLastLv(1);
    expect(await readLastLvMeta()).toBeNull();
  });

  it('meldet false, wenn das Speichern scheitert', async () => {
    // Eine Funktion lässt sich nicht klonen: `put` wirft DataCloneError.
    const kaputt = { ...meta, extra: () => undefined } as unknown as typeof meta;
    expect(await saveLastLv(kaputt, bytesOf('x'))).toBe(false);
    expect(await readLastLvMeta()).toBeNull();
  });

  it('liefert null, wenn zu den Angaben die Bytes fehlen', async () => {
    await saveLastLv(meta, bytesOf('x'));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('bubble');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('letztesLv', 'readwrite');
      tx.objectStore('letztesLv').delete('bytes');
      tx.oncomplete = () => resolve();
    });
    db.close();
    expect(await readLastLvMeta()).toEqual(info);
    expect(await readLastLv()).toBeNull();
  });

  it('meldet false, wenn das Löschen scheitert', async () => {
    await saveLastLv(meta, bytesOf('x'));
    const echt = globalThis.indexedDB;
    globalThis.indexedDB = {
      open: () => {
        throw new Error('gesperrt');
      },
    } as unknown as IDBFactory;
    expect(await clearLastLv()).toBe(false);
    globalThis.indexedDB = echt;
    expect(await readLastLvMeta()).toEqual(info);
  });
});

describe('letzte Datei — Markierungen und Kommentare', () => {
  const notizen = setNote(toggleMark(EMPTY_ANNOTATIONS, 'p:1'), 'p:2', 'Boden prüfen');

  it('speichert Notizen zur Datei und zählt sie für die Startseite', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    expect(await saveAnnotations(id, notizen)).toBe(true);

    expect(await readLastLvMeta()).toEqual({ ...meta, id, marked: 1, comments: 1 });
    const last = await readLastLv();
    expect([...(last?.annotations.marked ?? [])]).toEqual(['p:1']);
    expect(last?.annotations.notes.get('p:2')).toBe('Boden prüfen');
  });

  it('schreibt nichts, wenn inzwischen eine andere Datei gespeichert ist', async () => {
    const alt = newPersistId();
    await saveLastLv({ ...meta, id: alt }, bytesOf('x'));
    await saveLastLv({ ...meta, fileName: 'neu.x83', id: newPersistId() }, bytesOf('y'));

    expect(await saveAnnotations(alt, notizen)).toBe(false);
    expect((await readLastLv())?.annotations).toEqual(EMPTY_ANNOTATIONS);
  });

  it('beginnt mit einer neuen Datei ohne Notizen', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    await saveAnnotations(id, notizen);
    await saveLastLv({ ...meta, id: newPersistId() }, bytesOf('y'));

    expect(await readLastLvMeta()).toMatchObject({ marked: 0, comments: 0 });
  });

  it('nimmt Einträge aus v0.14 ohne eigene Kennung an', async () => {
    await saveLastLv(meta, bytesOf('x'));
    expect(await saveAnnotations(persistIdOf(meta), notizen)).toBe(true);
    expect(await readLastLvMeta()).toMatchObject({ marked: 1, comments: 1 });
  });

  it('behält die Kennung beim Antippen', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    await touchLastLv(meta.savedAt + 1);
    expect(await saveAnnotations(id, notizen)).toBe(true);
  });
});
