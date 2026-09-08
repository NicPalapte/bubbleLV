// Schließt ein Popover, sobald außerhalb geklickt oder Escape gedrückt wird.
// Portiert aus dem wiederkehrenden useEffect-Muster in
// design/claude-design/lv-main.jsx, um Escape ergänzt.

import { useEffect, type RefObject } from 'react';

/**
 * `refs` sind alle DOM-Teilbäume, die als "innerhalb" zählen — neben dem
 * Anker meist auch der per Portal an <body> gehängte Popover-Knoten selbst
 * (Issue #24: das Popover steckt nicht mehr im Anker-Element).
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(refs) ? refs : [refs];

    const closeOnOutside = (event: MouseEvent): void => {
      const inside = list.some((ref) => ref.current?.contains(event.target as Node) === true);
      if (!inside) onClose();
    };

    // Escape schließt zuerst das offene Popover. Die globale Escape-Navigation
    // (ViewerPage: eine Ebene zurück) hängt ebenfalls am window — deshalb hier
    // die Capture-Phase, die vorher läuft, plus stopImmediatePropagation.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      onClose();
    };

    window.addEventListener('mousedown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.removeEventListener('mousedown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape, true);
    };

    // an der Aufrufstelle; über Länge/Inhalt statt Referenz vergleichen wäre hier unnötig,
    // die Refs selbst sind stabile Objekte.
  }, [open, onClose]);
}
