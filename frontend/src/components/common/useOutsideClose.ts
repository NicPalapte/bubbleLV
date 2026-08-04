// Schließt ein Popover, sobald außerhalb geklickt wird. Portiert aus dem
// wiederkehrenden useEffect-Muster in design/claude-design/lv-main.jsx.

import { useEffect, type RefObject } from 'react';

export function useOutsideClose(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ref, open, onClose]);
}
