// Scrollposition einer Ansicht über den Ansichtswechsel retten (WP-L, Abnahme:
// „Filter, Auswahl und Scrollposition sind unverändert").
//
// Warum nicht einfach im Context mitschreiben: ein `scroll`-Ereignis feuert
// dutzende Male je Sekunde, und jede Zustandsänderung zöge die ganze Seite neu
// auf. Die laufende Position liegt deshalb in einem Ref; erst beim Abbau der
// Ansicht wandert sie einmal in den Zustand.
//
// Rückgabe als Paar (Callback-Ref, Handler): ein Callback-Ref stellt die
// gemerkte Position schon beim Einhängen des Elements wieder her — vor dem
// ersten Anblick, ohne Sprung.

import { useCallback, useEffect, useRef, type UIEvent } from 'react';
import { useViewer, useViewerDispatch, type ViewMode } from '../../state/viewer';

export type ScrollMemory = [
  attach: (node: HTMLElement | null) => void,
  onScroll: (event: UIEvent<HTMLElement>) => void,
];

export function useScrollMemory(view: ViewMode): ScrollMemory {
  const { view: viewState } = useViewer();
  const dispatch = useViewerDispatch();
  // Nur der Wert beim ersten Render zählt: danach führt das Ref die Position
  // selbst, und ein Zustandswechsel darf den Ausschnitt nicht zurücksetzen.
  const top = useRef(viewState.scroll[view]);

  const attach = useCallback((node: HTMLElement | null): void => {
    if (node !== null) node.scrollTop = top.current;
  }, []);

  useEffect(() => () => dispatch({ type: 'viewScroll', view, top: top.current }), [dispatch, view]);

  const onScroll = useCallback((event: UIEvent<HTMLElement>): void => {
    top.current = event.currentTarget.scrollTop;
  }, []);

  return [attach, onScroll];
}
