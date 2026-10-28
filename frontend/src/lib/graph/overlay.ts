// Schwebende Flächen über dem Graph-Canvas (Auswahlkarte, Issue #47).
//
// Der Graph fängt Mausrad und Maustaste auf seinem gesamten Wrapper ab, um
// Zoom und Pan zu bedienen. Alles, was über dem Canvas liegt, erbt dieses
// Verhalten — ein Rad-Ereignis in der Karte wurde dadurch zu Zoom, statt die
// Karte zu scrollen. Wer eigenes Scrollen/Ziehen braucht, markiert seine
// Wurzel mit `data-graph-overlay`; der Graph lässt solche Ereignisse durch.

const GRAPH_OVERLAY_ATTR = 'data-graph-overlay';

/** An die Wurzel einer Überlagerung spreizen: `<div {...graphOverlayProps}>`. */
export const graphOverlayProps = { [GRAPH_OVERLAY_ATTR]: '' } as const;

/** True, wenn das Ereignis aus einer markierten Überlagerung stammt. */
export function isOverlayEvent(target: EventTarget | null): boolean {
  // Kein `instanceof Element`: im eigenen Browserfenster (Entscheidung 0039) stammt das
  // Ziel aus einem anderen Fenster und damit einer anderen `Element`-Klasse.
  const element = target as Element | null;
  return (
    typeof element?.closest === 'function' && element.closest(`[${GRAPH_OVERLAY_ATTR}]`) !== null
  );
}
