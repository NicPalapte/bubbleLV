// Speicher für die zuletzt geöffnete Datei (Entscheidung 0046).

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addComment, commentsOf, EMPTY_ANNOTATIONS, setImportant } from '../../src/lib/annotations';
import {
  clearLastLv,
  newPersistId,
  persistIdOf,
  readLastLv,
  readLastLvMeta,
  readLearnedTerms,
  readWorkspace,
  saveAnnotations,
  saveLastLv,
  saveLearnedTerms,
  saveWorkspace,
  touchLastLv,
} from '../../src/lib/persist/lastLv';
import { INITIAL_WORKSPACE } from '../../src/state/viewState';
import { edgePane, toStoredWorkspace } from '../../src/lib/workspace/split';

const meta = { fileName: 'rohbau.x83', positionCount: 12, savedAt: 1_760_000_000_000 };
/** Angaben für die Startseite: ohne Notizen zählen beide Zähler 0. */
const info = { ...meta, marked: 0, comments: 0, painted: 0, docMarks: 0 };

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
  const notizen = addComment(
    setImportant(EMPTY_ANNOTATIONS, 'p:1', true, 1),
    'p:2',
    'Boden prüfen',
    2,
  );

  it('speichert Notizen zur Datei und zählt sie für die Startseite', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    expect(await saveAnnotations(id, notizen)).toBe(true);

    expect(await readLastLvMeta()).toEqual({
      ...meta,
      id,
      marked: 1,
      comments: 1,
      painted: 0,
      docMarks: 0,
    });
    const last = await readLastLv();
    expect([...(last?.annotations.important ?? [])]).toEqual(['p:1']);
    expect(commentsOf(last?.annotations ?? EMPTY_ANNOTATIONS, 'p:2')).toEqual(['Boden prüfen']);
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

describe('gelernte Begriffe (Entscheidung 0053)', () => {
  it('bleiben über neue Datei und „Letzte Datei löschen" hinweg', async () => {
    const begriffe = [
      { begriff: 'SB#', kategorie: 'wichtig' as const },
      { begriff: 'bauseits', kategorie: 'aus' as const },
    ];
    expect(await saveLearnedTerms(begriffe)).toBe(true);
    await saveLastLv({ ...meta, id: newPersistId() }, bytesOf('x'));
    await clearLastLv();
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLearnedTerms()).toEqual(begriffe);
  });

  it('verwirft Unbrauchbares und liefert ohne IndexedDB nichts', async () => {
    await saveLearnedTerms([
      { begriff: 'ok', kategorie: 'masse' },
      // @ts-expect-error -- kaputter Eintrag aus einer älteren Version nachstellen
      { begriff: ' ', kategorie: 'quatsch' },
    ]);
    expect(await readLearnedTerms()).toEqual([{ begriff: 'ok', kategorie: 'masse' }]);
    // @ts-expect-error -- privates Fenster nachstellen
    delete globalThis.indexedDB;
    expect(await readLearnedTerms()).toEqual([]);
    expect(await saveLearnedTerms([])).toBe(false);
  });

  it('meldet ein gescheitertes Lesen als null statt als leere Liste', async () => {
    await saveLearnedTerms([{ begriff: 'SB#', kategorie: 'wichtig' }]);
    const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('kaputt');
    });
    expect(await readLearnedTerms()).toBeNull();
    open.mockRestore();
    expect(await readLearnedTerms()).toEqual([{ begriff: 'SB#', kategorie: 'wichtig' }]);
  });
});

describe('Anordnung im Splitscreen (Entscheidung 0073)', () => {
  it('liest die gespeicherte Anordnung zurück und übersteht „Letzte Datei löschen"', async () => {
    expect(await readWorkspace()).toBeUndefined();
    const moved = { ...INITIAL_WORKSPACE, ...edgePane(INITIAL_WORKSPACE, 'table', 'bottom') };
    expect(await saveWorkspace(moved)).toBe(true);
    await clearLastLv();
    const back = toStoredWorkspace(await readWorkspace(), INITIAL_WORKSPACE.closed);
    expect(back?.root).toEqual(moved.root);
    expect(back?.closed).toEqual(moved.closed);
  });
});
