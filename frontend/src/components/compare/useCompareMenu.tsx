// Rechtsklick-Menü „Vergleich" für Listen (Tabelle, Baum) — PR #86.
//
// Der Graph hält sein Menü selbst, weil er es an der Bubble ausrichtet; Listen
// setzen es an die Mausposition. Nur Positionen bekommen das Menü, an
// Abschnitten bleibt das Kontextmenü des Browsers.

import { useCallback, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { CompareMenu } from './CompareMenu';
import type { LVNode } from '../../types/lvNode';

interface OpenMenu {
  node: LVNode;
  x: number;
  y: number;
}

export function useCompareMenu(): {
  openMenu: (node: LVNode, event: ReactMouseEvent) => void;
  menu: ReactNode;
} {
  const [open, setOpen] = useState<OpenMenu | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const openMenu = useCallback((node: LVNode, event: ReactMouseEvent): void => {
    if (node.kind !== 'position') return;
    event.preventDefault();
    setOpen({ node, x: event.clientX, y: event.clientY });
  }, []);

  const menu =
    open === null ? null : (
      <CompareMenu
        node={open.node}
        placement={{ kind: 'viewport', x: open.x, y: open.y }}
        onClose={close}
      />
    );
  return { openMenu, menu };
}
