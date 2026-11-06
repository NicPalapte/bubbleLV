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
import { DocKindChip } from './DocKindChip';
import { DocOverview } from './DocOverview';
import { DocPicker } from './DocPicker';
import { DocSearchField } from './DocSearchField';
import { useDocuments } from './DocumentsProvider';
import { LinkBadge } from './LinkBadge';
import { LinkDialog } from './LinkDialog';
import { DOC_TOOL as TOOL, PdfInput } from './PdfInput';
import { PdfPage, type PageSize } from './PdfPage';
import { SuggestBar } from './SuggestBar';
import { PlanLayer, type PlanDraft } from './PlanLayer';
import { GROUP_OF, SNAP_TOOLS, TWO_POINT_TOOLS, type PlanTool, type ToolGroup } from './planTools';
import { MeasureBar, PlanToolbar, ScalePanel } from './PlanControls';
import { MoreMenu } from './MoreMenu';
import { usePageInfo } from './usePageInfo';
import { pageMaskOf, snapAt, type PageMask, type Snap } from './pageMask';
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
import {
  polylineLength,
  selectInWindow,
  windowModeOf,
  windowOf,
  type PageKind,
  type PlanPoint,
  type WindowMode,
} from '@core';
import {
  appendTerm,
  EMPTY_PLAN_NOTES,
  formatMeasure,
  MEASURE_UNIT,
  measuresOfPage,
  measureValue,
  pageKindOf,
  parseMass,
  scaleOf,
  type AnsatzTerm,
  type MeasureKind,
  type PlanMeasure,
  rectangleFrom,
  selectShapeOf,
} from '../../lib/docs/planNotes';

const ZOOM_MIN = 0.5;
// Pläne brauchen viel Zoom für Maßketten; das Bild bleibt scharf (`pageCanvas.ts`).
const ZOOM_MAX = 16;
const ZOOM_STEP = 1.2;
/** Ab dieser Breite der Kopfleiste (px) wandern Knöpfe ins Menü „⋯“, darunter auch die Suche. */
const NARROW_BAR = 640;
const TIGHT_BAR = 440;
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
    setOverview,
    planWanted,
    donePlanWanted,
    error,
    jump,
    doneJump,
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
  /** Sprung, zu dem schon gescrollt ist. */
  const [landed, setLanded] = useState(0);
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
  const [selected, setSelected] = useState<readonly string[]>(NO_IDS);
  const [scalePage, setScalePage] = useState<number | null>(null);
  const [distance, setDistance] = useState<{ page: number; length: number } | null>(null);
  const [linkingMeasure, setLinkingMeasure] = useState<{
    ids: readonly string[];
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
  // Ansatz gestartet (Nico, 06.11.2026): nur die Pläne zeigen; hat dieses PDF keine,
  // in die Übersicht springen, damit ein Plan gewählt wird. Erst wenn alle Seiten geschätzt
  // sind, sonst wirkt ein großer Plansatz am Anfang planlos.
  const pagesKnown = pageInfo.size >= pages;
  const hasPlans = planCount > 0;
  // Je Ansatz einmal auf die Pläne stellen; danach darf man selbst umschalten.
  const planFor = ansatzFor !== null && pagesKnown && hasPlans ? ansatzFor : null;
  const [plansShownFor, setPlansShownFor] = useState<string | null>(null);
  if (planFor !== null && planFor !== plansShownFor) {
    setPlansShownFor(planFor);
    setPageFilter('plan');
  }
  useEffect(() => {
    if (!planWanted || ansatzFor === null || !pagesKnown) return;
    donePlanWanted();
    if (!hasPlans) setOverview(true);
  }, [ansatzFor, pagesKnown, hasPlans, planWanted, donePlanWanted, setOverview]);
  // Liegt das Sprungziel auf einer ausgeblendeten Seite, wieder alle Seiten zeigen.
  if (
    jump !== null &&
    jump.spot.doc === doc.id &&
    pageFilter !== 'alle' &&
    kindOf(jump.spot.page) !== pageFilter
  ) {
    setPageFilter('alle');
  }
  const shownPages = useMemo(() => {
    const all = Array.from({ length: pages }, (_, i) => i + 1);
    return pageFilter === 'alle' ? all : all.filter((page) => kindOf(page) === pageFilter);
  }, [pages, pageFilter, kindOf]);
  // Nach dem Filtern auf Pläne zählt die erste gezeigte Seite, nicht eine ausgeblendete.
  const current = shownPages.includes(scrolled) ? scrolled : (shownPages[0] ?? scrolled);
  const selectedMeasures = plans.measures.filter((entry) => selected.includes(entry.id));
  const selectedMeasure = selectedMeasures.length === 1 ? selectedMeasures[0] : null;
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
    (from: PlanTool, points: readonly PlanPoint[], page: number, snapped?: Snap): void => {
      if (from === 'massstab') return;
      const kind = TOOL_KIND[from];
      const shape =
        snapped !== undefined
          ? snapped.shape
          : from === 'rechteck' || from === 'kreis'
            ? from
            : undefined;
      const count = plans.measures.filter((entry) => entry.kind === kind).length + 1;
      const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const measure: PlanMeasure = {
        id,
        doc: doc.id,
        page,
        kind,
        points:
          snapped !== undefined
            ? snapped.points
            : from === 'rechteck'
              ? rectangleFrom(points[0], points[1])
              : points,
        ...(shape === undefined ? {} : { shape }),
        name: `${TOOL_NAME[from]} ${count}`,
        links: [],
        at: Date.now(),
      };
      dispatch({ type: 'planMeasure', measure });
      setSelected([id]);
      setDraft(null);
      if (ansatzFor !== null) addToAnsatz({ kind: 'messung', id });
    },
    [plans.measures, doc.id, dispatch, ansatzFor, addToAnsatz],
  );
  const minPoints = (kind: PlanTool): number =>
    kind === 'polygon' ? 3 : kind === 'stueck' ? 1 : 2;
  const canFinish =
    tool !== null &&
    tool !== 'massstab' &&
    draft !== null &&
    draft.points.length >= minPoints(tool);
  const finish = (): void => {
    if (draft === null || tool === null || tool === 'massstab') return;
    if (draft.points.length >= minPoints(tool)) finishDraft(tool, draft.points, draft.page);
  };

  const [snap, setSnap] = useState<(Snap & { page: number }) | null>(null);
  // Zuletzt gewählte Form je Hauptwerkzeug (Länge: Strecke/Kette, Fläche: Rechteck/…).
  const [lastShape, setLastShape] = useState<Readonly<Record<ToolGroup, PlanTool>>>({
    laenge: 'laenge',
    flaeche: 'rechteck',
    stueck: 'stueck',
  });
  const chooseTool = (next: PlanTool): void => {
    setTool(next);
    setDraft(null);
    setSnap(null);
    if (next !== 'massstab') setLastShape((map) => ({ ...map, [GROUP_OF[next]]: next }));
  };

  // Erkannte Fläche unter dem Mauszeiger (Rechteck, Kreis). Die Linienmaske je Seite wird
  // einmal gezeichnet und gemerkt.
  const masks = useRef(new Map<number, Promise<PageMask | null>>());
  const hoverTimer = useRef(0);
  const onHover = useCallback(
    (page: number, point: PlanPoint | null, free: boolean): void => {
      host.clearTimeout(hoverTimer.current);
      const busy = draft !== null && draft.points.length > 0;
      if (point === null || free || busy || tool === null || !SNAP_TOOLS.has(tool)) {
        setSnap((current) => (current === null ? current : null));
        return;
      }
      const circle = tool === 'kreis';
      hoverTimer.current = host.setTimeout(() => {
        let mask = masks.current.get(page);
        if (mask === undefined) {
          mask = doc.pdf
            .getPage(page)
            .then(pageMaskOf)
            .catch(() => null);
          masks.current.set(page, mask);
        }
        void mask.then((ready) => {
          const found = ready === null ? null : snapAt(ready, point, circle);
          setSnap(found === null ? null : { ...found, page });
        });
      }, 120);
    },
    [host, draft, tool, doc.pdf],
  );

  const onTap = useCallback(
    (page: number, point: PlanPoint, scale: number): void => {
      if (tool === null) return;
      const before = draft !== null && draft.page === page ? draft.points : [];
      // Erkannte Fläche unter dem Zeiger: ein Klick übernimmt sie.
      if (SNAP_TOOLS.has(tool) && before.length === 0 && snap !== null && snap.page === page) {
        finishDraft(tool, snap.points, page, snap);
        setSnap(null);
        return;
      }
      // Kette: Doppelklick (zweiter Klick auf dieselbe Stelle) beendet sie.
      if (tool === 'kette' && before.length > 0) {
        const [lx, ly] = before[before.length - 1];
        if (Math.hypot(point[0] - lx, point[1] - ly) * scale < 6) {
          if (before.length >= 2) finishDraft('kette', before, page);
          return;
        }
      }
      const points = [...before, point];
      if (tool === 'massstab') {
        if (points.length < 2) {
          setDraft({ page, points });
          return;
        }
        setDraft(null);
        setDistance({ page, length: polylineLength(points.slice(-2)) });
        setScalePage(page);
        return;
      }
      // Länge, Rechteck, Kreis: mit dem zweiten Punkt fertig.
      if (TWO_POINT_TOOLS.has(tool) && points.length >= 2) {
        finishDraft(tool, points.slice(-2), page);
        return;
      }
      // Polygon: Antippen nahe dem ersten Punkt schließt es.
      if (tool === 'polygon' && before.length >= 3) {
        const [x0, y0] = before[0];
        if (Math.hypot(point[0] - x0, point[1] - y0) * scale < 22) {
          finishDraft('polygon', before, page);
          return;
        }
      }
      setDraft({ page, points });
    },
    [tool, draft, finishDraft, snap],
  );

  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
    /** Seite, auf der das Auswahlfenster beginnt; sonst wird verschoben. */
    frame: HTMLElement | null;
    add: boolean;
  } | null>(null);
  const space = useRef(false);

  // Tastatur wie im CAD: Esc beendet den Befehl, Enter schließt ab, Entf löscht die gewählte
  // Messung, Rücktaste nimmt den letzten Punkt zurück. Nicht beim Tippen in Feldern.
  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useLayoutEffect(() => {
    keys.current = (event: KeyboardEvent): void => {
      const target = event.target as Element | null;
      const typing = target?.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing != null) return;
      if (event.key === ' ' && target?.closest?.('button') == null) {
        // Leertaste gehalten: Ziehen verschiebt den Plan statt ein Fenster aufzuziehen.
        space.current = true;
        if (pan.current === null) event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        if (linkingMeasure !== null || scalePage !== null) return;
        if (draft !== null && tool !== null && tool !== 'massstab') {
          if (draft.points.length >= minPoints(tool)) finishDraft(tool, draft.points, draft.page);
          else setDraft(null);
        } else if (draft !== null) {
          setDraft(null);
        } else if (tool !== null) {
          setTool(null);
          setSnap(null);
        } else if (ansatzFor !== null) {
          setAnsatzFor(null);
        } else if (selected.length > 0) {
          setSelected(NO_IDS);
        } else {
          return;
        }
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' && canFinish) {
        finish();
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace' && draft !== null) {
        setDraft(draft.points.length <= 1 ? null : { ...draft, points: draft.points.slice(0, -1) });
        event.preventDefault();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selected.length > 0) {
          for (const id of selected) dispatch({ type: 'planRemove', id });
          setSelected(NO_IDS);
          event.preventDefault();
        }
      }
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => keys.current(event);
    const onUp = (event: KeyboardEvent): void => {
      if (event.key === ' ') space.current = false;
    };
    const onBlur = (): void => {
      space.current = false;
    };
    host.addEventListener('keydown', onKey);
    host.addEventListener('keyup', onUp);
    host.addEventListener('blur', onBlur);
    return () => {
      host.removeEventListener('keydown', onKey);
      host.removeEventListener('keyup', onUp);
      host.removeEventListener('blur', onBlur);
    };
  }, [host]);

  const pickMeasure = useCallback(
    (id: string, add: boolean): void => {
      if (ansatzFor !== null && tool === null) {
        addToAnsatz({ kind: 'messung', id });
        return;
      }
      // Mit Shift mehrere wählen; ohne Shift nur diese (oder keine, wenn schon allein gewählt).
      setSelected((current) => {
        if (add) {
          return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
        }
        return current.length === 1 && current[0] === id ? NO_IDS : [id];
      });
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
            snap={snap !== null && snap.page === page ? snap : null}
            onTap={(point) => onTap(page, point, scale)}
            onPick={pickMeasure}
            onHover={(point, free) => onHover(page, point, free)}
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
      snap,
      onHover,
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

  // Linke Maustaste auf Plänen ohne Werkzeug zieht ein Auswahlfenster wie im CAD (Nico,
  // 06.11.2026). Verschieben: mittlere Maustaste, Leertaste + Ziehen, beim Messen auch links,
  // am Touchscreen mit dem Finger. Erst ab ein paar Pixeln Weg — Antippen bleibt Antippen.
  const [frameBox, setFrameBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    mode: WindowMode;
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
    const framing =
      event.button === 0 &&
      event.pointerType !== 'touch' &&
      tool === null &&
      ansatzFor === null &&
      !space.current;
    const el = event.currentTarget;
    pan.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
      frame: framing ? page : null,
      add: event.shiftKey,
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
    if (state.frame !== null) {
      const origin = event.currentTarget.parentElement?.getBoundingClientRect();
      if (origin === undefined) return;
      setFrameBox({
        left: Math.min(state.x, event.clientX) - origin.left,
        top: Math.min(state.y, event.clientY) - origin.top,
        width: Math.abs(dx),
        height: Math.abs(dy),
        mode: windowModeOf([state.x, state.y], [event.clientX, event.clientY]),
      });
      return;
    }
    event.currentTarget.scrollLeft = state.left - dx;
    event.currentTarget.scrollTop = state.top - dy;
  };
  const onPanEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = pan.current;
    if (state === null || state.id !== event.pointerId) return;
    pan.current = null;
    swallowClick.current = state.moved;
    setFrameBox(null);
    if (state.frame === null) return;
    if (!state.moved) {
      // Antippen ins Leere ohne Shift hebt die Auswahl auf, wie im CAD.
      if (!state.add) setSelected(NO_IDS);
      return;
    }
    if (event.type === 'pointercancel') return;
    const pageNo = Number(state.frame.dataset.page);
    const size = sizes.get(pageNo) ?? first;
    if (size === null) return;
    const box = state.frame.getBoundingClientRect();
    const unit = size.width / box.width;
    const toPage = (x: number, y: number): PlanPoint => [
      (x - box.left) * unit,
      (y - box.top) * unit,
    ];
    const start: PlanPoint = [state.x, state.y];
    const end: PlanPoint = [event.clientX, event.clientY];
    const shapes = plans.measures
      .filter((entry) => entry.doc === doc.id && entry.page === pageNo)
      .map((entry) => ({ id: entry.id, ...selectShapeOf(entry) }));
    const hits = selectInWindow(
      windowOf(toPage(...start), toPage(...end)),
      shapes,
      windowModeOf(start, end),
    );
    setSelected((current) => {
      if (!state.add) return hits.length === 0 ? NO_IDS : hits;
      return [...new Set([...current, ...hits])];
    });
  };

  const scrollToPage = useCallback((page: number): void => {
    const el = scrollerRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (el != null && target != null) el.scrollTop = target.offsetTop - GUTTER;
  }, []);
  const scrollBy = useCallback((dy: number): void => {
    if (scrollerRef.current !== null) scrollerRef.current.scrollTop += dy;
  }, []);

  // Sprung von einer Verknüpfung (Positionskarte, Graph): hinscrollen, sobald die Seite
  // steht — frisch geöffnet ist sie das erst nach dem Messen der Seitengröße. Die Stelle
  // leuchtet kurz, dann ist der Sprung erledigt und wiederholt sich beim nächsten Öffnen nicht.
  const target = jump !== null && jump.spot.doc === doc.id ? jump : null;
  useEffect(() => {
    if (target === null || target.nonce === landed) return;
    // Andere Fassung des PDFs mit weniger Seiten: Ziel gibt es nicht, Sprung verwerfen.
    if (target.spot.page > pages) return doneJump(target.nonce);
    if (first === null) return;
    if (scrollerRef.current?.querySelector(`[data-page="${target.spot.page}"]`) == null) return;
    scrollToPage(target.spot.page);
    setLanded(target.nonce);
  }, [target, landed, first, shownPages, pages, scrollToPage, doneJump]);
  const flash = target !== null && target.nonce === landed ? target : null;
  useEffect(() => {
    if (flash === null) return;
    const timer = window.setTimeout(() => doneJump(flash.nonce), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash, doneJump]);

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

  // Schmaler Bereich: seltene Knöpfe wandern ins Menü „⋯“, ganz schmal auch die Suche.
  const narrow = width > 0 && width < NARROW_BAR;
  const tight = width > 0 && width < TIGHT_BAR;
  const suggestEl =
    counts.oz + counts.menge > 0 ? (
      <SuggestToggles counts={counts} suggest={suggest} setSuggest={setSuggest} />
    ) : null;
  const searchEl = (
    <DocSearchField rootRef={rootRef} hitCount={hits.length} hitIndex={hitIndex} onStep={stepHit} />
  );
  const stepEls = (
    <>
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
    </>
  );
  const zoomEls = (
    <>
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
    </>
  );

  const pageChoices = [
    ['alle', `Alle ${pages}`],
    ['text', `Text ${pages - planCount}`],
    ['plan', `Pläne ${planCount}`],
  ] as const;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-[6px] border-b border-line px-[10px] py-[6px]">
        {/* Links und als Pfeil, damit er nicht wie „Bereich schließen“ rechts daneben wirkt. */}
        <button
          type="button"
          aria-label="Zur Übersicht"
          title="Zur Übersicht aller PDFs — das PDF bleibt offen"
          onClick={() => setOverview(true)}
          className={TOOL}
        >
          ←
        </button>
        <DocPicker doc={doc} />
        {!tight && (
          <div className="shrink-0">
            <DocKindChip id={doc.id} name={doc.name} />
          </div>
        )}
        {!tight && (
          <span className="shrink-0 font-mono text-[11.5px] text-mute">
            {current} / {pages}
          </span>
        )}
        {planCount > 0 && narrow && (
          // Schmal: eine Auswahl statt drei Knöpfen, sonst schieben sie sich übereinander.
          <select
            aria-label="Seiten"
            value={pageFilter}
            onChange={(event) => setPageFilter(event.target.value as 'alle' | PageKind)}
            className={`${TOOL} ${pageFilter === 'alle' ? '' : 'border-accent bg-accent-soft text-accent-ink'}`}
          >
            {pageChoices.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {planCount > 0 && !narrow && (
          <span
            role="radiogroup"
            aria-label="Seiten"
            className="flex shrink-0 items-center gap-[2px]"
          >
            {pageChoices.map(([value, label]) => (
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
        {!narrow && suggestEl}
        {!tight && searchEl}
        {!narrow && stepEls}
        {!narrow && zoomEls}
        {narrow && (
          <MoreMenu>
            {tight && searchEl}
            {stepEls}
            {zoomEls}
            {suggestEl}
          </MoreMenu>
        )}
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
        {frameBox !== null && (
          // Durchgezogen: nur was ganz drin liegt; gestrichelt: alles, was berührt wird.
          <div
            aria-hidden
            className={`pointer-events-none absolute z-[5] border border-accent ${
              frameBox.mode === 'inside' ? 'border-solid' : 'border-dashed'
            }`}
            style={{
              left: frameBox.left,
              top: frameBox.top,
              width: frameBox.width,
              height: frameBox.height,
            }}
          >
            <div className="absolute inset-0 bg-accent-soft opacity-40" />
          </div>
        )}
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
            onGroup={(group) => chooseTool(lastShape[group])}
            onTool={(next) => {
              chooseTool(next);
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
          onLink={(anchor) => setLinkingMeasure({ ids: [selectedMeasure.id], ...anchor })}
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
            setSelected(NO_IDS);
          }}
          onClose={() => setSelected(NO_IDS)}
        />
      )}
      {selectedMeasures.length > 1 && (
        <SelectionBar
          measures={selectedMeasures}
          valueOf={(measure) => measureValue(measure, scaleOf(plans, measure))}
          onLink={(anchor) =>
            setLinkingMeasure({ ids: selectedMeasures.map((entry) => entry.id), ...anchor })
          }
          onRemove={() => {
            for (const measure of selectedMeasures) {
              dispatch({ type: 'planRemove', id: measure.id });
            }
            setSelected(NO_IDS);
          }}
          onClose={() => setSelected(NO_IDS)}
        />
      )}
      {linkingMeasure !== null && (
        <LinkDialog
          left={linkingMeasure.left}
          top={linkingMeasure.top}
          already={
            linkingMeasure.ids.length === 1
              ? (plans.measures.find((entry) => entry.id === linkingMeasure.ids[0])?.links ??
                NO_IDS)
              : NO_IDS
          }
          onLink={(ids) => {
            for (const measure of plans.measures) {
              if (!linkingMeasure.ids.includes(measure.id)) continue;
              dispatch({
                type: 'planMeasure',
                measure: { ...measure, links: [...new Set([...measure.links, ...ids])] },
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

/** Messart je Werkzeug; Rechteck, Polygon und Kreis sind Flächen. */
const TOOL_KIND: Readonly<Record<Exclude<PlanTool, 'massstab'>, MeasureKind>> = {
  laenge: 'laenge',
  kette: 'kette',
  rechteck: 'flaeche',
  polygon: 'flaeche',
  kreis: 'flaeche',
  stueck: 'stueck',
};

const TOOL_NAME: Readonly<Record<Exclude<PlanTool, 'massstab'>, string>> = {
  laenge: 'Länge',
  kette: 'Kette',
  rechteck: 'Fläche',
  polygon: 'Fläche',
  kreis: 'Fläche',
  stueck: 'Stück',
};

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

/**
 * Mehrere Messungen gewählt (Shift): Summe und Verknüpfen nur bei gleicher Art (gleiche
 * Einheit, Länge und Kette zählen zusammen); verschiedene Arten lassen sich nur löschen.
 */
function SelectionBar({
  measures,
  valueOf,
  onLink,
  onRemove,
  onClose,
}: {
  measures: readonly PlanMeasure[];
  valueOf: (measure: PlanMeasure) => number | null;
  onLink: (anchor: { left: number; top: number }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const units = new Set(measures.map((measure) => MEASURE_UNIT[measure.kind]));
  const same = units.size === 1;
  const values = measures.map(valueOf);
  const sum =
    same && values.every((value) => value !== null)
      ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
      : null;
  return (
    <div
      role="group"
      aria-label="Gewählte Messungen"
      className="flex shrink-0 flex-wrap items-center gap-[8px] border-t border-line bg-surface px-[12px] py-[8px]"
    >
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
        {measures.length} gewählt
      </span>
      {same ? (
        <span className="font-sans text-[14px] font-semibold text-ink">
          Σ {formatMeasure(sum, measures[0].kind)}
        </span>
      ) : (
        <span className="font-sans text-[12px] text-amber">Verschiedene Arten</span>
      )}
      <span className="flex-1" />
      <button
        type="button"
        disabled={!same}
        title={same ? undefined : 'Nur Messungen gleicher Art verknüpfen'}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onLink({ left: box.left, top: box.top - 8 });
        }}
        className="h-[36px] cursor-pointer rounded-[var(--r-sm)] border border-accent bg-accent-fill px-[12px] font-sans text-[13px] text-white disabled:cursor-default disabled:border-line disabled:bg-sunken disabled:text-mute"
      >
        Mit Position verknüpfen…
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="h-[36px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface px-[12px] font-sans text-[13px] text-ink hover:border-line2"
      >
        Löschen
      </button>
      <button
        type="button"
        aria-label="Auswahl aufheben"
        onClick={onClose}
        className="h-[36px] w-[36px] cursor-pointer rounded-[var(--r-pill)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
