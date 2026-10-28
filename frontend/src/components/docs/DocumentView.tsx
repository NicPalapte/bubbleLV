// Inhalt des Bereichs „Dokument" (Entscheidung 0072): ein Begleitdokument als PDF
// anzeigen, darin suchen, Stellen anstreichen und von Hand mit Positionen
// verknüpfen. Dieselbe Komponente steht im Splitscreen, im Fenster über dem Graphen
// und im eigenen Browserfenster.
//
// Markieren wie im Langtext: Text auswählen, Rechtsklick (Entscheidung 0063,
// Issue #155). Conocto deutet nichts — keine Vorschläge, keine Fundstellen.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useDocuments } from './DocumentsProvider';
import { LinkBadge } from './LinkBadge';
import { LinkDialog } from './LinkDialog';
import { PdfPage, type PageSize } from './PdfPage';
import type { DocHighlightItem } from './docHighlights';
import { PaintBar, PaintNamesDialog } from '../common/PaintBar';
import {
  paintSelection,
  searchTermOf,
  useTouchSelectionMenu,
  type PaintTarget,
} from '../common/paint';
import { useHostWindow } from '../common/hostWindow';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { marksOfDoc, type DocMark, type DocSpot } from '../../lib/docs/docNotes';
import type { OpenedPdf } from '../../lib/docs/pdf';
import { docNeedleOf, type DocHit } from '../../lib/docs/docSearch';
import { useSearchDraft } from '../common/useSearchDraft';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.2;
/** Rand links und rechts neben der Seite in px. */
const GUTTER = 16;
/** So lange leuchtet die Stelle nach einem Sprung. */
const FLASH_MS = 1800;

const TOOL =
  'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';

/** Auswahl im Dokument samt Seite; Grundlage für Menü und Verknüpfen. */
interface Picked {
  readonly target: PaintTarget;
  readonly page: number;
}

function PdfInput({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={TOOL}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) onFile(file);
        }}
      />
    </>
  );
}

/** Ohne offenes Dokument: hineinziehen oder wählen; dazu, was schon verknüpft war. */
function EmptyDocument() {
  const { open, busy, error } = useDocuments();
  const { annotations } = useViewer();
  const [over, setOver] = useState(false);
  const { docs, marks } = annotations.documents;
  const counts = new Map<string, number>();
  for (const mark of marks) counts.set(mark.doc, (counts.get(mark.doc) ?? 0) + 1);
  const known = [...docs].filter(([id]) => counts.has(id));
  const drop = (event: DragEvent): void => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) void open(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-auto p-[16px]">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex min-h-[180px] flex-1 flex-col items-center justify-center gap-[10px] rounded-[var(--r-md)] border-2 border-dashed text-center ${
          over ? 'border-accent bg-accent-soft' : 'border-line2'
        }`}
      >
        <span className="font-sans text-[14px] text-ink">PDF hierher ziehen</span>
        <PdfInput label={busy ? 'Öffnet…' : 'PDF öffnen'} onFile={(file) => void open(file)} />
        <span className="font-mono text-[11px] text-mute">Bleibt in diesem Browser.</span>
        {error !== null && (
          <span role="alert" className="font-mono text-[12px] text-red">
            {error}
          </span>
        )}
      </div>
      {known.length > 0 && (
        <ul
          aria-label="Dokumente mit Notizen"
          className="m-0 flex list-none flex-col gap-[6px] p-0"
        >
          {known.map(([id, info]) => (
            <li
              key={id}
              className="flex items-center gap-[10px] rounded-[var(--r-md)] border border-line px-[12px] py-[8px]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[13px] font-semibold text-ink">
                  {info.name}
                </span>
                <span className="font-mono text-[11px] text-mute">
                  {counts.get(id)} {counts.get(id) === 1 ? 'Stelle' : 'Stellen'}
                </span>
              </span>
              <PdfInput label="Erneut öffnen" onFile={(file) => void open(file)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpenDocument({ doc }: { doc: OpenedPdf }) {
  const { docs, activate, close, open, busy, error, jump, searchHits } = useDocuments();
  const {
    annotations,
    index,
    filter: { search },
  } = useViewer();
  // Ein Suchfeld mit der Suchleiste oben (Entscheidung 0077): wer hier tippt, sucht überall.
  const [draft, changeSearch] = useSearchDraft();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  const host = useHostWindow();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sizes, setSizes] = useState<ReadonlyMap<number, PageSize>>(new Map());
  const [current, setCurrent] = useState(1);
  const [hitIndex, setHitIndex] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [linking, setLinking] = useState<{ spot: DocSpot; left: number; top: number } | null>(null);
  const [naming, setNaming] = useState<{ left: number; top: number } | null>(null);
  /** Sprung, dessen Leuchten schon vorbei ist. */
  const [faded, setFaded] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const attachScroller = useCallback((el: HTMLDivElement | null): void => {
    scrollerRef.current = el;
    setScroller(el);
  }, []);

  const pages = doc.pdf.numPages;
  const marks = useMemo(() => marksOfDoc(annotations.documents, doc.id), [annotations, doc.id]);
  const byPage = useMemo(() => {
    const out = new Map<number, DocMark[]>();
    for (const mark of marks) out.set(mark.page, [...(out.get(mark.page) ?? []), mark]);
    return out;
  }, [marks]);

  // Andere Datei gleichen Namens: Stellen von damals hängen an der alten Kennung.
  const otherVersion = useMemo(() => {
    for (const [id, info] of annotations.documents.docs) {
      if (id === doc.id || info.name !== doc.name) continue;
      if (annotations.documents.marks.some((mark) => mark.doc === id)) return true;
    }
    return false;
  }, [annotations, doc]);

  // Erste Seite messen: ihre Größe gilt für alle, bis eine Seite gemessen ist.
  useEffect(() => {
    let alive = true;
    void doc.pdf.getPage(1).then((page) => {
      if (!alive) return;
      const view = page.getViewport({ scale: 1 });
      setSizes(new Map([[1, { width: view.width, height: view.height }]]));
    });
    return () => {
      alive = false;
    };
  }, [doc]);
  const onSize = useCallback((page: number, size: PageSize): void => {
    setSizes((known) => {
      const same = known.get(page);
      if (same?.width === size.width && same.height === size.height) return known;
      return new Map(known).set(page, size);
    });
  }, []);

  useEffect(() => {
    if (scroller === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setWidth(scroller.clientWidth));
    // Meldet sich gleich nach `observe` mit der ersten Breite.
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller]);

  const first = sizes.get(1) ?? null;
  const fit = first === null || width === 0 ? 1 : (width - 2 * GUTTER) / first.width;
  const scale = Math.max(0.2, fit * zoom);

  const scrollToPage = useCallback((page: number): void => {
    const el = scrollerRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (el != null && target != null) el.scrollTop = target.offsetTop - GUTTER;
  }, []);
  const scrollBy = useCallback((dy: number): void => {
    if (scrollerRef.current !== null) scrollerRef.current.scrollTop += dy;
  }, []);

  // Sprung aus der Positionskarte: hinscrollen, die Stelle leuchtet kurz.
  const flash = jump !== null && jump.spot.doc === doc.id && jump.nonce !== faded ? jump : null;
  useEffect(() => {
    if (jump === null || jump.spot.doc !== doc.id) return;
    scrollToPage(jump.spot.page);
    const timer = window.setTimeout(() => setFaded(jump.nonce), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [jump, doc.id, scrollToPage]);

  // Aktuelle Seite aus der Scrolllage.
  useEffect(() => {
    if (scroller === null) return;
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const line = scroller.scrollTop + scroller.clientHeight / 3;
      let page = 1;
      for (const el of scroller.querySelectorAll<HTMLElement>('[data-page]')) {
        if (el.offsetTop > line) break;
        page = Number(el.dataset.page);
      }
      setCurrent(page);
    };
    const onScroll = (): void => {
      if (frame === 0) frame = host.requestAnimationFrame(update);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame !== 0) host.cancelAnimationFrame(frame);
    };
  }, [scroller, host]);

  // Fundstellen rechnet der DocumentsProvider für alle offenen PDFs; hier nur zeigen.
  const needle = docNeedleOf(search);
  const hits = searchHits.get(doc.id) ?? NO_HIT_LIST;
  const [seenHits, setSeenHits] = useState(hits);
  if (seenHits !== hits) {
    setSeenHits(hits);
    setHitIndex(0);
  }
  // Neuer Begriff mit Treffern: zur ersten Fundstelle, einmal je Begriff und Dokument.
  const scrolledFor = useRef('');
  useEffect(() => {
    const key = `${doc.id}:${needle}`;
    if (hits.length === 0 || scrolledFor.current === key) return;
    scrolledFor.current = key;
    scrollToPage(hits[0].page);
  }, [hits, needle, doc.id, scrollToPage]);
  const stepHit = (step: number): void => {
    if (hits.length === 0) return;
    const next = (hitIndex + step + hits.length) % hits.length;
    setHitIndex(next);
    scrollToPage(hits[next].page);
  };
  const currentHit = hits[hitIndex] ?? null;

  const extraFor = useCallback(
    (page: number): DocHighlightItem[] => {
      const out: DocHighlightItem[] = [];
      for (const hit of hits) {
        if (hit.page !== page) continue;
        out.push({
          name: hit === currentHit ? 'docsearch-current' : 'docsearch',
          start: hit.start,
          text: hit.text,
        });
      }
      if (flash !== null && flash.spot.page === page) {
        out.push({ name: 'docflash', start: flash.spot.start, text: flash.spot.text });
      }
      return out;
    },
    [hits, currentHit, flash],
  );
  // Gleiche Liste je Seite, solange sich nichts ändert — sonst färbte jede Seite neu.
  const extras = useMemo(() => {
    const out = new Map<number, DocHighlightItem[]>();
    const pagesWith = new Set([...hits.map((hit) => hit.page), flash?.spot.page ?? 0]);
    for (const page of pagesWith) if (page > 0) out.set(page, extraFor(page));
    return out;
  }, [hits, flash, extraFor]);

  /** Auswahl in der Textebene einer Seite; `at` legt die Leiste dorthin statt unter die Auswahl. */
  const pickFrom = (from: Element | null, at: { left: number; top: number } | null): boolean => {
    const layer = from?.closest<HTMLElement>('.doc-text');
    const pageEl = layer?.closest<HTMLElement>('[data-page]');
    if (layer == null || pageEl == null) return false;
    const target = paintSelection(layer);
    if (target === null) return false;
    setPicked({
      target: at === null ? target : { ...target, ...at },
      page: Number(pageEl.dataset.page),
    });
    return true;
  };
  const onContextMenu = (event: ReactMouseEvent): void => {
    const at = { left: event.clientX, top: event.clientY + 4 };
    if (pickFrom(event.target as Element, at)) event.preventDefault();
  };
  // Ohne Rechtsklick am Tablet: Leiste unter der Auswahl, sobald sie ruht.
  useTouchSelectionMenu(scroller, (selection) => {
    const node = selection.anchorNode;
    // Kein `instanceof`: im zweiten Browserfenster gehören die Knoten zu dessen `Element`.
    const from = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
    pickFrom(from ?? null, null);
  });

  const spotOf = (choice: Picked): DocSpot => ({
    doc: doc.id,
    page: choice.page,
    start: choice.target.start,
    text: choice.target.text,
  });
  /** Eigene Stellen, die die Auswahl berührt. */
  const touched = (choice: Picked): DocMark[] => {
    const end = choice.target.start + choice.target.text.length;
    return (byPage.get(choice.page) ?? []).filter(
      (mark) =>
        mark.paint !== null &&
        mark.start < end &&
        mark.start + mark.text.length > choice.target.start,
    );
  };
  const touchedNow = picked === null ? [] : touched(picked);

  // Stabil, damit `PdfPage` (memo) beim Scrollen nicht alle Seiten neu rendert.
  const badge = useCallback(
    (marks: readonly DocMark[]) => (
      <LinkBadge
        spots={marks}
        ozOf={(id) => {
          const slot = index.slotOf.get(id);
          return slot === undefined ? '?' : (index.nodes[slot].position?.oz ?? '?');
        }}
        titleOf={(id) => {
          const slot = index.slotOf.get(id);
          return slot === undefined ? '' : (index.nodes[slot].position?.shortText ?? '');
        }}
        onPick={(id) => jumpToPosition(id, { stayInView: true })}
      />
    ),
    [index, jumpToPosition],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-[6px] border-b border-line px-[10px] py-[6px]">
        {docs.length > 1 ? (
          <select
            aria-label="Dokument wählen"
            value={doc.id}
            onChange={(event) => activate(event.target.value)}
            className="h-[26px] max-w-[220px] rounded-[var(--r-sm)] border border-line bg-surface px-[6px] font-mono text-[11.5px] text-ink"
          >
            {docs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="max-w-[220px] truncate font-mono text-[11.5px] text-ink"
            title={doc.name}
          >
            {doc.name}
          </span>
        )}
        <span className="font-mono text-[11.5px] text-mute">
          {current} / {pages}
        </span>
        <span className="flex-1" />
        <label className="flex h-[26px] items-center gap-[4px] rounded-[var(--r-sm)] border border-line bg-surface px-[6px]">
          <input
            aria-label="Suchen in LV und Dokumenten"
            value={draft}
            onChange={(event) => changeSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') stepHit(event.shiftKey ? -1 : 1);
            }}
            placeholder="Suchen"
            className="w-[120px] border-none bg-transparent font-mono text-[11.5px] text-ink outline-none"
          />
          {needle !== '' && (
            <span className="font-mono text-[11px] text-mute">
              {hits.length === 0 ? '0' : `${hitIndex + 1}/${hits.length}`}
            </span>
          )}
        </label>
        <button
          type="button"
          aria-label="Vorheriger Treffer"
          disabled={hits.length === 0}
          onClick={() => stepHit(-1)}
          className={TOOL}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Nächster Treffer"
          disabled={hits.length === 0}
          onClick={() => stepHit(1)}
          className={TOOL}
        >
          ▼
        </button>
        <button
          type="button"
          aria-label="Verkleinern"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value / ZOOM_STEP))}
          className={TOOL}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Vergrößern"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value * ZOOM_STEP))}
          className={TOOL}
        >
          +
        </button>
        <PdfInput label={busy ? 'Öffnet…' : 'PDF öffnen'} onFile={(file) => void open(file)} />
        <button
          type="button"
          aria-label={`${doc.name} schließen`}
          title="Dokument schließen — Notizen bleiben"
          onClick={() => close(doc.id)}
          className={TOOL}
        >
          ✕
        </button>
      </div>
      {(otherVersion || error !== null) && (
        <div
          role="status"
          className="shrink-0 border-b border-line bg-amberS px-[12px] py-[6px] font-mono text-[11.5px] text-amber"
        >
          {error ?? 'Andere Fassung als beim Markieren — die Stellen von damals fehlen hier.'}
        </div>
      )}
      <div
        ref={attachScroller}
        onContextMenu={onContextMenu}
        className="relative min-h-0 flex-1 overflow-auto bg-grid2"
        style={{ padding: GUTTER }}
      >
        <div className="flex flex-col items-center" style={{ gap: GUTTER }}>
          {first !== null &&
            Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
              <PdfPage
                key={page}
                doc={doc}
                page={page}
                scale={scale}
                size={sizes.get(page) ?? first}
                root={scroller}
                marks={byPage.get(page) ?? NO_MARKS}
                extra={extras.get(page) ?? NO_EXTRA}
                reveal={
                  flash !== null && flash.spot.page === page
                    ? { start: flash.spot.start, text: flash.spot.text, nonce: flash.nonce }
                    : null
                }
                onSize={onSize}
                scrollBy={scrollBy}
                badge={badge}
              />
            ))}
        </div>
      </div>
      {picked !== null && (
        <PaintBar
          target={picked.target}
          onSearch={() => {
            dispatch({ type: 'search', value: searchTermOf(picked.target.text) });
            host.getSelection()?.removeAllRanges();
            setPicked(null);
          }}
          onCopy={() => {
            void host.navigator.clipboard?.writeText(picked.target.text);
            setPicked(null);
          }}
          onPaint={(paint) => {
            dispatch({ type: 'docPaint', spot: spotOf(picked), paint, at: Date.now() });
            host.getSelection()?.removeAllRanges();
            setPicked(null);
          }}
          onUnpaint={
            touchedNow.length === 0
              ? null
              : () => {
                  for (const mark of touchedNow) {
                    dispatch({ type: 'docPaint', spot: mark, paint: null, at: Date.now() });
                  }
                  setPicked(null);
                }
          }
          onRename={() => {
            setNaming({ left: picked.target.left, top: picked.target.top });
            setPicked(null);
          }}
          onLearn={null}
          onLink={() => {
            setLinking({
              spot: spotOf(picked),
              left: picked.target.left,
              top: picked.target.top,
            });
            setPicked(null);
          }}
          onClose={() => setPicked(null)}
        />
      )}
      {linking !== null && (
        <LinkDialog
          left={linking.left}
          top={linking.top}
          already={
            byPage
              .get(linking.spot.page)
              ?.find((mark) => mark.start === linking.spot.start && mark.text === linking.spot.text)
              ?.links ?? NO_IDS
          }
          onLink={(ids) => {
            dispatch({ type: 'docLink', spot: linking.spot, ids, at: Date.now() });
            host.getSelection()?.removeAllRanges();
            setLinking(null);
          }}
          onClose={() => setLinking(null)}
        />
      )}
      {naming !== null && (
        <PaintNamesDialog left={naming.left} top={naming.top} onClose={() => setNaming(null)} />
      )}
    </div>
  );
}

const NO_MARKS: readonly DocMark[] = [];
const NO_HIT_LIST: readonly DocHit[] = [];
const NO_EXTRA: readonly DocHighlightItem[] = [];
const NO_IDS: readonly string[] = [];

export function DocumentView() {
  const { active } = useDocuments();
  return active === null ? <EmptyDocument /> : <OpenDocument key={active.id} doc={active} />;
}
