// Inhalt des Bereichs „Dokument" (Entscheidung 0072): ein Begleitdokument als PDF
// anzeigen, darin suchen, Stellen anstreichen und von Hand mit Positionen
// verknüpfen. Dieselbe Komponente steht im Splitscreen, im Fenster über dem Graphen
// und im eigenen Browserfenster.
//
// Markieren wie im Langtext: Text auswählen, Rechtsklick (Entscheidung 0063,
// Issue #155). Conocto deutet den Text nicht. Vorschläge gibt es nur, wo eine OZ oder
// eine Menge genau eine Position des LV trifft; verknüpft wird erst per Klick (0080).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { DocOverview } from './DocOverview';
import { DocPicker } from './DocPicker';
import { DocSearchField } from './DocSearchField';
import { useDocuments } from './DocumentsProvider';
import { LinkBadge } from './LinkBadge';
import { LinkDialog } from './LinkDialog';
import { DOC_TOOL as TOOL, PdfInput } from './PdfInput';
import { PdfPage, type PageSize } from './PdfPage';
import { SuggestBar } from './SuggestBar';
import { PlanLayer, type PlanDraft, type PlanTool } from './PlanLayer';
import { MeasureBar, PlanToolbar, ScalePanel } from './PlanControls';
import { usePageInfo } from './usePageInfo';
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
import {
  marksOfDoc,
  pendingSuggestions,
  type DocMark,
  type DocSpot,
} from '../../lib/docs/docNotes';
import type { DocSuggestion, LinkSource } from '../../lib/docs/docSuggest';
import type { OpenedPdf } from '../../lib/docs/pdf';
import { docNeedleOf, type DocHit } from '../../lib/docs/docSearch';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { polylineLength, type PageKind, type PlanPoint } from '@core';
import {
  appendTerm,
  EMPTY_PLAN_NOTES,
  MEASURE_LABEL,
  measuresOfPage,
  pageKindOf,
  parseMass,
  scaleOf,
  type AnsatzTerm,
  type MeasureKind,
  type PlanMeasure,
} from '../../lib/docs/planNotes';

const ZOOM_MIN = 0.5;
// Pläne brauchen viel Zoom für Maßketten; das Bild bleibt scharf (`pageCanvas.ts`).
const ZOOM_MAX = 16;
const ZOOM_STEP = 1.2;
/** Rand links und rechts neben der Seite in px. */
const GUTTER = 16;
/** So lange leuchtet die Stelle nach einem Sprung. */
const FLASH_MS = 1800;

/** Auswahl im Dokument samt Seite; Grundlage für Menü und Verknüpfen. */
interface Picked {
  readonly target: PaintTarget;
  readonly page: number;
}

/** Ohne offenes Dokument: hineinziehen oder wählen; dazu, was schon verknüpft war. */
function EmptyDocument() {
  const { openFiles, busy, error } = useDocuments();
  const { annotations } = useViewer();
  const [over, setOver] = useState(false);
  const { docs, marks } = annotations.documents;
  const counts = new Map<string, number>();
  for (const mark of marks) counts.set(mark.doc, (counts.get(mark.doc) ?? 0) + 1);
  const known = [...docs].filter(([id]) => counts.has(id));
  const drop = (event: DragEvent): void => {
    event.preventDefault();
    setOver(false);
    // Alle abgelegten Dateien, nicht nur die erste (Issue #211).
    void openFiles([...event.dataTransfer.files]);
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
        <span className="font-sans text-[14px] text-ink">PDFs hierher ziehen</span>
        <PdfInput
          label={busy ? 'Öffnet…' : 'PDF öffnen'}
          onFiles={(files) => void openFiles(files)}
        />
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
              <PdfInput label="Erneut öffnen" onFiles={(files) => void openFiles(files)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpenDocument({ doc }: { doc: OpenedPdf }) {
  const {
    close,
    error,
    jump,
    docSearch,
    setDocSearch,
    searchHits,
    suggestions,
    suggest,
    setSuggest,
    pageText,
    ansatzFor,
    setAnsatzFor,
  } = useDocuments();
  const { annotations, index } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  const host = useHostWindow();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sizes, setSizes] = useState<ReadonlyMap<number, PageSize>>(new Map());
  const [scrolled, setCurrent] = useState(1);
  const [hitIndex, setHitIndex] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [linking, setLinking] = useState<{ spot: DocSpot; left: number; top: number } | null>(null);
  const [naming, setNaming] = useState<{ left: number; top: number } | null>(null);
  const [offer, setOffer] = useState<{
    suggestion: DocSuggestion;
    left: number;
    top: number;
  } | null>(null);
  /** Sprung, dessen Leuchten schon vorbei ist. */
  const [faded, setFaded] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const attachScroller = useCallback((el: HTMLDivElement | null): void => {
    scrollerRef.current = el;
    setScroller(el);
  }, []);

  const pages = doc.pdf.numPages;

  // --- Pläne messen (Entscheidung 0095) ---------------------------------------------
  const plans = annotations.plans ?? EMPTY_PLAN_NOTES;
  const pageInfo = usePageInfo(doc, pageText);
  const [pageFilter, setPageFilter] = useState<'alle' | PageKind>('alle');
  const [tool, setTool] = useState<PlanTool | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [scalePage, setScalePage] = useState<number | null>(null);
  const [distance, setDistance] = useState<{ page: number; length: number } | null>(null);
  const [linkingMeasure, setLinkingMeasure] = useState<{
    id: string;
    left: number;
    top: number;
  } | null>(null);
  const kindOf = useCallback(
    (page: number): PageKind =>
      pageKindOf(plans, { doc: doc.id, page }) ?? pageInfo.get(page)?.guess ?? 'text',
    [plans, doc.id, pageInfo],
  );
  const planCount = useMemo(() => {
    let count = 0;
    for (let page = 1; page <= pages; page += 1) if (kindOf(page) === 'plan') count += 1;
    return count;
  }, [pages, kindOf]);
  const shownPages = useMemo(() => {
    const all = Array.from({ length: pages }, (_, i) => i + 1);
    return pageFilter === 'alle' ? all : all.filter((page) => kindOf(page) === pageFilter);
  }, [pages, pageFilter, kindOf]);
  // Nach dem Filtern auf Pläne zählt die erste gezeigte Seite, nicht eine ausgeblendete.
  const current = shownPages.includes(scrolled) ? scrolled : (shownPages[0] ?? scrolled);
  const selectedMeasure = plans.measures.find((entry) => entry.id === selected) ?? null;
  const ansatzNote = ansatzFor === null ? null : (plans.quantities.get(ansatzFor) ?? {});
  const addToAnsatz = useCallback(
    (term: AnsatzTerm): void => {
      if (ansatzFor === null) return;
      const note = plans.quantities.get(ansatzFor) ?? {};
      dispatch({
        type: 'planQuantity',
        id: ansatzFor,
        note: { ...note, ansatz: appendTerm(note.ansatz ?? [], term) },
      });
    },
    [ansatzFor, plans, dispatch],
  );

  const finishDraft = useCallback(
    (kind: MeasureKind, points: readonly PlanPoint[], page: number): void => {
      const count = plans.measures.filter((entry) => entry.kind === kind).length + 1;
      const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const measure: PlanMeasure = {
        id,
        doc: doc.id,
        page,
        kind,
        points,
        name: `${MEASURE_LABEL[kind]} ${count}`,
        links: [],
        at: Date.now(),
      };
      dispatch({ type: 'planMeasure', measure });
      setSelected(id);
      setDraft(null);
      if (ansatzFor !== null) addToAnsatz({ kind: 'messung', id });
    },
    [plans.measures, doc.id, dispatch, ansatzFor, addToAnsatz],
  );
  const minPoints = (kind: PlanTool): number =>
    kind === 'flaeche' ? 3 : kind === 'stueck' ? 1 : 2;
  const canFinish =
    tool !== null &&
    tool !== 'massstab' &&
    draft !== null &&
    draft.points.length >= minPoints(tool);
  const finish = (): void => {
    if (draft === null || tool === null || tool === 'massstab') return;
    if (draft.points.length >= minPoints(tool)) finishDraft(tool, draft.points, draft.page);
  };

  const onTap = useCallback(
    (page: number, point: PlanPoint, scale: number): void => {
      if (tool === null) return;
      const before = draft !== null && draft.page === page ? draft.points : [];
      if (tool === 'massstab') {
        const points = [...before, point];
        if (points.length < 2) {
          setDraft({ page, points });
          return;
        }
        setDraft(null);
        setDistance({ page, length: polylineLength(points.slice(-2)) });
        setScalePage(page);
        return;
      }
      // Fläche: Antippen nahe dem ersten Punkt schließt sie.
      if (tool === 'flaeche' && before.length >= 3) {
        const [x0, y0] = before[0];
        if (Math.hypot(point[0] - x0, point[1] - y0) * scale < 22) {
          finishDraft('flaeche', before, page);
          return;
        }
      }
      setDraft({ page, points: [...before, point] });
    },
    [tool, draft, finishDraft],
  );

  const pickMeasure = useCallback(
    (id: string): void => {
      if (ansatzFor !== null && tool === null) {
        addToAnsatz({ kind: 'messung', id });
        return;
      }
      setSelected((current) => (current === id ? null : id));
    },
    [ansatzFor, tool, addToAnsatz],
  );

  const overlay = useCallback(
    (page: number, size: PageSize, scale: number) => {
      const kind = kindOf(page);
      const guess = pageInfo.get(page)?.guess ?? 'text';
      const toggle = (
        <button
          type="button"
          aria-label={`Seite ${page} ist ${kind === 'plan' ? 'Plan' : 'Text'} — umstellen`}
          title={kind === 'plan' ? 'Als Text behandeln' : 'Als Plan behandeln'}
          onClick={() => {
            const next: PageKind = kind === 'plan' ? 'text' : 'plan';
            dispatch({
              type: 'planKind',
              ref: { doc: doc.id, page },
              kind: next === guess ? null : next,
            });
          }}
          className="absolute left-[6px] top-[6px] z-[4] h-[28px] cursor-pointer rounded-[var(--r-pill)] border border-line bg-surface px-[10px] font-sans text-[11px] text-dim opacity-80 shadow-[var(--shadow-sm)] hover:opacity-100"
        >
          {kind === 'plan' ? 'Plan' : 'Text'}
        </button>
      );
      if (kind !== 'plan') return toggle;
      const ref = { doc: doc.id, page };
      return (
        <>
          {toggle}
          <PlanLayer
            size={size}
            scale={scale}
            measures={measuresOfPage(plans, ref)}
            planScale={scaleOf(plans, ref)}
            draft={draft !== null && draft.page === page ? draft.points : null}
            tool={tool}
            selected={selected}
            picking={ansatzFor !== null}
            onTap={(point) => onTap(page, point, scale)}
            onPick={pickMeasure}
          />
          {scaleOf(plans, ref) === null && (
            <button
              type="button"
              onClick={() => {
                setScalePage(page);
                setDistance(null);
              }}
              className="absolute bottom-[6px] left-[6px] z-[4] h-[28px] cursor-pointer rounded-[var(--r-pill)] border border-amber bg-amberS px-[10px] font-sans text-[11px] text-amber"
            >
              Maßstab fehlt
            </button>
          )}
        </>
      );
    },
    [
      kindOf,
      pageInfo,
      dispatch,
      doc.id,
      plans,
      draft,
      tool,
      selected,
      ansatzFor,
      onTap,
      pickMeasure,
    ],
  );

  /** Gedrucktes Maß unter dem Finger: Zahl im Textinhalt der Seite (Rechenansatz). */
  const massAt = (event: ReactMouseEvent): AnsatzTerm | null => {
    const owner = (event.target as Element).ownerDocument;
    const layer = (event.target as Element).closest<HTMLElement>('.doc-text');
    const pageEl = layer?.closest<HTMLElement>('[data-page]');
    if (layer == null || pageEl == null) return null;
    const caret = owner.caretRangeFromPoint?.(event.clientX, event.clientY) ?? null;
    if (caret === null || !layer.contains(caret.startContainer)) return null;
    // Nur im angetippten Textstück suchen: der PDF-Text klebt Stücke ohne Trenner
    // aneinander („6,50“ + „5,00“ wären sonst eine Zahl).
    const node = caret.startContainer;
    const before = owner.createRange();
    before.setStart(layer, 0);
    before.setEnd(node, 0);
    const base = before.toString().length;
    const offset = caret.startOffset;
    for (const match of (node.textContent ?? '').matchAll(/\d[\d.,]*\d|\d/g)) {
      const start = base + match.index;
      if (offset < match.index - 1 || offset > match.index + match[0].length + 1) continue;
      const value = parseMass(match[0]);
      if (value === null) return null;
      return {
        kind: 'mass',
        value,
        doc: doc.id,
        page: Number(pageEl.dataset.page),
        start,
        text: match[0],
      };
    }
    return null;
  };
  const marks = useMemo(() => marksOfDoc(annotations.documents, doc.id), [annotations, doc.id]);
  const byPage = useMemo(() => {
    const out = new Map<number, DocMark[]>();
    for (const mark of marks) out.set(mark.page, [...(out.get(mark.page) ?? []), mark]);
    return out;
  }, [marks]);

  // Offene Vorschläge (0080): ohne abgelehnte und schon verknüpfte, je Seite.
  const pending = useMemo(
    () => pendingSuggestions(annotations.documents, doc.id, suggestions.get(doc.id) ?? [], suggest),
    [annotations.documents, doc.id, suggestions, suggest],
  );
  const pendingByPage = useMemo(() => {
    const out = new Map<number, DocSuggestion[]>();
    for (const item of pending) out.set(item.page, [...(out.get(item.page) ?? []), item]);
    return out;
  }, [pending]);
  const counts = useMemo(() => {
    const all = suggestions.get(doc.id) ?? [];
    const open = pendingSuggestions(annotations.documents, doc.id, all, { oz: true, menge: true });
    return {
      oz: open.filter((item) => item.source === 'oz').length,
      menge: open.filter((item) => item.source === 'menge').length,
    };
  }, [annotations.documents, doc.id, suggestions]);
  const onSuggestion = useCallback(
    (suggestion: DocSuggestion, at: { left: number; top: number }): void =>
      setOffer({ suggestion, ...at }),
    [],
  );

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
  // Jede Seite auf die Breite eingepasst: ein A0-Plan hinter A4-Text wird sonst riesig.
  const pageScale = (size: PageSize): number =>
    Math.max(0.05, (width === 0 ? 1 : (width - 2 * GUTTER) / size.width) * zoom);

  // Zoomen um einen Punkt: dieselbe Stelle der Seite bleibt unter dem Mauszeiger.
  const zoomRef = useRef(zoom);
  const anchor = useRef<{ page: string; fx: number; fy: number; x: number; y: number } | null>(
    null,
  );
  const zoomBy = useCallback((factor: number, at?: { x: number; y: number }): void => {
    const el = scrollerRef.current;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor));
    if (el === null || next === zoomRef.current) return;
    const view = el.getBoundingClientRect();
    const x = at?.x ?? view.left + view.width / 2;
    const y = at?.y ?? view.top + view.height / 2;
    const pages = [...el.querySelectorAll<HTMLElement>('[data-page]')];
    const under =
      pages.find((page) => {
        const box = page.getBoundingClientRect();
        return y >= box.top && y <= box.bottom;
      }) ?? pages.find((page) => page.getBoundingClientRect().bottom >= y);
    if (under !== undefined) {
      const box = under.getBoundingClientRect();
      anchor.current = {
        page: under.dataset.page ?? '',
        fx: (x - box.left) / box.width,
        fy: (y - box.top) / box.height,
        x,
        y,
      };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const at = anchor.current;
    anchor.current = null;
    if (el === null || at === null) return;
    const page = el.querySelector<HTMLElement>(`[data-page="${at.page}"]`);
    if (page === null) return;
    const box = page.getBoundingClientRect();
    el.scrollLeft += box.left + at.fx * box.width - at.x;
    el.scrollTop += box.top + at.fy * box.height - at.y;
  }, [zoom]);

  // Mausrad: über Plänen zoomen, über Text blättern; mit Strg (auch Zwei-Finger-Zoom am
  // Trackpad) überall zoomen. Eigener Listener, weil React `wheel` passiv anmeldet.
  const kindRef = useRef(kindOf);
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    kindRef.current = kindOf;
  }, [zoom, kindOf]);
  useEffect(() => {
    if (scroller === null) return;
    const onWheel = (event: WheelEvent): void => {
      const target = event.target as Element | null;
      const page = target?.closest?.<HTMLElement>('[data-page]');
      const onPlan = page != null && kindRef.current(Number(page.dataset.page)) === 'plan';
      if (!event.ctrlKey && !event.metaKey && !onPlan) return;
      event.preventDefault();
      const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta = Math.max(-200, Math.min(200, event.deltaY * lines));
      zoomBy(Math.exp(-delta * 0.002), { x: event.clientX, y: event.clientY });
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [scroller, zoomBy]);

  // Verschieben: mittlere Maustaste überall, linke auf Plänen (auch beim Messen). Erst ab
  // ein paar Pixeln Weg — ein Antippen bleibt ein Antippen.
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const swallowClick = useRef(false);
  const onPanStart = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'touch' && tool === null) return;
    const target = event.target as Element;
    if (target.closest('button, input, a, [role="dialog"]') !== null) return;
    const page = target.closest<HTMLElement>('[data-page]');
    const onPlan = page !== null && kindOf(Number(page.dataset.page)) === 'plan';
    if (!(event.button === 1 || (event.button === 0 && onPlan))) return;
    if (event.button === 1) event.preventDefault();
    const el = event.currentTarget;
    pan.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
  };
  const onPanMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = pan.current;
    if (state === null || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && Math.hypot(dx, dy) < 5) return;
    if (!state.moved) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    host.getSelection()?.removeAllRanges();
    event.currentTarget.scrollLeft = state.left - dx;
    event.currentTarget.scrollTop = state.top - dy;
  };
  const onPanEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = pan.current;
    if (state === null || state.id !== event.pointerId) return;
    pan.current = null;
    swallowClick.current = state.moved;
  };

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
  const needle = docNeedleOf(docSearch);
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
  const positionOf = (id: string) => {
    const slot = index.slotOf.get(id);
    return slot === undefined ? null : index.nodes[slot].position;
  };

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
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-[6px] border-b border-line px-[10px] py-[6px]">
        <DocPicker doc={doc} />
        <span className="font-mono text-[11.5px] text-mute">
          {current} / {pages}
        </span>
        {planCount > 0 && (
          <span role="radiogroup" aria-label="Seiten" className="flex items-center gap-[2px]">
            {(
              [
                ['alle', `Alle ${pages}`],
                ['text', `Text ${pages - planCount}`],
                ['plan', `Pläne ${planCount}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={pageFilter === value}
                onClick={() => setPageFilter(value)}
                className={`${TOOL} ${pageFilter === value ? 'border-accent bg-accent-soft text-accent-ink' : ''}`}
              >
                {label}
              </button>
            ))}
          </span>
        )}
        {planCount > 0 && (
          <button
            type="button"
            aria-pressed={tool !== null}
            onClick={() => {
              setTool((current) => (current === null ? 'laenge' : null));
              setDraft(null);
            }}
            className={`${TOOL} ${tool !== null ? 'border-accent bg-accent-soft text-accent-ink' : ''}`}
          >
            Messen
          </button>
        )}
        <span className="flex-1" />
        {counts.oz + counts.menge > 0 && (
          <SuggestToggles counts={counts} suggest={suggest} setSuggest={setSuggest} />
        )}
        <DocSearchField
          rootRef={rootRef}
          hitCount={hits.length}
          hitIndex={hitIndex}
          onStep={stepHit}
        />
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
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          className={TOOL}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Vergrößern"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => zoomBy(ZOOM_STEP)}
          className={TOOL}
        >
          +
        </button>
        {zoom !== 1 && (
          <button
            type="button"
            title="Auf Breite einpassen"
            onClick={() => zoomBy(1 / zoom)}
            className={TOOL}
          >
            {Math.round(zoom * 100)} %
          </button>
        )}
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
      {ansatzFor !== null && ansatzNote !== null && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-[8px] border-b border-line bg-accent-soft px-[12px] py-[6px] font-sans text-[12.5px] text-accent-ink"
        >
          <span className="flex-1">
            Ansatz für {positionOf(ansatzFor)?.oz ?? 'Position'}: Maß oder Messung im Plan antippen
          </span>
          <button type="button" className="cn-btn" onClick={() => setAnsatzFor(null)}>
            Fertig
          </button>
        </div>
      )}
      {/* Werkzeugleiste und Maßstab schweben über dem Plan, nicht über der Leiste. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={attachScroller}
          onContextMenu={onContextMenu}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerCancel={onPanEnd}
          onClickCapture={(event) => {
            // Nach dem Verschieben ist das Loslassen kein Klick (Maß, Messung, Text).
            if (!swallowClick.current) return;
            swallowClick.current = false;
            event.stopPropagation();
            event.preventDefault();
          }}
          onClick={(event) => {
            if (ansatzFor === null || tool !== null) return;
            const term = massAt(event);
            if (term === null) return;
            host.getSelection()?.removeAllRanges();
            addToAnsatz(term);
          }}
          className="relative min-h-0 flex-1 overflow-auto bg-grid2"
          style={{ padding: GUTTER }}
        >
          {/* Ohne `items-center`: breiter als der Bereich wäre der linke Rand unerreichbar. */}
          <div className="flex w-max min-w-full flex-col" style={{ gap: GUTTER }}>
            {first !== null &&
              shownPages.map((page) => (
                <PdfPage
                  key={page}
                  doc={doc}
                  page={page}
                  scale={pageScale(sizes.get(page) ?? first)}
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
                  suggestions={pendingByPage.get(page) ?? NO_SUGGESTIONS}
                  onSuggestion={onSuggestion}
                  overlay={overlay}
                />
              ))}
          </div>
        </div>
        {tool !== null && (
          <PlanToolbar
            tool={tool}
            hasScale={scaleOf(plans, { doc: doc.id, page: current }) !== null}
            canFinish={canFinish}
            canUndo={draft !== null && draft.points.length > 0}
            onTool={(next) => {
              setTool(next);
              setDraft(null);
              if (next === 'massstab') {
                setDistance(null);
                setScalePage(current);
              }
            }}
            onUndo={() =>
              setDraft((value) =>
                value === null || value.points.length <= 1
                  ? null
                  : { ...value, points: value.points.slice(0, -1) },
              )
            }
            onFinish={finish}
            onClose={() => {
              setTool(null);
              setDraft(null);
            }}
          />
        )}
        {scalePage !== null && (
          <ScalePanel
            page={scalePage}
            current={scaleOf(plans, { doc: doc.id, page: scalePage })}
            ratios={pageInfo.get(scalePage)?.ratios ?? []}
            sameRatioPages={(ratio) =>
              shownPagesAll(pages).filter(
                (page) =>
                  page !== scalePage &&
                  kindOf(page) === 'plan' &&
                  pageInfo.get(page)?.ratios[0] === ratio,
              )
            }
            unscaledPages={shownPagesAll(pages).filter(
              (page) =>
                page !== scalePage &&
                kindOf(page) === 'plan' &&
                scaleOf(plans, { doc: doc.id, page }) === null,
            )}
            distance={distance !== null && distance.page === scalePage ? distance.length : null}
            onApply={(unit, source, list) => {
              dispatch({
                type: 'planScale',
                refs: list.map((page) => ({ doc: doc.id, page })),
                scale: { unit, source, at: Date.now() },
              });
              setScalePage(null);
              setDistance(null);
              setTool((value) => (value === 'massstab' ? 'laenge' : value));
            }}
            onRemove={() =>
              dispatch({
                type: 'planScale',
                refs: [{ doc: doc.id, page: scalePage }],
                scale: null,
              })
            }
            onMeasure={() => {
              setDistance(null);
              setDraft(null);
              setTool('massstab');
            }}
            onClose={() => {
              setScalePage(null);
              setDistance(null);
            }}
          />
        )}
      </div>
      {selectedMeasure !== null && (
        <MeasureBar
          measure={selectedMeasure}
          scale={scaleOf(plans, selectedMeasure)}
          ozOf={(id) => positionOf(id)?.oz ?? '?'}
          onRename={(name) =>
            dispatch({ type: 'planMeasure', measure: { ...selectedMeasure, name } })
          }
          onLink={(anchor) => setLinkingMeasure({ id: selectedMeasure.id, ...anchor })}
          onUnlink={(id) =>
            dispatch({
              type: 'planMeasure',
              measure: {
                ...selectedMeasure,
                links: selectedMeasure.links.filter((entry) => entry !== id),
              },
            })
          }
          onShowPosition={(id) => jumpToPosition(id, { stayInView: true })}
          onRemove={() => {
            dispatch({ type: 'planRemove', id: selectedMeasure.id });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {linkingMeasure !== null && (
        <LinkDialog
          left={linkingMeasure.left}
          top={linkingMeasure.top}
          already={plans.measures.find((entry) => entry.id === linkingMeasure.id)?.links ?? NO_IDS}
          onLink={(ids) => {
            const measure = plans.measures.find((entry) => entry.id === linkingMeasure.id);
            if (measure !== undefined) {
              dispatch({
                type: 'planMeasure',
                measure: { ...measure, links: [...measure.links, ...ids] },
              });
            }
            setLinkingMeasure(null);
          }}
          onClose={() => setLinkingMeasure(null)}
        />
      )}
      {picked !== null && (
        <PaintBar
          target={picked.target}
          searches={[
            {
              label: 'Im PDF suchen',
              run: () => {
                setDocSearch(searchTermOf(picked.target.text));
                host.getSelection()?.removeAllRanges();
                setPicked(null);
              },
            },
            {
              label: 'Im LV suchen',
              run: () => {
                dispatch({ type: 'search', value: searchTermOf(picked.target.text) });
                host.getSelection()?.removeAllRanges();
                setPicked(null);
              },
            },
          ]}
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
      {offer !== null && (
        <SuggestBar
          suggestion={offer.suggestion}
          oz={positionOf(offer.suggestion.id)?.oz ?? '?'}
          shortText={positionOf(offer.suggestion.id)?.shortText ?? ''}
          left={offer.left}
          top={offer.top}
          onLink={() => {
            const { suggestion } = offer;
            dispatch({
              type: 'docLink',
              spot: {
                doc: doc.id,
                page: suggestion.page,
                start: suggestion.start,
                text: suggestion.text,
              },
              ids: [suggestion.id],
              at: Date.now(),
              source: suggestion.source,
            });
            setOffer(null);
          }}
          onReject={() => {
            const { suggestion } = offer;
            dispatch({
              type: 'docReject',
              spot: {
                doc: doc.id,
                page: suggestion.page,
                start: suggestion.start,
                text: suggestion.text,
              },
              id: suggestion.id,
              at: Date.now(),
            });
            setOffer(null);
          }}
          onShow={() => jumpToPosition(offer.suggestion.id, { stayInView: true })}
          onClose={() => setOffer(null)}
        />
      )}
      {naming !== null && (
        <PaintNamesDialog left={naming.left} top={naming.top} onClose={() => setNaming(null)} />
      )}
    </div>
  );
}

const shownPagesAll = (pages: number): number[] => Array.from({ length: pages }, (_, i) => i + 1);

const NO_MARKS: readonly DocMark[] = [];
const NO_HIT_LIST: readonly DocHit[] = [];
const NO_EXTRA: readonly DocHighlightItem[] = [];
const NO_IDS: readonly string[] = [];
const NO_SUGGESTIONS: readonly DocSuggestion[] = [];

const SOURCE_LABEL: Readonly<Record<LinkSource, string>> = { oz: 'OZ', menge: 'Mengen' };

/**
 * Schalter je Art von Vorschlag, mit der Zahl der offenen Vorschläge im Dokument. Eine Art
 * ohne offene Vorschläge (alle übernommen oder abgelehnt) verschwindet.
 */
function SuggestToggles({
  counts,
  suggest,
  setSuggest,
}: {
  counts: Readonly<Record<LinkSource, number>>;
  suggest: Readonly<Record<LinkSource, boolean>>;
  setSuggest: (source: LinkSource, on: boolean) => void;
}) {
  return (
    <span role="group" aria-label="Vorschläge" className="flex items-center gap-[4px]">
      <span className="font-mono text-[11px] text-mute">Vorschläge</span>
      {(['oz', 'menge'] as const)
        .filter((source) => counts[source] > 0)
        .map((source) => (
          <button
            key={source}
            type="button"
            aria-pressed={suggest[source]}
            title={
              suggest[source]
                ? `${SOURCE_LABEL[source]}-Vorschläge ausblenden`
                : `${SOURCE_LABEL[source]}-Vorschläge zeigen`
            }
            onClick={() => setSuggest(source, !suggest[source])}
            className={`${TOOL} gap-[4px] ${
              suggest[source] ? '' : 'text-mute line-through decoration-line2'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-[10px] border-b-2 border-dashed ${
                source === 'oz' ? 'border-accent' : 'border-amber'
              }`}
            />
            {SOURCE_LABEL[source]} {counts[source]}
          </button>
        ))}
    </span>
  );
}

export function DocumentView() {
  const { active, overview } = useDocuments();
  if (active === null) return <EmptyDocument />;
  return overview ? <DocOverview /> : <OpenDocument key={active.id} doc={active} />;
}
