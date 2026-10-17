// Ansicht, Filter und Auswahl in der Adresszeile halten (WP-P, Schritt 2).
//
// Zwei Richtungen, beide hier an einer Stelle:
//  - **Lesen:** einmal je Session, sobald die **erste** Datei geladen ist. Der
//    Link kommt vor der Datei — wer ihn öffnet, wählt erst die Datei aus, und
//    erst dann gibt es etwas zu filtern.
//  - **Schreiben:** jede Änderung an Ansicht, Filter oder Auswahl schreibt das
//    Fragment neu, entprellt und per `replaceState`. `pushState` würde für
//    jeden Tastendruck in der Suche einen History-Eintrag erzeugen, und die
//    Zurück-Taste führte durch hundert Zwischenstände statt aus der App heraus.
//
// Ein Fragment verlässt den Browser nie (docs/decisions/0023).

import { useEffect, useRef } from 'react';
import { decodeSharedChecked, sharedHash, type SharedState } from '../../lib/share/urlState';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** Wartezeit vor dem Schreiben — Tippen in der Suche soll nicht je Zeichen schreiben. */
const SCHREIB_VERZOEGERUNG = 300;

/** Hinweis, wenn der Link aus einer anderen Datei stammt, die Position aber gleich ist. */
export const ANDERE_DATEI =
  'Der Link stammt aus einer anderen Datei. Die Position ist inhaltlich gleich.';

/** Fragment wegnehmen, Pfad behalten. */
function leereFragment(): void {
  if (window.location.hash === '') return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export function useShareLink(): void {
  const { lv, index, filter, view, selection, parents, nodes } = useViewer();
  const dispatch = useViewerDispatch();
  const gelesenFuer = useRef<object | null>(null);

  // ── Lesen ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (lv === null || gelesenFuer.current === lv) return;
    const weitereDatei = gelesenFuer.current !== null;
    gelesenFuer.current = lv;

    if (weitereDatei) {
      // Ein neuer Import ersetzt den kompletten Session-Zustand
      // (docs/architecture/data-model.md#re-import-in-derselben-session). Das
      // Fragment im Fenster stammt dann noch von der vorigen Datei: seine
      // Filter und seine OZ gehören nicht hierher. Es gilt nicht mehr und
      // verschwindet sofort, statt bis zum nächsten Schreiben stehen zu
      // bleiben.
      leereFragment();
      return;
    }

    if (window.location.hash === '' || window.location.hash === '#') return;
    const { state: shared, verworfen } = decodeSharedChecked(window.location.hash);

    // Der Hash im Link zeigt auf eine Position mit genau diesem Inhalt; ältere
    // Links tragen die OZ. Findet sich keine, gilt der Rest des Links trotzdem —
    // ein Link aus einer anderen Fassung des LV soll nicht alles verwerfen.
    let positionId: string | null = null;
    if (shared.pos !== null) {
      const treffer = index.nodes.find((node) => node.position?.hashes.id === shared.pos);
      positionId = treffer?.id ?? null;
    } else if (shared.oz !== null) {
      const treffer = index.nodes.find((node) => node.position?.oz === shared.oz);
      positionId = treffer?.id ?? null;
    }
    const nodeId = positionId === null ? null : (parents.get(positionId)?.id ?? null);
    dispatch({ type: 'applyShared', shared, nodeId, positionId });

    // Was am Link nicht passte, nicht still verschlucken (Issue #95): sonst
    // wundert sich jemand über den leeren Standardzustand, ohne zu erfahren,
    // dass der Link die Ursache ist.
    const gesucht = shared.pos !== null || shared.oz !== null;
    if (gesucht && positionId === null && !verworfen.includes('Auswahl')) {
      verworfen.push('Auswahl');
    }
    const andereDatei = shared.lv !== null && lv.fileId !== null && shared.lv !== lv.fileId;
    if (verworfen.length > 0) {
      dispatch({
        type: 'notice',
        message: `Der Link passt nur teilweise zu dieser Datei. Ignoriert: ${verworfen.join(', ')}.`,
      });
    } else if (andereDatei && positionId !== null) {
      // Gleicher Hash ⇒ gleicher Inhalt, auch wenn die Datei eine andere ist.
      dispatch({ type: 'notice', message: ANDERE_DATEI });
    }
  }, [lv, index, parents, dispatch]);

  // ── Schreiben ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Ohne geladene Datei gibt es nichts zu teilen: nach „LV schließen" fällt
    // das Fragment weg, damit kein Link stehen bleibt, der auf eine Datei
    // zeigt, die gar nicht mehr offen ist.
    //
    // **Vor** der ersten Datei wird dagegen nichts geräumt: dort steht
    // vielleicht ein geteilter Link, und wer ihn öffnet, sucht die Datei erst
    // im Dateidialog — das dauert länger als die 300 ms hier. Der Link wäre
    // weg, bevor der Lesen-Effekt ihn überhaupt zu sehen bekäme.
    if (lv === null) {
      if (gelesenFuer.current === null) return;
      const timer = window.setTimeout(leereFragment, SCHREIB_VERZOEGERUNG);
      return () => window.clearTimeout(timer);
    }
    const position = selection.positionId === null ? null : nodes.get(selection.positionId);
    const pos = position?.position?.hashes.id ?? null;
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
      pos,
      lv: pos === null ? null : lv.fileId,
      oz: null,
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
