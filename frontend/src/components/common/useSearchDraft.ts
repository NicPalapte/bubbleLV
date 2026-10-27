// Eingabefeld für die eine Suche (Kopfleiste und Bereich „Dokument“). Das Feld hängt am
// lokalen Wert, damit Tippen nie auf den Suchlauf wartet; der Viewer-State folgt
// verzögert nach.

import { useEffect, useRef, useState } from 'react';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/**
 * Wartezeit, bevor eine Eingabe zum Filter wird. Ein Suchlauf zieht Baum, Graph
 * und Tabelle neu auf — bei großen LVs (Richtung ~10k Positionen) dauert das
 * mehrere hundert Millisekunden bis Sekunden. Ohne Verzögerung passiert das je
 * Tastendruck, und die Eingabe hakt. Der Wert ist kurz genug, dass die Suche
 * beim Innehalten sofort greift.
 */
const SEARCH_DEBOUNCE_MS = 250;

export function useSearchDraft(): [string, (value: string) => void] {
  const {
    filter: { search },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const [draft, setDraft] = useState(search);
  const [mirrored, setMirrored] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Änderungen von außen (Import, „LV schließen“, das andere Suchfeld) übernehmen —
  // im Render statt im Effekt, sonst zeigt das Feld für einen Frame den alten Begriff
  // (react.dev/learn/you-might-not-need-an-effect).
  if (search !== mirrored) {
    setMirrored(search);
    setDraft(search);
  }

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const change = (value: string): void => {
    setDraft(value);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(
      () => dispatch({ type: 'search', value }),
      value === '' ? 0 : SEARCH_DEBOUNCE_MS,
    );
  };
  return [draft, change];
}
