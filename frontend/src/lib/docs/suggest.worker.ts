// Web Worker für Vorschläge im Begleitdokument (Entscheidung 0080): je Seite OZ und
// Mengen suchen, damit lange PDFs die Oberfläche nicht aufhalten.

import { createSuggestHandler, type SuggestRequest } from './suggestMessages';

const handle = createSuggestHandler();

self.onmessage = (event: MessageEvent<SuggestRequest>) => {
  const response = handle(event.data);
  if (response !== null) self.postMessage(response);
};
