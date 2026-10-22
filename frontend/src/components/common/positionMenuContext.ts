// Zugang zum Rechtsklick-Menü auf Positionen (PositionMenu.tsx): eigene Datei,
// damit die Komponente allein exportiert (Fast Refresh).

import { createContext, useContext } from 'react';

/** Wo geklickt wurde: der Graph bietet „In der Tabelle zeigen", die Tabelle „Im Graph zeigen". */
export type MenuSource = 'graph' | 'table' | 'compare';

/** Öffnet das Menü für eine Position oder einen Abschnitt an `x`/`y` im Fenster. */
export type OpenMenu = (id: string, x: number, y: number, from: MenuSource, doc?: Document) => void;

export const MenuContext = createContext<OpenMenu>(() => undefined);

export function usePositionMenu(): OpenMenu {
  return useContext(MenuContext);
}
