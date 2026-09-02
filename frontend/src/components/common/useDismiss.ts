// Schließt ein Popover, sobald außerhalb geklickt oder Escape gedrückt wird.
// Portiert aus dem wiederkehrenden useEffect-Muster in
// design/claude-design/lv-main.jsx, um Escape ergänzt.

import { useEffect, type RefObject } from 'react';

export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose();
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
  }, [ref, open, onClose]);
}
