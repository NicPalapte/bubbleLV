// Eigene Namen der Markierfarben (Entscheidung 0063). Gelten in diesem Browser für
// alle Dateien und bleiben in IndexedDB (lib/persist/lastLv.ts), wie die gelernten
// Begriffe aus state/admin.tsx — gleiches Muster: erst lesen, dann schreiben.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Paint } from '../lib/annotations';
import { adoptPaintNames, NO_PAINT_NAMES, withPaintName, type PaintNames } from '../lib/paintNames';
import { readPaintNames, savePaintNames } from '../lib/persist/lastLv';

interface PaintNamesValue {
  readonly names: PaintNames;
  /** Leerer Text löscht den Namen. */
  rename(paint: Paint, name: string): void;
  /** Namen aus einer Notiz-Datei für Farben, die hier noch keinen haben. */
  adopt(other: PaintNames): void;
}

const PaintNamesContext = createContext<PaintNamesValue | null>(null);

export function PaintNamesProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<PaintNames>(NO_PAINT_NAMES);
  // Als State, nicht Ref: wer vor dem Lesen schon benannt hat, wird danach gespeichert.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void readPaintNames().then((stored) => {
      // Lesen gescheitert: nichts speichern, Namen gelten nur bis zum Reload.
      if (!active || stored === null) return;
      setLoaded(true);
      // Was vor dem Lesen schon benannt wurde, gewinnt.
      setNames((current) => adoptPaintNames(current, stored));
    });
    return () => {
      active = false;
    };
  }, []);

  // Nacheinander speichern, nie parallel (siehe state/admin.tsx).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (!loaded) return;
    queue.current = queue.current.then(() => savePaintNames(names));
  }, [names, loaded]);

  const value = useMemo<PaintNamesValue>(
    () => ({
      names,
      rename: (paint, name) => setNames((current) => withPaintName(current, paint, name)),
      adopt: (other) => setNames((current) => adoptPaintNames(current, other)),
    }),
    [names],
  );

  return <PaintNamesContext.Provider value={value}>{children}</PaintNamesContext.Provider>;
}

const OUTSIDE: PaintNamesValue = {
  names: NO_PAINT_NAMES,
  rename: () => undefined,
  adopt: () => undefined,
};

/** Außerhalb des Providers (Tests einzelner Komponenten): nur die Farbnamen. */
export function usePaintNames(): PaintNamesValue {
  return useContext(PaintNamesContext) ?? OUTSIDE;
}
