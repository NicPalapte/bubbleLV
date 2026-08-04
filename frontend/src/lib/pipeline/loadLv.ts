// Einstiegspunkt der Upload-Komponente: Datei → LoadedLV.
// Nutzt den Worker, wenn die Umgebung ihn hergibt (Browser), und fällt sonst
// synchron zurück (Tests, ältere Umgebungen). Kein Netzwerk-Request.

import {
  describeFailure,
  toPipelineError,
  type PipelineRequest,
  type PipelineResponse,
} from './messages';
import { classifyAndBuild, parseToDraft, type LoadedLV } from './runPipeline';
import type { LVDraft } from '../../types/lvDraft';

export class LVLoadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LVLoadError';
    this.code = code;
  }
}

/** Ab dieser Größe lohnt der Worker-Umweg inkl. structuredClone des Drafts. */
const WORKER_THRESHOLD_POSITIONS = 500;

function countPositions(draft: LVDraft): number {
  let total = 0;
  const visitSections = (sections: LVDraft['lots'][number]['sections']): void => {
    for (const section of sections) {
      total += section.positions.length;
      visitSections(section.sections);
    }
  };
  for (const lot of draft.lots) visitSections(lot.sections);
  return total;
}

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    // Umgebung ohne Modul-Worker (z. B. jsdom) — der synchrone Pfad übernimmt.
    return null;
  }
}

function classifyInWorker(draft: LVDraft, fileName: string): Promise<LoadedLV> | null {
  const worker = createWorker();
  if (worker === null) return null;

  return new Promise<LoadedLV>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<PipelineResponse>) => {
      worker.terminate();
      const response = event.data;
      if (response.ok) resolve(response.result);
      else reject(new LVLoadError(response.code, describeFailure(response)));
    };
    worker.onerror = () => {
      worker.terminate();
      // Der Worker konnte nicht starten/laufen — synchron zu Ende rechnen,
      // statt den Import scheitern zu lassen.
      resolve(classifyAndBuild(draft, fileName));
    };
    const request: PipelineRequest = { draft, fileName };
    worker.postMessage(request);
  });
}

/**
 * Lädt eine GAEB-Datei vollständig im Browser.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI.
 */
export async function loadLv(file: File): Promise<LoadedLV> {
  let draft: LVDraft;
  try {
    // Bytes, nicht Text — das Encoding steht in der XML-Deklaration.
    draft = parseToDraft(await file.arrayBuffer(), file.name);
  } catch (error) {
    const failure = toPipelineError(error);
    throw new LVLoadError(failure.code, describeFailure(failure));
  }

  try {
    if (countPositions(draft) >= WORKER_THRESHOLD_POSITIONS) {
      const viaWorker = classifyInWorker(draft, file.name);
      if (viaWorker !== null) return await viaWorker;
    }
    return classifyAndBuild(draft, file.name);
  } catch (error) {
    if (error instanceof LVLoadError) throw error;
    const failure = toPipelineError(error);
    throw new LVLoadError(failure.code, describeFailure(failure));
  }
}
