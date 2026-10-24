// Offene Begleitdokumente (Entscheidung 0072). Die PDF-Objekte gehören nicht in den
// Viewer-Zustand, der nur Daten hält — wie die Fenster in WorkspaceProvider. Notizen
// zu den Dokumenten (Anstreichungen, Verknüpfungen) liegen dagegen dort, in
// `annotations.documents`, und werden mit den übrigen Notizen gespeichert.
//
// Mehrere Dokumente können nacheinander offen sein, eines ist vorn. Ein neues LV
// schließt alle: ihre Notizen gehören zum alten LV.

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
import type { DocSpot } from '../../lib/docs/docNotes';
import { openPdf, PdfOpenError, type OpenedPdf } from '../../lib/docs/pdf';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** Sprungziel: Stelle im Dokument; `nonce` macht denselben Sprung wiederholbar. */
export interface DocJump {
  readonly spot: DocSpot;
  readonly nonce: number;
}

export interface DocumentsApi {
  readonly docs: readonly OpenedPdf[];
  readonly active: OpenedPdf | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly jump: DocJump | null;
  open: (file: File) => Promise<void>;
  close: (id: string) => void;
  activate: (id: string) => void;
  /** Zeigt die Stelle; ist ihr Dokument nicht offen, passiert nichts. */
  jumpTo: (spot: DocSpot) => void;
  /** Textinhalt einer Seite (ab 1), wie die Textebene ihn zeigt; zwischengespeichert. */
  pageText: (doc: OpenedPdf, page: number) => Promise<string>;
}

const DocumentsContext = createContext<DocumentsApi | null>(null);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { lv } = useViewer();
  const dispatch = useViewerDispatch();
  const [docs, setDocs] = useState<OpenedPdf[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jump, setJump] = useState<DocJump | null>(null);
  const texts = useRef(new Map<string, Promise<string>>());
  const docsRef = useRef(docs);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  // Neues LV oder Startseite: alle Dokumente zu.
  const lvRef = useRef(lv);
  useEffect(() => {
    if (lvRef.current === lv) return;
    lvRef.current = lv;
    for (const doc of docsRef.current) void doc.pdf.loadingTask.destroy();
    texts.current.clear();
    setDocs([]);
    setActiveId(null);
    setJump(null);
    setError(null);
  }, [lv]);
  useEffect(
    () => () => {
      for (const doc of docsRef.current) void doc.pdf.loadingTask.destroy();
    },
    [],
  );

  const open = useCallback(
    async (file: File): Promise<void> => {
      setBusy(true);
      setError(null);
      const startLv = lvRef.current;
      try {
        const opened = await openPdf(file);
        // Während des Lesens ein anderes LV geladen: Das PDF gehört nicht mehr dazu.
        if (lvRef.current !== startLv) {
          void opened.pdf.loadingTask.destroy();
          return;
        }
        if (docsRef.current.some((doc) => doc.id === opened.id)) {
          // Schon offen: nur nach vorn holen, nicht doppelt anmelden oder zählen.
          void opened.pdf.loadingTask.destroy();
        } else {
          dispatch({
            type: 'docRegister',
            doc: opened.id,
            name: opened.name,
            pages: opened.pdf.numPages,
          });
          setDocs((current) => [...current, opened]);
        }
        setActiveId(opened.id);
        dispatch({ type: 'showPane', pane: 'doc' });
      } catch (caught) {
        setError(
          caught instanceof PdfOpenError ? caught.message : 'Das PDF lässt sich nicht öffnen.',
        );
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );

  const close = useCallback((id: string): void => {
    const doc = docsRef.current.find((entry) => entry.id === id);
    if (doc === undefined) return;
    void doc.pdf.loadingTask.destroy();
    for (const key of [...texts.current.keys()]) {
      if (key.startsWith(`${id}:`)) texts.current.delete(key);
    }
    setDocs((current) => current.filter((entry) => entry.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const activate = useCallback((id: string): void => setActiveId(id), []);

  const jumpTo = useCallback(
    (spot: DocSpot): void => {
      if (!docsRef.current.some((doc) => doc.id === spot.doc)) return;
      setActiveId(spot.doc);
      setJump((current) => ({ spot, nonce: (current?.nonce ?? 0) + 1 }));
      dispatch({ type: 'showPane', pane: 'doc' });
    },
    [dispatch],
  );

  const pageText = useCallback((doc: OpenedPdf, page: number): Promise<string> => {
    const key = `${doc.id}:${page}`;
    let text = texts.current.get(key);
    if (text === undefined) {
      text = doc.pdf
        .getPage(page)
        .then((proxy) => proxy.getTextContent())
        .then((content) => content.items.map((item) => ('str' in item ? item.str : '')).join(''))
        .catch(() => {
          // Defekte Seite oder Dokument geschlossen: ohne Text weiter, später neu versuchen.
          texts.current.delete(key);
          return '';
        });
      texts.current.set(key, text);
    }
    return text;
  }, []);

  const active = docs.find((doc) => doc.id === activeId) ?? docs.at(-1) ?? null;
  const api = useMemo<DocumentsApi>(
    () => ({ docs, active, busy, error, jump, open, close, activate, jumpTo, pageText }),
    [docs, active, busy, error, jump, open, close, activate, jumpTo, pageText],
  );
  return <DocumentsContext.Provider value={api}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): DocumentsApi {
  const api = useContext(DocumentsContext);
  if (api === null) throw new Error('useDocuments braucht einen DocumentsProvider');
  return api;
}

/** Wie `useDocuments`, aber `null` ohne Provider — für Teile, die auch allein stehen. */
export function useOptionalDocuments(): DocumentsApi | null {
  return useContext(DocumentsContext);
}
