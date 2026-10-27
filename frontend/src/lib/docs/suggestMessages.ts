// Nachrichten zwischen App und Vorschlags-Worker (Entscheidung 0080). Erst das
// Verzeichnis des LV, dann Seite für Seite der Text; die Antwort trägt die Nummer
// der Anfrage, weil Seiten mehrerer Dokumente durcheinander fertig werden können.

import { suggestionsInPage, type DocSuggestion, type SuggestIndex } from './docSuggest';

export type SuggestRequest =
  | { readonly type: 'index'; readonly index: SuggestIndex }
  | { readonly type: 'page'; readonly req: number; readonly page: number; readonly text: string };

export interface SuggestResponse {
  readonly req: number;
  readonly list: readonly DocSuggestion[];
}

/** Zustand und Antwort des Workers — getrennt vom Worker-Rahmen, damit es testbar ist. */
export function createSuggestHandler(): (request: SuggestRequest) => SuggestResponse | null {
  let index: SuggestIndex | null = null;
  return (request) => {
    if (request.type === 'index') {
      index = request.index;
      return null;
    }
    const list = index === null ? [] : suggestionsInPage(request.text, index, request.page);
    return { req: request.req, list };
  };
}
