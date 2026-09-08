// Schließt ein Popover, sobald außerhalb geklickt oder Escape gedrückt wird.
// Portiert aus dem wiederkehrenden useEffect-Muster in
// design/claude-design/lv-main.jsx, um Escape ergänzt.

import { useEffect, type RefObject } from 'react';

/** Mausbewegung zwischen Drücken und Loslassen, ab der es als Ziehen zählt. */
const DRAG_THRESHOLD = 4;

export interface UseDismissOptions {
  /**
   * Für Popover über einem ziehbaren Canvas (Bubble-Graph): ein Pan-Gesten-
   * Mousedown landet fast immer außerhalb des Popovers — ohne diese Option
   * würde jedes Ziehen die Karte sofort schließen, statt erst ein echter Klick
   * daneben. Die Entscheidung fällt deshalb auf `mouseup`, sobald feststeht,
   * ob sich die Maus kaum bewegt hat (Klick) oder nicht (Ziehen).
   */
  ignoreDrag?: boolean;
}

/**
 * `refs` sind alle DOM-Teilbäume, die als "innerhalb" zählen — neben dem
 * Anker meist auch der per Portal an <body> gehängte Popover-Knoten selbst
 * (Issue #24: das Popover steckt nicht mehr im Anker-Element).
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
  open: boolean,
  onClose: () => void,
  options?: UseDismissOptions,
): void {
  const ignoreDrag = options?.ignoreDrag === true;

  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(refs) ? refs : [refs];

    const isOutside = (target: EventTarget | null): boolean =>
      !list.some((ref) => ref.current?.contains(target as Node) === true);

    // Nur für `ignoreDrag` gebraucht: Startpunkt eines möglichen Drags.
    let downOutside = false;
    let downX = 0;
    let downY = 0;

    const onMouseDown = (event: MouseEvent): void => {
      const outside = isOutside(event.target);
      if (!ignoreDrag) {
        if (outside) onClose();
        return;
      }
      downOutside = outside;
      downX = event.clientX;
      downY = event.clientY;
    };

    const onMouseUp = (event: MouseEvent): void => {
      if (!downOutside) return;
      const moved = Math.hypot(event.clientX - downX, event.clientY - downY) > DRAG_THRESHOLD;
      if (!moved && isOutside(event.target)) onClose();
    };

    // Escape schließt zuerst das offene Popover. Die globale Escape-Navigation
    // (ViewerPage: eine Ebene zurück) hängt ebenfalls am window — deshalb hier
    // die Capture-Phase, die vorher läuft, plus stopImmediatePropagation.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      onClose();
    };

    window.addEventListener('mousedown', onMouseDown);
    if (ignoreDrag) window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      if (ignoreDrag) window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', closeOnEscape, true);
    };

    // `refs` bewusst nicht in den Deps: an der Aufrufstelle stehen oft Array-
    // Literale, über Länge/Inhalt statt Referenz vergleichen wäre hier unnötig,
    // die Refs selbst sind stabile Objekte.
  }, [open, onClose, ignoreDrag]);
}
