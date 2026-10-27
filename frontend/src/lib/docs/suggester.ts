// Vorschläge Seite für Seite berechnen (Entscheidung 0080): im Worker, wenn die
// Umgebung ihn hergibt, sonst gleich hier — wie die Pipeline (`pipeline/loadLv.ts`).
// Fällt der Worker aus, rechnet der Rest ebenfalls hier weiter.

import type { DocSuggestion, SuggestIndex } from './docSuggest';
import { createSuggestHandler, type SuggestRequest, type SuggestResponse } from './suggestMessages';

export interface Suggester {
  /** Vorschläge einer Seite (ab 1). */
  page: (text: string, page: number) => Promise<readonly DocSuggestion[]>;
  dispose: () => void;
}

/** Was der Suggester vom Worker braucht; im Test ein Ersatz ohne echten Thread. */
export interface SuggestWorker {
  onmessage: ((event: MessageEvent<SuggestResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage: (request: SuggestRequest) => void;
  terminate: () => void;
}

function createWorker(): SuggestWorker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./suggest.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    // Umgebung ohne Modul-Worker (z. B. jsdom) — dann ohne Worker.
    return null;
  }
}

export function createSuggester(
  index: SuggestIndex,
  makeWorker: () => SuggestWorker | null = createWorker,
): Suggester {
  const local = createSuggestHandler();
  local({ type: 'index', index });
  const inline = (text: string, page: number): readonly DocSuggestion[] =>
    local({ type: 'page', req: 0, page, text })?.list ?? [];

  let worker = makeWorker();
  const waiting = new Map<number, { text: string; page: number; done: Resolve }>();
  let next = 1;
  const fallBack = (): void => {
    worker?.terminate();
    worker = null;
    for (const { text, page, done } of waiting.values()) done(inline(text, page));
    waiting.clear();
  };
  if (worker !== null) {
    worker.onmessage = (event) => {
      const entry = waiting.get(event.data.req);
      if (entry === undefined) return;
      waiting.delete(event.data.req);
      entry.done(event.data.list);
    };
    worker.onerror = fallBack;
    try {
      worker.postMessage({ type: 'index', index });
    } catch {
      fallBack();
    }
  }

  return {
    page: (text, page) => {
      const own = worker;
      if (own === null) return Promise.resolve(inline(text, page));
      return new Promise((done) => {
        const req = next++;
        waiting.set(req, { text, page, done });
        try {
          own.postMessage({ type: 'page', req, page, text });
        } catch {
          fallBack();
        }
      });
    },
    dispose: () => {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}

type Resolve = (list: readonly DocSuggestion[]) => void;
