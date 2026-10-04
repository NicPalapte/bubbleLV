// Unerwartete Fehler beim Laden: die UI bekommt einen deutschen Satz, die Ursache
// bleibt am Fehler erhalten (Review auf PR 114). Eigene Datei, weil hier die
// Klassifizierung absichtlich scheitert.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLv, LVLoadError } from '../../src/lib/pipeline/loadLv';
import { UNEXPECTED_FAILURE } from '../../src/lib/pipeline/messages';
import { gaebMitPositionen } from '../support/gaebXml';

const URSACHE = new RangeError('Maximum call stack size exceeded');

vi.mock('../../src/lib/pipeline/runPipeline', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/pipeline/runPipeline')>();
  return {
    ...original,
    classifyAndBuild: vi.fn(() => {
      throw URSACHE;
    }),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fehlerBeim(laden: Promise<unknown>): Promise<LVLoadError> {
  try {
    await laden;
  } catch (error) {
    expect(error).toBeInstanceOf(LVLoadError);
    return error as LVLoadError;
  }
  throw new Error('Es wurde kein Fehler geworfen.');
}

describe('unerwarteter Fehler im synchronen Pfad', () => {
  it('zeigt den deutschen Satz und behält die Ursache als cause', async () => {
    const fehler = await fehlerBeim(loadLv(new File([gaebMitPositionen(3)], 'klein.x83')));
    expect(fehler.code).toBe('unknown');
    expect(fehler.message).toBe(UNEXPECTED_FAILURE);
    expect(fehler.cause).toBeInstanceOf(Error);
    expect((fehler.cause as Error).message).toContain('Maximum call stack size exceeded');
  });
});

describe('unerwarteter Fehler aus dem Worker', () => {
  it('gibt die Ursache als Text weiter und hängt sie als cause an', async () => {
    class Meldet {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessageerror: ((event: MessageEvent) => void) | null = null;
      postMessage(): void {
        queueMicrotask(() =>
          this.onmessage?.({
            data: {
              ok: false,
              code: 'unknown',
              message: UNEXPECTED_FAILURE,
              complete: true,
              detail: 'TypeError: x ist nicht definiert',
            },
          } as MessageEvent),
        );
      }
      terminate(): void {}
    }
    vi.stubGlobal('Worker', Meldet);

    const fehler = await fehlerBeim(loadLv(new File([gaebMitPositionen(600)], 'viele.x83')));
    expect(fehler.code).toBe('unknown');
    expect(fehler.message).toBe(UNEXPECTED_FAILURE);
    expect((fehler.cause as Error).message).toBe('TypeError: x ist nicht definiert');
  });
});
