// Zugang zum Rechtsklick-Menü auf Positionen (PositionMenu.tsx): eigene Datei,
// damit die Komponente allein exportiert (Fast Refresh).

import { createContext, useContext } from 'react';

/** Öffnet das Menü für eine Position oder einen Abschnitt an `x`/`y` im Fenster. */
export type OpenMenu = (id: string, x: number, y: number, doc?: Document) => void;

export const MenuContext = createContext<OpenMenu>(() => undefined);

export function usePositionMenu(): OpenMenu {
  return useContext(MenuContext);
}
