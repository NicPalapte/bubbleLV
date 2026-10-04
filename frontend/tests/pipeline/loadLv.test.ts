// Laden einer Datei: Größenlimit (Issue #93), Dateityp, leere Datei und der
// Rückfall, wenn der Worker ausfällt (Issues #92, #95).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLv, LVLoadError, MAX_FILE_BYTES } from '../../src/lib/pipeline/loadLv';
import { gaebMitPositionen } from '../support/gaebXml';

afterEach(() => {
  vi.unstubAllGlobals();
});

function datei(name: string, inhalt: string): File {
  return new File([inhalt], name);
}

async function fehlerBeim(laden: Promise<unknown>): Promise<LVLoadError> {
  try {
    await laden;
  } catch (error) {
    expect(error).toBeInstanceOf(LVLoadError);
    return error as LVLoadError;
  }
  throw new Error('Es wurde kein Fehler geworfen.');
}

describe('Größenlimit', () => {
  it('liegt bei 50 MB', () => {
    expect(MAX_FILE_BYTES).toBe(50 * 1024 * 1024);
  });

  it('lehnt eine zu große Datei ab, ohne sie zu lesen', async () => {
    const riesig = datei('riesig.x83', '<GAEB/>');
    Object.defineProperty(riesig, 'size', { value: MAX_FILE_BYTES + 1 });
    const lesen = vi.spyOn(riesig, 'arrayBuffer');

    const fehler = await fehlerBeim(loadLv(riesig));

    expect(fehler.code).toBe('size');
    expect(fehler.message).toMatch(/riesig\.x83 ist zu groß/);
    expect(fehler.message).toMatch(/bis 50 MB/);
    expect(lesen).not.toHaveBeenCalled();
  });

  it('nennt die tatsächliche Größe mit deutschem Komma', async () => {
    const riesig = datei('riesig.x83', '');
    Object.defineProperty(riesig, 'size', { value: Math.round(61.5 * 1024 * 1024) });
    const fehler = await fehlerBeim(loadLv(riesig));
    expect(fehler.message).toMatch(/61,5 MB/);
  });

  it('nimmt eine Datei genau an der Grenze noch an', async () => {
    const grenze = datei('grenze.x83', gaebMitPositionen(3));
    Object.defineProperty(grenze, 'size', { value: MAX_FILE_BYTES });
    const lv = await loadLv(grenze);
    expect(lv.tree).not.toBeNull();
  });
});

describe('Dateityp und leere Datei', () => {
  it('lehnt einen fremden Dateityp mit deutscher Meldung ab', async () => {
    for (const name of ['bericht.pdf', 'bild.png', 'ohne-endung']) {
      const fehler = await fehlerBeim(loadLv(datei(name, '%PDF-1.7')));
      expect(fehler.code).toBe('dateityp');
      expect(fehler.message).toMatch(/Dateityp/);
      expect(fehler.message).toMatch(/\.x83/);
    }
  });

  it('erkennt GAEB-Endungen unabhängig von der Schreibweise', async () => {
    for (const name of ['a.x83', 'a.X83', 'a.x84', 'a.X86', 'a.xml', 'A.XML']) {
      const fehler = await fehlerBeim(loadLv(datei(name, '')));
      expect(fehler.code).not.toBe('dateityp');
    }
  });

  it('meldet eine leere Datei als leer', async () => {
    const fehler = await fehlerBeim(loadLv(datei('leer.x83', '')));
    expect(fehler.code).toBe('parse');
    expect(fehler.message).toBe('Die Datei leer.x83 ist leer.');
  });
});

describe('Worker-Rückfall', () => {
  /** Worker-Ersatz, der sofort den gewählten Fehler meldet. */
  function stubWorker(ereignis: 'onerror' | 'onmessageerror'): void {
    class Ausgefallen {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessageerror: ((event: MessageEvent) => void) | null = null;
      postMessage(): void {
        queueMicrotask(() => this[ereignis]?.(new Event('error') as MessageEvent));
      }
      terminate(): void {}
    }
    vi.stubGlobal('Worker', Ausgefallen);
  }

  for (const ereignis of ['onerror', 'onmessageerror'] as const) {
    it(`rechnet bei ${ereignis} weiter und sagt es (Issue #95)`, async () => {
      stubWorker(ereignis);
      const hinweise: string[] = [];

      // Ab 500 Positionen geht der Import über den Worker.
      const lv = await loadLv(datei('viele.x83', gaebMitPositionen(600)), {
        onNotice: (text) => hinweise.push(text),
      });

      expect(lv.tree).not.toBeNull();
      expect(hinweise).toHaveLength(1);
      expect(hinweise[0]).toMatch(/Hintergrund/);
      expect(hinweise[0]).toMatch(/vollständig/);
    });
  }

  it('meldet nichts, wenn der Worker nicht gebraucht wird', async () => {
    const hinweise: string[] = [];
    await loadLv(datei('klein.x83', gaebMitPositionen(5)), {
      onNotice: (text) => hinweise.push(text),
    });
    expect(hinweise).toEqual([]);
  });
});
