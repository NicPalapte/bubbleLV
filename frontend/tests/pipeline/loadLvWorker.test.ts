// Laden über den Worker-Pfad (Issue #108): Erfolg, Fehlerantwort, doppeltes
// Ausfall-Ereignis und ein Worker, der gar nicht erst startet. Der Rückfall bei
// einem einzelnen Ausfall steht in loadLv.test.ts.
//
// jsdom kennt keine Modul-Worker. Der Ersatz hier rechnet mit derselben Funktion
// wie pipeline.worker.ts, damit der Erfolgsweg echte Daten über die Grenze gibt.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLv, LVLoadError } from '../../src/lib/pipeline/loadLv';
import type { PipelineRequest, PipelineResponse } from '../../src/lib/pipeline/messages';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { gaebMitPositionen } from '../support/gaebXml';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Ab 500 Positionen geht der Import über den Worker. */
const VIELE = gaebMitPositionen(600);

interface WorkerProtokoll {
  gestartet: number;
  anfragen: PipelineRequest[];
  beendet: number;
}

interface WorkerErsatz {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** Worker-Ersatz; `antwort` bestimmt, welche Ereignisse er nach `postMessage` auslöst. */
function stubWorker(
  antwort: (worker: WorkerErsatz, request: PipelineRequest) => void,
): WorkerProtokoll {
  const protokoll: WorkerProtokoll = { gestartet: 0, anfragen: [], beendet: 0 };
  class Ersatz implements WorkerErsatz {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;
    constructor() {
      protokoll.gestartet += 1;
    }
    postMessage(request: PipelineRequest): void {
      protokoll.anfragen.push(request);
      queueMicrotask(() => antwort(this, request));
    }
    terminate(): void {
      protokoll.beendet += 1;
    }
  }
  vi.stubGlobal('Worker', Ersatz);
  return protokoll;
}

function sende(worker: WorkerErsatz, data: PipelineResponse): void {
  worker.onmessage?.({ data } as MessageEvent<PipelineResponse>);
}

describe('Worker-Pfad', () => {
  it('übernimmt das Ergebnis des Workers und beendet ihn', async () => {
    const protokoll = stubWorker((worker, request) =>
      sende(worker, { ok: true, result: classifyAndBuild(request.draft, request.fileName) }),
    );
    const hinweise: string[] = [];

    const lv = await loadLv(new File([VIELE], 'viele.x83'), {
      onNotice: (text) => hinweise.push(text),
    });

    expect(protokoll.gestartet).toBe(1);
    expect(protokoll.anfragen[0].fileName).toBe('viele.x83');
    expect(protokoll.beendet).toBe(1);
    expect(lv.fileName).toBe('viele.x83');
    expect(lv.tree).not.toBeNull();
    expect(hinweise).toEqual([]);
  });

  it('gibt einen bekannten Fehler aus dem Worker mit nächstem Schritt weiter', async () => {
    stubWorker((worker) =>
      sende(worker, { ok: false, code: 'validation', message: 'Kein Leistungsverzeichnis' }),
    );

    const fehler = await loadLv(new File([VIELE], 'viele.x83')).then(
      () => null,
      (error: unknown) => error,
    );

    expect(fehler).toBeInstanceOf(LVLoadError);
    expect((fehler as LVLoadError).code).toBe('validation');
    expect((fehler as LVLoadError).message).toMatch(/^Kein Leistungsverzeichnis\. Erwartet wird/);
  });

  it('rechnet bei zwei Ausfall-Ereignissen nur einmal weiter', async () => {
    const protokoll = stubWorker((worker) => {
      worker.onmessageerror?.(new Event('messageerror') as MessageEvent);
      worker.onerror?.(new Event('error'));
    });
    const hinweise: string[] = [];

    const lv = await loadLv(new File([VIELE], 'viele.x83'), {
      onNotice: (text) => hinweise.push(text),
    });

    expect(lv.tree).not.toBeNull();
    expect(hinweise).toHaveLength(1);
    expect(protokoll.beendet).toBe(1);
  });

  it('ignoriert eine Antwort, die nach dem Ausfall noch eintrifft', async () => {
    stubWorker((worker) => {
      worker.onerror?.(new Event('error'));
      sende(worker, { ok: false, code: 'parse', message: 'zu spät' });
    });

    const lv = await loadLv(new File([VIELE], 'viele.x83'));
    expect(lv.tree).not.toBeNull();
  });

  it('rechnet ohne Hinweis direkt, wenn der Worker nicht startet', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new TypeError('Modul-Worker nicht unterstützt');
        }
      },
    );
    const hinweise: string[] = [];

    const lv = await loadLv(new File([VIELE], 'viele.x83'), {
      onNotice: (text) => hinweise.push(text),
    });

    expect(lv.tree).not.toBeNull();
    expect(hinweise).toEqual([]);
  });

  it('startet für ein kleines LV keinen Worker', async () => {
    const protokoll = stubWorker(() => {
      throw new Error('darf nicht laufen');
    });
    await loadLv(new File([gaebMitPositionen(5)], 'klein.x83'));
    expect(protokoll.gestartet).toBe(0);
  });
});
