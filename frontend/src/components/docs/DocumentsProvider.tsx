// Offene Begleitdokumente (Entscheidung 0072). Die PDF-Objekte gehören nicht in den
// Viewer-Zustand, der nur Daten hält — wie die Fenster in WorkspaceProvider. Notizen
// zu den Dokumenten (Anstreichungen, Verknüpfungen) liegen dagegen dort, in
// `annotations.documents`, und werden mit den übrigen Notizen gespeichert.
//
// Mehrere Dokumente können nacheinander offen sein, eines ist vorn. Ein neues LV
// schließt alle: ihre Notizen gehören zum alten LV.
//
// Vorschläge zum Verknüpfen (OZ und Mengen, Entscheidung 0080) rechnet ein Worker Seite
// für Seite; hier liegen sie roh, ohne Abgleich mit Notizen — den macht die Anzeige.

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
import { docNeedleOf, hitsInPage, type DocHit } from '../../lib/docs/docSearch';
import {
  suggestIndexOf,
  type DocSuggestion,
  type LinkSource,
  type SuggestIndex,
  type SuggestPosition,
} from '../../lib/docs/docSuggest';
import { createSuggester, type Suggester } from '../../lib/docs/suggester';
import type { PositionIndex } from '../../lib/index/positionIndex';
import { isPdfFile, openPdf, PdfOpenError, type OpenedPdf } from '../../lib/docs/pdf';
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
  /** Öffnet alle PDFs der Liste nacheinander; andere Dateien bleiben liegen. */
  openFiles: (files: readonly File[]) => Promise<void>;
  close: (id: string) => void;
  activate: (id: string) => void;
  /** Zeigt die Stelle; ist ihr Dokument nicht offen, passiert nichts. */
  jumpTo: (spot: DocSpot) => void;
  /**
   * Fundstellen der Suche aus der Suchleiste je offenem Dokument (Entscheidung 0077).
   * Fehlt ein Dokument, läuft die Suche darin noch.
   */
  readonly searchHits: ReadonlyMap<string, readonly DocHit[]>;
  /** Textinhalt einer Seite (ab 1), wie die Textebene ihn zeigt; zwischengespeichert. */
  pageText: (doc: OpenedPdf, page: number) => Promise<string>;
  /** Vorschläge je offenem Dokument (Entscheidung 0080), noch ohne Notizen abgeglichen. */
  readonly suggestions: ReadonlyMap<string, readonly DocSuggestion[]>;
  /** Welche Vorschläge gezeigt werden; Standard: alle. Übersteht keinen Reload. */
  readonly suggest: Readonly<Record<LinkSource, boolean>>;
  setSuggest: (source: LinkSource, on: boolean) => void;
}

function* suggestPositions(index: PositionIndex): Generator<SuggestPosition> {
  for (const node of index.nodes) {
    const position = node.position;
    if (position === null) continue;
    yield {
      id: node.id,
      oz: position.oz,
      quantity: position.quantity,
      unit: position.unit,
      shortText: position.shortText,
    };
  }
}

const DocumentsContext = createContext<DocumentsApi | null>(null);

const NO_SEARCH_HITS: ReadonlyMap<string, readonly DocHit[]> = new Map();
const NO_FOUND = { needle: '', hits: NO_SEARCH_HITS };
const NO_SUGGESTIONS: ReadonlyMap<string, readonly DocSuggestion[]> = new Map();
const ALL_SUGGESTIONS: Readonly<Record<LinkSource, boolean>> = { oz: true, menge: true };

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const {
    lv,
    index,
    filter: { search },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const [docs, setDocs] = useState<OpenedPdf[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jump, setJump] = useState<DocJump | null>(null);
  const texts = useRef(new Map<string, Promise<string>>());
  // Kennungen der angemeldeten Dokumente, sofort gesetzt: `docsRef` folgt erst nach dem
  // Rendern, zwei kurz nacheinander abgeworfene gleiche PDFs kämen sonst beide durch.
  const openIds = useRef(new Set<string>());
  const loading = useRef(0);
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
    openIds.current.clear();
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

  /** Liest ein PDF und meldet es an; gibt die Fehlermeldung zurück oder `null`. */
  const load = useCallback(
    async (file: File): Promise<string | null> => {
      loading.current += 1;
      setBusy(true);
      // Bereich gleich zeigen: Wer ein PDF wählt, sieht dort, dass es lädt — oder
      // warum es nicht geht.
      dispatch({ type: 'showPane', pane: 'doc' });
      const startLv = lvRef.current;
      try {
        const opened = await openPdf(file);
        // Während des Lesens ein anderes LV geladen: Das PDF gehört nicht mehr dazu.
        if (lvRef.current !== startLv) {
          void opened.pdf.loadingTask.destroy();
          return null;
        }
        if (openIds.current.has(opened.id)) {
          // Schon offen: nur nach vorn holen, nicht doppelt anmelden oder zählen.
          void opened.pdf.loadingTask.destroy();
        } else {
          openIds.current.add(opened.id);
          dispatch({
            type: 'docRegister',
            doc: opened.id,
            name: opened.name,
            pages: opened.pdf.numPages,
          });
          setDocs((current) => [...current, opened]);
        }
        setActiveId(opened.id);
        return null;
      } catch (caught) {
        return caught instanceof PdfOpenError ? caught.message : 'Das PDF lässt sich nicht öffnen.';
      } finally {
        loading.current -= 1;
        if (loading.current === 0) setBusy(false);
      }
    },
    [dispatch],
  );

  const open = useCallback(
    async (file: File): Promise<void> => {
      setError(null);
      setError(await load(file));
    },
    [load],
  );

  // Mehrere PDFs: Fehler sammeln und am Ende zusammen zeigen — sonst löschte das nächste,
  // lesbare PDF die Meldung zum vorigen.
  const openFiles = useCallback(
    async (files: readonly File[]): Promise<void> => {
      const pdfs = files.filter(isPdfFile);
      if (pdfs.length === 0) return;
      setError(null);
      const failed: { name: string; message: string }[] = [];
      for (const file of pdfs) {
        const message = await load(file);
        if (message !== null) failed.push({ name: file.name, message });
      }
      if (failed.length === 0) return;
      setError(
        pdfs.length === 1
          ? failed[0].message
          : `${failed.length} von ${pdfs.length} PDFs nicht lesbar: ${failed
              .map((entry) => entry.name)
              .join(', ')}`,
      );
    },
    [load],
  );

  const close = useCallback((id: string): void => {
    const doc = docsRef.current.find((entry) => entry.id === id);
    if (doc === undefined) return;
    void doc.pdf.loadingTask.destroy();
    for (const key of [...texts.current.keys()]) {
      if (key.startsWith(`${id}:`)) texts.current.delete(key);
    }
    openIds.current.delete(id);
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

  // Die eine Suche läuft auch durch alle offenen PDFs — Seite für Seite, abbrechbar,
  // kurz gesammelt, damit nicht jeder neue Begriff sofort alle Seiten liest.
  const needle = docNeedleOf(search);
  const [found, setFound] = useState<{
    needle: string;
    hits: ReadonlyMap<string, readonly DocHit[]>;
  }>(NO_FOUND);
  useEffect(() => {
    if (needle === '' || docs.length === 0) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const hits = new Map<string, readonly DocHit[]>();
        for (const doc of docs) {
          const list: DocHit[] = [];
          for (let page = 1; page <= doc.pdf.numPages; page++) {
            const text = await pageText(doc, page);
            if (!alive) return;
            list.push(...hitsInPage(text, needle, page));
          }
          hits.set(doc.id, list);
          // Je fertigem Dokument zeigen: ein dickes Gutachten hält die anderen nicht auf.
          // Kommt nur ein Dokument dazu, bleiben die Zahlen der übrigen stehen.
          setFound((prev) => ({
            needle,
            hits: new Map([...(prev.needle === needle ? prev.hits : []), ...hits]),
          }));
        }
      })();
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [needle, docs, pageText]);
  const searchHits = needle !== '' && found.needle === needle ? found.hits : NO_SEARCH_HITS;

  // Vorschläge: einmal je LV ein Verzeichnis, dann je Dokument alle Seiten im Worker.
  const [suggest, setSuggestState] = useState(ALL_SUGGESTIONS);
  const setSuggest = useCallback((source: LinkSource, on: boolean): void => {
    setSuggestState((current) => (current[source] === on ? current : { ...current, [source]: on }));
  }, []);
  const suggestIndex = useMemo(() => suggestIndexOf(suggestPositions(index)), [index]);
  const wanted = suggest.oz || suggest.menge;
  const [suggested, setSuggested] = useState<{
    index: SuggestIndex | null;
    byDoc: ReadonlyMap<string, readonly DocSuggestion[]>;
  }>({ index: null, byDoc: NO_SUGGESTIONS });
  // Fertige Seiten je Verzeichnis: Wird die Rechnung unterbrochen (zweites PDF geöffnet
  // oder geschlossen), geht sie dort weiter, wo sie war.
  const pagesFor = useRef<{
    index: SuggestIndex | null;
    pages: Map<string, readonly DocSuggestion[]>;
  }>({ index: null, pages: new Map() });
  useEffect(() => {
    if (!wanted || index.size === 0) return;
    if (pagesFor.current.index !== suggestIndex) {
      pagesFor.current = { index: suggestIndex, pages: new Map() };
    }
    const cache = pagesFor.current.pages;
    // Geschlossene Dokumente: ihre Vorschläge und Seiten fallen weg.
    const open = new Set(docs.map((doc) => doc.id));
    for (const key of [...cache.keys()]) {
      if (!open.has(key.slice(0, key.indexOf(':')))) cache.delete(key);
    }
    // Worker erst, wenn eine Seite fehlt — sind alle zwischengespeichert, braucht es keinen.
    let suggester: Suggester | null = null;
    let alive = true;
    // `pageText` und `suggester.page` werfen nicht: defekte Seiten liefern leeren Text.
    void (async () => {
      for (const doc of docs) {
        const list: DocSuggestion[] = [];
        for (let page = 1; page <= doc.pdf.numPages; page++) {
          const key = `${doc.id}:${page}`;
          let found = cache.get(key);
          if (found === undefined) {
            const text = await pageText(doc, page);
            if (!alive) return;
            suggester ??= createSuggester(suggestIndex);
            found = await suggester.page(text, page);
            if (!alive) return;
            cache.set(key, found);
          }
          list.push(...found);
        }
        setSuggested((prev) => ({
          index: suggestIndex,
          byDoc: new Map([
            ...[...(prev.index === suggestIndex ? prev.byDoc : [])].filter(([id]) => open.has(id)),
            [doc.id, list],
          ]),
        }));
      }
    })();
    return () => {
      alive = false;
      suggester?.dispose();
    };
  }, [wanted, docs, index, suggestIndex, pageText]);
  const suggestions = wanted && suggested.index === suggestIndex ? suggested.byDoc : NO_SUGGESTIONS;

  const active = docs.find((doc) => doc.id === activeId) ?? docs.at(-1) ?? null;
  const api = useMemo<DocumentsApi>(
    () => ({
      docs,
      active,
      busy,
      error,
      jump,
      open,
      openFiles,
      close,
      activate,
      jumpTo,
      searchHits,
      pageText,
      suggestions,
      suggest,
      setSuggest,
    }),
    [
      docs,
      active,
      busy,
      error,
      jump,
      open,
      openFiles,
      close,
      activate,
      jumpTo,
      searchHits,
      pageText,
      suggestions,
      suggest,
      setSuggest,
    ],
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
