// Das Browserfenster, in dem eine Fläche gerade steht. Normalerweise das
// Hauptfenster; die abgekoppelte Tabelle (Entscheidung 0039) rendert per
// Portal in ein zweites Fenster derselben App. Popover und Außerhalb-Klick
// müssen dann dort lauschen und dorthin portieren — sonst öffnete sich das
// Spaltenmenü auf dem anderen Bildschirm.

import { createContext, useContext } from 'react';

export const HostWindowContext = createContext<Window | null>(null);

export function useHostWindow(): Window {
  return useContext(HostWindowContext) ?? window;
}
