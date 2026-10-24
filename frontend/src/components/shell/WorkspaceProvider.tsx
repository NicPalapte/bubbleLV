// Gemeinsamer Stand der Arbeitsfläche, den Kopfleiste und Splitscreen teilen: welche
// Bereiche in einem eigenen Browserfenster stehen (Entscheidung 0039).
//
// Die Fenster selbst sind `Window`-Objekte — sie gehören nicht in den
// Viewer-Zustand, der nur Daten hält. Deshalb ein eigener Context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { openExternalWindow, type ExternalHost } from '../common/externalWindowHost';

/** Bereiche, die in ein eigenes Browserfenster wandern können. */
export type PopPane = 'graph' | 'table' | 'doc';

/** So lange steht der Hinweis, wenn der Browser das Fenster blockiert. */
const BLOCKED_HINT_MS = 5000;

const POPUP: Record<PopPane, { name: string; title: string; width: number; height: number }> = {
  // Name des zweiten Fensters — ein zweiter Klick übernimmt dasselbe Fenster.
  table: { name: 'bubble-tabelle', title: 'Conocto — Tabelle', width: 900, height: 720 },
  graph: { name: 'bubble-graph', title: 'Conocto — Graph', width: 1200, height: 800 },
  doc: { name: 'bubble-dokument', title: 'Conocto — Dokument', width: 900, height: 1000 },
};

export interface WorkspaceApi {
  hosts: Readonly<Record<PopPane, ExternalHost | null>>;
  /** Bereich, dessen Fenster der Browser zuletzt blockiert hat. */
  blocked: PopPane | null;
  /** Muss direkt im Klick laufen — sonst blockiert der Browser das Fenster. */
  popOut: (pane: PopPane, width?: number) => void;
  /** Holt den Bereich zurück ins Hauptfenster; das zweite Fenster schließt. */
  dock: (pane: PopPane) => void;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState<Record<PopPane, ExternalHost | null>>({
    graph: null,
    table: null,
    doc: null,
  });
  const [blocked, setBlocked] = useState<PopPane | null>(null);
  const blockedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(blockedTimer.current), []);

  const popOut = useCallback((pane: PopPane, width?: number): void => {
    const popup = POPUP[pane];
    const host = openExternalWindow(popup.name, popup.title, {
      width: Math.max(width ?? 0, popup.width),
      height: popup.height,
    });
    window.clearTimeout(blockedTimer.current);
    if (host === null) {
      // Ein neuer Klick hält den Hinweis die volle Zeit, kein alter Timer kürzt ab.
      setBlocked(pane);
      blockedTimer.current = window.setTimeout(() => setBlocked(null), BLOCKED_HINT_MS);
      return;
    }
    setBlocked(null);
    setHosts((current) => ({ ...current, [pane]: host }));
  }, []);

  const dock = useCallback((pane: PopPane): void => {
    setHosts((current) => (current[pane] === null ? current : { ...current, [pane]: null }));
  }, []);

  const api = useMemo<WorkspaceApi>(
    () => ({ hosts, blocked, popOut, dock }),
    [hosts, blocked, popOut, dock],
  );
  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const api = useContext(WorkspaceContext);
  if (api === null) throw new Error('useWorkspace braucht einen WorkspaceProvider');
  return api;
}

/** Wie `useWorkspace`, aber `null` ohne Provider — für Teile, die auch allein stehen. */
export function useOptionalWorkspace(): WorkspaceApi | null {
  return useContext(WorkspaceContext);
}
