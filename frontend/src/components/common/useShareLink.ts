// Ansicht, Filter und Auswahl in der Adresszeile halten (WP-P, Schritt 2).
//
// Zwei Richtungen, beide hier an einer Stelle:
//  - **Lesen:** sobald eine Datei geladen ist, wird das Fragment einmal
//    angewendet. Der Link kommt vor der Datei — wer ihn öffnet, wählt erst
//    die Datei aus, und erst dann gibt es etwas zu filtern.
//  - **Schreiben:** jede Änderung an Ansicht, Filter oder Auswahl schreibt das
//    Fragment neu, entprellt und per `replaceState`. `pushState` würde für
//    jeden Tastendruck in der Suche einen History-Eintrag erzeugen, und die
//    Zurück-Taste führte durch hundert Zwischenstände statt aus der App heraus.
//
// Ein Fragment verlässt den Browser nie (docs/decisions/0023).

import { useEffect, useRef } from 'react';
import { decodeShared, sharedHash, type SharedState } from '../../lib/share/urlState';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** Wartezeit vor dem Schreiben — Tippen in der Suche soll nicht je Zeichen schreiben. */
const SCHREIB_VERZOEGERUNG = 300;

export function useShareLink(): void {
  const { lv, index, filter, view, selection, parents, nodes } = useViewer();
  const dispatch = useViewerDispatch();
  const angewendetFuer = useRef<object | null>(null);

  // ── Lesen ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (lv === null || angewendetFuer.current === lv) return;
    angewendetFuer.current = lv;

    const shared = decodeShared(window.location.hash);
    if (window.location.hash === '' || window.location.hash === '#') return;

    // Die OZ im Link zeigt auf eine Position **dieser** Datei. Findet sie sich
    // nicht, gilt der Rest des Links trotzdem — ein Link aus einer anderen
    // Fassung des LV soll nicht alles verwerfen.
    let positionId: string | null = null;
    if (shared.oz !== null) {
      const treffer = index.nodes.find((node) => node.position?.oz === shared.oz);
      positionId = treffer?.id ?? null;
    }
    const nodeId = positionId === null ? null : (parents.get(positionId)?.id ?? null);
    dispatch({ type: 'applyShared', shared, nodeId, positionId });
  }, [lv, index, parents, dispatch]);

  // ── Schreiben ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (lv === null) return;
    const position = selection.positionId === null ? null : nodes.get(selection.positionId);
    const shared: SharedState = {
      view: view.mode,
      search: filter.search,
      facets: Object.fromEntries(
        Object.entries(filter.filters.facets)
          .filter(([, values]) => values.size > 0)
          .map(([facetId, values]) => [facetId, [...values]]),
      ),
      menge: filter.filters.menge,
      hideMode: filter.hideMode,
      oz: position?.position?.oz ?? null,
    };
    const hash = sharedHash(shared);
    const timer = window.setTimeout(() => {
      if (window.location.hash === hash) return;
      // `pathname + search` bleibt stehen: die App liegt unter einem Pfad
      // (GitHub Pages, PR-Vorschau), und ein nacktes `#…` würde ihn verwerfen.
      const ziel = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, '', ziel);
    }, SCHREIB_VERZOEGERUNG);
    return () => window.clearTimeout(timer);
  }, [lv, view.mode, filter, selection.positionId, nodes]);
}
