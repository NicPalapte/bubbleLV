// Bubble-Graph — der Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md).
// Gruppen als Kreise, Positionen als Punkte darin, Lose als gestrichelte Hülle;
// Gliederung „nach LV" oder „Matrix" (docs/decisions/0035-graph-gliederung.md),
// die Matrix mit Spalten als Kacheln (docs/decisions/0059-matrix-kacheln.md).
// Die Lage rechnet `layoutMap` (rein, ohne DOM); hier wird gezeichnet,
// verschoben und gezoomt.
//
// Lokal bleibt nur der laufende Ausschnitt (Pan/Zoom): er ändert sich beim
// Ziehen pro Frame und würde als Context-State die ganze Seite neu rendern.
// Beim Abbau wandert er einmal in `view.graph.viewport`.
//
// Über dem Graphen liegen zwei Ebenen in Bildschirmkoordinaten: die
// Hinweisschilder (lib/graph/pins.ts) und die gestrichelte Linie von der
// gewählten Bubble zur Positionskarte. Beide brauchen die Lage der Fenster und
// entstehen deshalb nach dem Zeichnen, nicht im Render.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { GraphControls } from './GraphControls';
import { useHostWindow } from '../common/hostWindow';
import { sidePanelSpace } from '../shell/SidePanel';
import {
  GROUP_GAP,
  GROUP_LOD_PX,
  LABEL_MIN_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  marksVisible,
} from '../../lib/graph/constants';
import {
  commentedIds,
  hasComment,
  IMPORTANT_INFO,
  markedIds,
  PROGRESS_INFO,
  type MarkerInfo,
  type Progress,
} from '../../lib/annotations';
import { cullBounds, isInView } from '../../lib/graph/culling';
import { layoutMap, type MapGroup } from '../../lib/graph/layoutMap';
import { graphOverlayProps, isOverlayEvent } from '../../lib/graph/overlay';
import { placePins, type PinAnchor, type PlacedPin, type Rect } from '../../lib/graph/pins';
import { positionRadii } from '../../lib/graph/sizes';
import { NEUTRAL_COLOR } from '../../lib/colors';
import { formatCount, formatNumber } from '../../lib/format';
import { measure } from '../../lib/perf';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface View {
  tx: number;
  ty: number;
  k: number;
}

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/** Obergrenze beim Einpassen auf eine Auswahl — eine Position bleibt lesbar, nicht riesig. */
const FIT_SELECTION_MAX_ZOOM = 2.5;
/** Unter dieser Breite hat die Linie zur Karte keinen Platz. */
const LEADER_MIN_WIDTH = 760;
/** Fenster und Leisten über dem Graphen — Schilder weichen ihnen aus. */
const OVERLAY_SELECTOR = '.ov-glass, .ov-window, .ov-pill';
const EMPTY_SELECTED: Readonly<Record<string, ReadonlySet<string>>> = {};
/** Dauer des Gleitens beim Wechsel der Gliederung — wie in index.css, plus Einblenden. */
const MORPH_MS = 1000;
/** Ab so vielen Punkten springt der Graph um, statt zu gleiten: sonst ruckelt es. */
const MORPH_MAX = 3000;
/** Punkte fliegen von links nach rechts nacheinander los, über diese Spanne. */
const MORPH_SWEEP_MS = 260;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia !== undefined
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Zeichenbreite der Gruppenbeschriftung in Weltkoordinaten (14px Sans, 10,5px Mono). */
const SANS_CHAR = 8.6;
const MONO_CHAR = 6.4;

/** Platz für die Beschriftung über einem Kreis: so breit wie der Kreis plus Abstand. */
function labelWidth(group: MapGroup): number {
  return 2 * group.r + GROUP_GAP - 12;
}

/**
 * Kürzt eine Beschriftung auf die Breite ihres Kreises. Lange Abschnittsnamen
 * liefen sonst in die Nachbarn; der volle Text steht im Tooltip und in der Karte.
 */
function fitText(text: string, width: number, charWidth: number): string {
  const max = Math.floor(width / charWidth);
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/** Rahmen um eine Gruppe samt Beschriftung darüber; bei einer Kachel die Kachel. */
function groupBox(group: MapGroup): { x0: number; y0: number; x1: number; y1: number } {
  const { cell } = group;
  if (cell !== null) return { x0: cell.x, y0: cell.y, x1: cell.x + cell.w, y1: cell.y + cell.h };
  return {
    x0: group.x - group.r,
    y0: group.y - group.r - 40,
    x1: group.x + group.r,
    y1: group.y + group.r,
  };
}

interface Overlay {
  pins: PlacedPin[];
  leader: { d: string; x: number; y: number } | null;
  key: string;
}

const NO_OVERLAY: Overlay = { pins: [], leader: null, key: '' };

/**
 * Eigene Notizen am Punkt (Entscheidungen 0047, 0053, 0062): Fortschritt als dünner
 * Ring direkt am Punkt (blau = in Bearbeitung, grün = fertig, dazu ✓ unten rechts),
 * „Wichtig" (rotes !) und Kommentar (blaues ✎) als Schilder oben rechts. Der orange
 * Ring etwas weiter außen bleibt den Prüf-Hinweisen.
 */
function NoteBadges({
  x,
  y,
  r,
  progress,
  important,
  commented,
}: {
  x: number;
  y: number;
  r: number;
  progress: Progress | null;
  important: boolean;
  commented: boolean;
}) {
  if (progress === null && !important && !commented) return null;
  // Mitwachsend, aber nie größer als der Punkt selbst wirkt.
  const br = Math.max(2.6, Math.min(6, r * 0.65));
  const top = { y: y - r - br * 0.4, x: x + r * 0.7 };
  const badges: Array<{ key: string; cx: number; cy: number; info: MarkerInfo }> = [];
  if (important) badges.push({ key: 'wichtig', cx: top.x, cy: top.y, info: IMPORTANT_INFO });
  if (commented) {
    const cx = top.x + badges.length * br * 2.1;
    badges.push({ key: 'note', cx, cy: top.y, info: COMMENT_BADGE });
  }
  if (progress === 'fertig') {
    badges.push({ key: 'fertig', cx: x + r * 0.75, cy: y + r * 0.75, info: PROGRESS_INFO.fertig });
  }
  return (
    <g pointerEvents="none">
      {progress !== null && (
        <circle
          data-note={progress}
          cx={x}
          cy={y}
          r={r + 1}
          fill="none"
          stroke={PROGRESS_INFO[progress].fill}
          strokeWidth={Math.max(1.2, Math.min(2.4, r * 0.18))}
        />
      )}
      {badges.map(({ key, cx, cy, info }) => (
        <g key={key} data-note={key === 'fertig' ? undefined : key}>
          <circle cx={cx} cy={cy} r={br} fill={info.fill} stroke="var(--surface)" strokeWidth={1} />
          <text
            x={cx}
            y={cy}
            fill={info.text}
            fontSize={br * 1.3}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {info.glyph}
          </text>
        </g>
      ))}
    </g>
  );
}

const COMMENT_BADGE: MarkerInfo = {
  label: 'Kommentar',
  glyph: '✎',
  fill: 'var(--blue)',
  text: '#fff',
};

/**
 * `cardOverlay`: die Positionskarte schwebt über dem Graphen (Fenster-Layout) —
 * beim Einpassen bleibt rechts ihr Platz frei. Im Splitscreen steht sie daneben.
 */
export function BubbleGraph({ root, cardOverlay = true }: { root: LVNode; cardOverlay?: boolean }) {
  const {
    lv,
    index,
    parents,
    mask,
    matches,
    hints,
    annotations,
    sectionColors,
    filter: {
      hideMode,
      filters: { facets: selectedFacets },
    },
    view: { graph, side, sideWidth, panelSize },
    selectedNode,
    selectedPosition,
    selection: { compare },
  } = useViewer();
  const dispatch = useViewerDispatch();
  // Im eigenen Browserfenster (Entscheidung 0039) kommen Mausereignisse dort an.
  const hostWindow = useHostWindow();
  const { layout, rows, cols, sizeMode, showHints } = graph;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(graph.viewport ?? { tx: 0, ty: 0, k: 0.7 });

  // Ausschnitt beim Abbau sichern — einmal, nicht je Frame.
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => () => dispatch({ type: 'graphViewport', viewport: viewRef.current }), [dispatch]);

  useLayoutEffect(() => {
    const element = wrapRef.current;
    if (element === null) return;
    const measureSize = (): void => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height });
    };
    measureSize();
    const Observer = element.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver;
    const observer = new Observer(measureSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { w, h } = size;

  // ── Layout
  const filtering = matches.filtering;
  const hide = filtering && hideMode === 'hide';
  // „Preis" sagt über eine Datei ohne Einheitspreise nichts — dann gleich groß.
  const priceless = root.totalPrice === 0;
  const effectiveSize = sizeMode === 'cost' && priceless ? 'uniform' : sizeMode;
  const radii = useMemo(() => positionRadii(index, effectiveSize), [index, effectiveSize]);
  // „nach LV" mit gedämpften Nicht-Treffern hängt nicht am Filter: der Graph
  // springt beim Tippen nicht unter der Maus weg.
  const layoutMask = layout === 'matrix' || hide ? mask : null;
  const selected = layout === 'matrix' ? selectedFacets : EMPTY_SELECTED;
  const map = useMemo(
    () =>
      measure('Graph-Layout', () =>
        layoutMap(index, parents, { layout, rows, cols, radii, mask: layoutMask, hide, selected }),
      ),
    [index, parents, layout, rows, cols, radii, layoutMask, hide, selected],
  );

  // Farbe nach Hauptabschnitt, wie in der Verteilung im Überblick (Entscheidung 0043).
  const colors = useMemo(
    () =>
      sectionColors.bySlot.map((color) =>
        // „Ohne Abschnitt" ist auf der Gruppenfläche kaum zu sehen — ein eigener, ruhiger Ton.
        color === NEUTRAL_COLOR ? 'var(--dot-none)' : color.replace('var(--cat-', 'var(--dot-'),
      ),
    [sectionColors],
  );

  const isHit = useCallback((slot: number) => mask === null || mask[slot] === 1, [mask]);
  // Punkte mit eigener Notiz, für die oberste Ebene der Schilder.
  const noteSlots = useMemo(() => {
    const slots: number[] = [];
    for (const id of new Set([...markedIds(annotations), ...commentedIds(annotations)])) {
      const slot = index.slotOf.get(id);
      if (slot !== undefined) slots.push(slot);
    }
    return slots;
  }, [annotations, index]);

  // Regel-ID → Überschrift, für die Schilder.
  const ruleLabels = useMemo(() => {
    const out = new Map<string, string>();
    for (const rule of lv?.check.rules ?? []) out.set(rule.id, rule.label);
    return out;
  }, [lv]);

  /**
   * Positionen mit Hinweis samt Schildtext — einmal je Datei, nicht je Frame:
   * die Schilder werden bei jedem Zoom-/Verschiebeschritt neu platziert.
   */
  const hintSlots = useMemo(() => {
    const out: Array<{ slot: number; id: string; label: string; strong: boolean }> = [];
    for (const [id, found] of hints) {
      const slot = index.slotOf.get(id);
      if (slot === undefined) continue;
      const flag =
        found.flags.find((candidate) => candidate.severity === found.severity) ?? found.flags[0];
      out.push({
        slot,
        id,
        label: `⚠ ${flag.id} · ${ruleLabels.get(flag.id) ?? flag.title}`,
        strong: found.severity === 'beachten',
      });
    }
    return out;
  }, [hints, index, ruleLabels]);

  /** Hinweise je Gruppe, für die Kennzeile über dem Kreis. */
  const hintsByGroup = useMemo(() => {
    const out = new Map<number, number>();
    for (const { slot } of hintSlots) {
      const group = map.groupOf[slot];
      if (group < 0 || !isHit(slot)) continue;
      out.set(group, (out.get(group) ?? 0) + 1);
    }
    return out;
  }, [hintSlots, map, isHit]);

  /**
   * Treffer je Gruppe und je Los — einmal je Layout und Filter, nicht bei jedem
   * Zoom-/Verschiebeschritt. `null` ohne Filter: dann zählt jede Position.
   */
  const hitCounts = useMemo(() => {
    if (mask === null) return null;
    const groups = new Int32Array(map.groups.length);
    for (let slot = 0; slot < map.groupOf.length; slot++) {
      if (map.groupOf[slot] >= 0 && isHit(slot)) groups[map.groupOf[slot]]++;
    }
    const hulls = map.hulls.map((hull) => hull.slots.reduce((n, s) => n + (isHit(s) ? 1 : 0), 0));
    return { groups, hulls };
  }, [map, mask, isHit]);

  const selectedSlot =
    selectedPosition === null ? -1 : (index.slotOf.get(selectedPosition.id) ?? -1);

  // ── Pan
  const drag = useRef({ on: false, x0: 0, y0: 0, tx0: 0, ty0: 0, moved: false });
  const justDragged = useRef(false);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.x0;
      const dy = event.clientY - drag.current.y0;
      if (!drag.current.moved && Math.hypot(dx, dy) > 3) {
        drag.current.moved = true;
        setPanning(true);
      }
      if (drag.current.moved) {
        setView((current) => ({
          ...current,
          tx: drag.current.tx0 + dx,
          ty: drag.current.ty0 + dy,
        }));
      }
    };
    const up = (): void => {
      if (drag.current.on && drag.current.moved) justDragged.current = true;
      drag.current.on = false;
      setPanning(false);
    };
    hostWindow.addEventListener('mousemove', move);
    hostWindow.addEventListener('mouseup', up);
    return () => {
      hostWindow.removeEventListener('mousemove', move);
      hostWindow.removeEventListener('mouseup', up);
    };
  }, [hostWindow]);

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    // Zug in einer Karte oder einem Schild darf den Graphen nicht mitziehen (Issue #47).
    if (isOverlayEvent(event.target)) return;
    // Ein Klick auf eine Bubble (SVG, nicht fokussierbar) holt sonst nie den
    // Tastaturfokus auf den Canvas.
    wrapRef.current?.focus();
    drag.current = {
      on: true,
      x0: event.clientX,
      y0: event.clientY,
      tx0: view.tx,
      ty0: view.ty,
      moved: false,
    };
  };
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (justDragged.current) {
      event.stopPropagation();
      justDragged.current = false;
    }
  };

  // ── Zoom auf Cursorposition
  useEffect(() => {
    const element = wrapRef.current;
    if (element === null) return;
    const onWheel = (event: WheelEvent): void => {
      if (isOverlayEvent(event.target)) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => {
        const k = clampZoom(current.k * factor);
        const ratio = k / current.k;
        return { tx: mx - (mx - current.tx) * ratio, ty: my - (my - current.ty) * ratio, k };
      });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = useCallback(
    (factor: number): void =>
      setView((current) => {
        const k = clampZoom(current.k * factor);
        const ratio = k / current.k;
        return {
          tx: w / 2 - (w / 2 - current.tx) * ratio,
          ty: h / 2 - (h / 2 - current.ty) * ratio,
          k,
        };
      }),
    [w, h],
  );

  // ── Einpassen
  const cardOpen = cardOverlay && (selectedPosition !== null || selectedNode !== null);
  const viewAround = useCallback(
    (box: { x0: number; y0: number; x1: number; y1: number }, maxZoom: number): View | null => {
      if (w === 0 || h === 0) return null;
      // Frei bleibt, was die festen Teile und offenen Fenster belegen: oben die
      // Kennzahlen, unten Legende und Steuerung, links das Seitenfenster, rechts die Karte.
      const wide = w > 900;
      const padL = wide && side !== null ? sidePanelSpace(sideWidth) : 32;
      const padR = wide && cardOpen ? panelSize.width + 32 : 32;
      const padT = 96;
      const padB = 76;
      const availW = Math.max(80, w - padL - padR);
      const availH = Math.max(80, h - padT - padB);
      const boxW = Math.max(1, box.x1 - box.x0);
      const boxH = Math.max(1, box.y1 - box.y0);
      const k = clampZoom(Math.min(maxZoom, availW / boxW, availH / boxH));
      return {
        tx: padL + availW / 2 - ((box.x0 + box.x1) / 2) * k,
        ty: padT + availH / 2 - ((box.y0 + box.y1) / 2) * k,
        k,
      };
    },
    [w, h, side, sideWidth, cardOpen, panelSize.width],
  );

  const fitView = useCallback(() => viewAround(map.bounds, 1.6), [viewAround, map]);
  const fit = useCallback((): void => {
    const next = fitView();
    if (next !== null) setView(next);
  }, [fitView]);

  /** Rahmen um eine Auswahl: Position samt Nachbarschaft, oder ein Abschnitt. */
  const selectionBox = useCallback((): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null => {
    if (selectedSlot >= 0 && Number.isFinite(map.px[selectedSlot])) {
      const x = map.px[selectedSlot];
      const y = map.py[selectedSlot];
      return { x0: x - 60, y0: y - 60, x1: x + 60, y1: y + 60 };
    }
    if (selectedNode !== null) {
      const group = map.groups.find((candidate) => candidate.nodeId === selectedNode.id);
      if (group !== undefined) return groupBox(group);
      const hull = map.hulls.find((candidate) => candidate.id === selectedNode.id);
      if (hull !== undefined) {
        return {
          x0: hull.x - hull.r,
          y0: hull.y - hull.r,
          x1: hull.x + hull.r,
          y1: hull.y + hull.r,
        };
      }
    }
    return null;
  }, [selectedSlot, selectedNode, map]);

  const fitSelection = useCallback((): void => {
    const box = selectionBox();
    const next = box === null ? null : viewAround(box, FIT_SELECTION_MAX_ZOOM);
    if (next !== null) setView(next);
  }, [selectionBox, viewAround]);

  // Einmal je Layout einpassen, sobald die Canvas ihre Größe kennt — im Render
  // statt im Effekt (react.dev/learn/you-might-not-need-an-effect). Ein
  // gemerkter Ausschnitt gilt beim ersten Mal als eingepasst.
  const [fittedMap, setFittedMap] = useState<typeof map | null>(
    graph.viewport !== null ? map : null,
  );
  // Gedämpfte Filterwechsel lassen das Layout stehen; nur eine neue Lage passt neu ein.
  if (fittedMap !== map && w > 0 && h > 0) {
    setFittedMap(map);
    const next = fitView();
    if (next !== null) setView(next);
  }

  // ── Wechsel der Gliederung: Punkte gleiten an den neuen Platz (Entscheidung 0059).
  // Nur bei Gliederung, Zeilen oder Spalten — ein Filterwechsel springt wie bisher.
  const arrangement = `${layout}|${rows}|${cols ?? ''}`;
  const [shownArrangement, setShownArrangement] = useState(arrangement);
  const [morph, setMorph] = useState<{ lo: number; span: number } | null>(null);
  if (shownArrangement !== arrangement) {
    setShownArrangement(arrangement);
    let placed = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let slot = 0; slot < map.px.length; slot++) {
      const x = map.px[slot];
      if (!Number.isFinite(x)) continue;
      placed++;
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    setMorph(
      placed > 0 && placed <= MORPH_MAX && !prefersReducedMotion()
        ? { lo, span: Math.max(1, hi - lo) }
        : null,
    );
  }
  useEffect(() => {
    if (morph === null) return;
    const timer = window.setTimeout(() => setMorph(null), MORPH_MS + MORPH_SWEEP_MS);
    return () => window.clearTimeout(timer);
  }, [morph]);
  const morphing = morph !== null;

  // ── Culling und Detailstufe
  const cull = useMemo(
    () => cullBounds({ tx: view.tx, ty: view.ty, k: view.k, width: w, height: h }),
    [view, w, h],
  );
  // Während des Gleitens keine Schilder: sie stünden schon am Ziel, die Punkte noch nicht.
  const rings = showHints && marksVisible(view.k);
  const marks = rings && !morphing;

  const visibleGroups = useMemo(
    () =>
      map.groups
        .map((group, i) => ({ group, i }))
        .filter(({ group }) => isInView(cull, group.x, group.y, group.r + 40)),
    [map, cull],
  );

  /** Gruppen, die so klein sind, dass ihre Punkte als Fläche gezeichnet werden. */
  const isCoarse = useCallback(
    (group: MapGroup) => !morphing && group.slots.length > 8 && group.r * view.k < GROUP_LOD_PX,
    [view.k, morphing],
  );

  // ── Klicks: ein Handler am Weltknoten statt einer Funktion je Punkt.
  const selectSlot = useCallback(
    (slot: number): void => {
      const node = index.nodes[slot];
      const parent = parents.get(node.id) ?? null;
      dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId: node.id });
    },
    [index, parents, dispatch],
  );

  const activateGroup = useCallback(
    (group: MapGroup): void => {
      if (group.nodeId !== null) dispatch({ type: 'selectNode', id: group.nodeId });
      else {
        const next = viewAround(groupBox(group), FIT_SELECTION_MAX_ZOOM);
        if (next !== null) setView(next);
      }
    },
    [dispatch, viewAround],
  );

  const onWorldClick = (event: ReactMouseEvent<SVGGElement>): void => {
    const target = (event.target as Element).closest('[data-slot],[data-group]');
    if (target === null) return;
    const slot = target.getAttribute('data-slot');
    if (slot !== null) {
      // Shift + Klick legt die Position in den Vergleich, statt sie zu wählen.
      if (event.shiftKey) {
        dispatch({ type: 'toggleCompare', positionId: index.nodes[Number(slot)].id });
      } else {
        selectSlot(Number(slot));
      }
      return;
    }
    const group = map.groups[Number(target.getAttribute('data-group'))];
    if (group !== undefined) activateGroup(group);
  };

  const onWorldDoubleClick = (event: ReactMouseEvent<SVGGElement>): void => {
    const target = (event.target as Element).closest('[data-group]');
    const group =
      target === null ? undefined : map.groups[Number(target.getAttribute('data-group'))];
    if (group === undefined) return;
    const next = viewAround(groupBox(group), FIT_SELECTION_MAX_ZOOM);
    if (next !== null) setView(next);
  };

  // ── Hover: Kurztext als HTML-Tooltip (SVG-Text bricht nicht um).
  const [hoverSlot, setHoverSlot] = useState(-1);
  // Kachel unter der Maus — auch über einem ihrer Punkte, sonst flackert die Hervorhebung.
  // Gemerkt samt Layout: nach einem Umbau zeigte der Index sonst auf eine andere Gruppe.
  const [hover, setHover] = useState<{ map: typeof map; group: number } | null>(null);
  const hoverGroup = hover !== null && hover.map === map ? hover.group : -1;
  const setHoverGroup = (group: number): void => setHover(group < 0 ? null : { map, group });
  const onWorldOver = (event: ReactMouseEvent<SVGGElement>): void => {
    const target = (event.target as Element).closest('[data-slot],[data-group]');
    const slot = target?.getAttribute('data-slot') ?? null;
    const group = target?.getAttribute('data-group') ?? null;
    setHoverSlot(slot === null ? -1 : Number(slot));
    setHoverGroup(
      slot !== null ? (map.groupOf[Number(slot)] ?? -1) : group === null ? -1 : Number(group),
    );
  };
  const onWorldLeave = (): void => {
    setHoverSlot(-1);
    setHoverGroup(-1);
  };

  // ── Tastatur: ein Tab-Stopp am Canvas; Pfeile wandern durch Positionen und Gruppen.
  const order = useMemo(
    () => map.groups.map((group) => [...group.slots].sort((a, b) => a - b)),
    [map],
  );
  const [focusSlot, setFocusSlot] = useState(-1);
  const [graphFocused, setGraphFocused] = useState(false);

  const centerOn = useCallback(
    (slot: number): void => {
      const x = map.px[slot];
      const y = map.py[slot];
      if (!Number.isFinite(x)) return;
      setView((current) => {
        const sx = x * current.k + current.tx;
        const sy = y * current.k + current.ty;
        if (sx > 40 && sy > 40 && sx < w - 40 && sy < h - 40) return current;
        return { ...current, tx: w / 2 - x * current.k, ty: h / 2 - y * current.k };
      });
    },
    [map, w, h],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (order.length === 0) return;
    // Tippen im Kommentarfeld der Karte (sie liegt im Graphen) ist keine Navigation.
    const target = event.target;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return;
    const current = focusSlot >= 0 ? focusSlot : (order[0]?.[0] ?? -1);
    const g = current >= 0 ? map.groupOf[current] : 0;
    const inGroup = order[g] ?? [];
    const at = inGroup.indexOf(current);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = focusSlot < 0 ? current : (inGroup[at + 1] ?? order[g + 1]?.[0] ?? -1);
        break;
      case 'ArrowLeft':
        next = inGroup[at - 1] ?? order[g - 1]?.[order[g - 1].length - 1] ?? -1;
        break;
      case 'ArrowDown':
        next = order[g + 1]?.[0] ?? -1;
        break;
      case 'ArrowUp':
        next = order[g - 1]?.[0] ?? -1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (current >= 0) selectSlot(current);
        return;
      case 'f':
      case 'F':
        event.preventDefault();
        fitSelection();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next < 0) return;
    setFocusSlot(next);
    centerOn(next);
  };

  const focusedLabel =
    focusSlot >= 0 && focusSlot < index.size
      ? `${index.positions[focusSlot].oz} ${index.positions[focusSlot].shortText}`
      : '';

  // ── Schilder und Linie zur Karte: nach dem Zeichnen, mit der Lage der Fenster.
  // Bewusst ohne Abhängigkeitsliste: Fenster wandern, ohne dass sich hier ein Wert
  // ändert. Die Schleife bricht über `key` ab — gleiche Lage, kein neuer Zustand.
  const [overlay, setOverlay] = useState<Overlay>(NO_OVERLAY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (wrap === null || w === 0) return;
    const base = wrap.getBoundingClientRect();
    const scope = wrap.parentElement ?? wrap;
    const blocked: Rect[] = [];
    for (const element of scope.querySelectorAll(OVERLAY_SELECTOR)) {
      const r = element.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      blocked.push({
        x: r.left - base.left - 6,
        y: r.top - base.top - 6,
        w: r.width + 12,
        h: r.height + 12,
      });
    }
    // Gruppenbeschriftungen bleiben lesbar: Schilder legen sich nicht darüber.
    if (14 * view.k >= LABEL_MIN_PX) {
      for (const { group } of visibleGroups) {
        // Kacheln tragen ihre Angaben in sich, nicht darüber.
        if (group.cell !== null) continue;
        const text = Math.max(
          group.title.length * SANS_CHAR,
          group.context.length * MONO_CHAR,
          120,
        );
        const width = Math.min(text, labelWidth(group)) * view.k;
        const top = group.context === '' ? 36 : 52;
        blocked.push({
          x: group.x * view.k + view.tx - width / 2,
          y: (group.y - group.r - top) * view.k + view.ty,
          w: width,
          h: (top - 2) * view.k,
        });
      }
    }

    // Achsen der Matrix ebenso: ein Schild über „psch" macht die Zeile unlesbar.
    if (map.axes !== null) {
      const { axes } = map;
      const toScreen = (x: number, y: number, width: number): Rect => ({
        x: x * view.k + view.tx,
        y: (y - 16) * view.k + view.ty,
        w: width * view.k,
        h: 22 * view.k,
      });
      for (const row of axes.rows) {
        const width = row.label.length * SANS_CHAR;
        blocked.push(toScreen(axes.x0 - 10 - width, row.y + 5, width));
      }
      for (const col of axes.cols) {
        const width = col.label.length * SANS_CHAR;
        blocked.push(toScreen(col.x - width / 2, axes.y0 - 8, width));
      }
    }

    let pins: PlacedPin[] = [];
    if (marks) {
      const anchors: PinAnchor[] = [];
      for (const { slot, id, label, strong } of hintSlots) {
        if (!isHit(slot) || !Number.isFinite(map.px[slot])) continue;
        // Außerhalb des Bildes gibt es kein Schild — vor dem Objektbau aussortieren.
        const sx = map.px[slot] * view.k + view.tx;
        const sy = map.py[slot] * view.k + view.ty;
        if (sx <= 0 || sy <= 0 || sx >= w || sy >= h) continue;
        const group = map.groups[map.groupOf[slot]];
        if (group === undefined || isCoarse(group)) continue;
        anchors.push({ id, sx, sy, rr: (radii[slot] + 3) * view.k, label, strong });
      }
      pins = placePins(anchors, { width: w, height: h }, blocked);
    }

    let leader: Overlay['leader'] = null;
    const card = wrap.querySelector('[data-selection-card]');
    if (
      card !== null &&
      !morphing &&
      selectedSlot >= 0 &&
      w >= LEADER_MIN_WIDTH &&
      Number.isFinite(map.px[selectedSlot])
    ) {
      const c = card.getBoundingClientRect();
      const px = map.px[selectedSlot] * view.k + view.tx;
      const py = map.py[selectedSlot] * view.k + view.ty;
      const tx = c.left - base.left;
      const ty = Math.min(Math.max(py, c.top - base.top + 30), c.bottom - base.top - 30);
      const startX = px + (radii[selectedSlot] + 11) * view.k;
      if (startX < tx - 10 && (isHit(selectedSlot) || !hide)) {
        const mx = (startX + tx) / 2;
        leader = { d: `M${startX},${py} C${mx},${py} ${mx},${ty} ${tx},${ty}`, x: tx, y: ty };
      }
    }

    const key =
      pins
        .map((pin) => `${pin.anchor.id}@${Math.round(pin.box.x)},${Math.round(pin.box.y)}`)
        .join(';') + `|${leader?.d ?? ''}`;
    setOverlay((current) => (current.key === key ? current : { pins, leader, key }));
  });

  // ── Zeichnen
  const k = view.k;
  const labelFits = 14 * k >= LABEL_MIN_PX;
  const dimLv = layout === 'lv' && filtering && !hide;

  const tooltipSlot = hoverSlot >= 0 ? hoverSlot : graphFocused ? focusSlot : -1;

  // Kacheln: Farbstufe 1–5 nach Anzahl, bezogen auf die vollste Kachel.
  const grid = map.axes?.grid ?? null;
  // „übrige" (gedämpfte Nicht-Treffer) zählt nicht mit, sonst wären alle Kacheln blass.
  const maxInCell = useMemo(
    () => map.groups.reduce((m, g) => (g.cell === null ? m : Math.max(m, g.slots.length)), 1),
    [map],
  );
  // Nur Zeilen und Spalten im Bild — Zeilen × Spalten einzeln zu prüfen, kostete je Frame.
  const gridRows =
    grid === null
      ? []
      : grid.rowY.flatMap((y, i) => (y + grid.rowH[i] >= cull.y0 && y <= cull.y1 ? [i] : []));
  const gridCols =
    grid === null
      ? []
      : grid.colX.flatMap((x, j) => (x + grid.colW[j] >= cull.x0 && x <= cull.x1 ? [j] : []));
  const hotCell = map.groups[hoverGroup]?.cell ?? null;
  const pickedGroup = selectedSlot >= 0 ? map.groupOf[selectedSlot] : -1;
  // Punkte: beim Gleiten alle, sonst nur die im Bild.
  const dotGroups = morphing ? map.groups.map((group, i) => ({ group, i })) : visibleGroups;

  return (
    <div
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
      onFocus={() => setGraphFocused(true)}
      onBlur={() => setGraphFocused(false)}
      tabIndex={0}
      role="group"
      aria-label="Bubble-Graph — Pfeiltasten wandern durch die Positionen, Enter öffnet die Karte"
      className="absolute inset-0 select-none overflow-hidden outline-none"
      style={{ cursor: panning ? 'grabbing' : 'grab' }}
    >
      <div aria-live="polite" className="sr-only">
        {graphFocused ? focusedLabel : ''}
      </div>
      <svg
        width={w}
        height={h}
        className={`absolute inset-0 block${morphing ? ' graph-morph' : ''}`}
      >
        <defs>
          {/* 14px-Punktraster hinter dem Graphen — Vorgabe des Design-Systems. */}
          <pattern id="bubble-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--grid2)" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#bubble-grid)" />

        <g
          className="graph-world"
          style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${k})` }}
          onClick={onWorldClick}
          onDoubleClick={onWorldDoubleClick}
          onMouseOver={onWorldOver}
          onMouseLeave={onWorldLeave}
        >
          {/* Schlüssel = Gliederung: bei jedem Wechsel startet das Einblenden neu. */}
          <g key={arrangement} className="graph-frame">
            {map.hulls.map((hull, h) => {
              const hits = hitCounts?.hulls[h] ?? hull.slots.length;
              const width = hull.title.length * 9.4 + 28;
              return (
                <g key={hull.id} data-hull={hull.id} opacity={dimLv && hits === 0 ? 0.4 : 1}>
                  <circle
                    cx={hull.x}
                    cy={hull.y}
                    r={hull.r}
                    fill="var(--los-fill)"
                    stroke="var(--line2)"
                    strokeWidth={1.5 / Math.max(k, 0.3)}
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                  />
                  <rect
                    x={hull.x - width / 2}
                    y={hull.y - hull.r - 15}
                    width={width}
                    height={30}
                    rx={15}
                    fill="var(--surface)"
                    stroke="var(--line2)"
                  />
                  <text
                    x={hull.x}
                    y={hull.y - hull.r + 5}
                    textAnchor="middle"
                    fontFamily="var(--sans)"
                    fontSize={15}
                    fontWeight={700}
                    fill="var(--ink)"
                  >
                    {hull.title}
                  </text>
                </g>
              );
            })}

            {map.axes !== null && (
              <g aria-label="Achsen">
                <text x={map.axes.cols[0]?.x ?? 0} y={map.axes.y0 - 34} className="graph-axis-key">
                  {`${map.axes.colKey} →`}
                </text>
                {map.axes.cols.map((col, j) => (
                  <text
                    key={`c${col.x}`}
                    x={col.x}
                    y={map.axes!.y0 - 8}
                    textAnchor="middle"
                    className={hotCell?.col === j ? 'graph-axis is-on' : 'graph-axis'}
                  >
                    {col.label}
                  </text>
                ))}
                <text
                  x={map.axes.x0 - 10}
                  y={map.axes.y0 - 34}
                  textAnchor="end"
                  className="graph-axis-key"
                >
                  {`${map.axes.rowKey} ↓`}
                </text>
                {map.axes.rows.map((row, i) => (
                  <text
                    key={`r${row.y}`}
                    x={map.axes!.x0 - 10}
                    y={row.y + 5}
                    textAnchor="end"
                    className={hotCell?.row === i ? 'graph-axis is-on' : 'graph-axis'}
                  >
                    {row.label}
                  </text>
                ))}
              </g>
            )}

            {/* Raster der Matrix: jede Zelle als blasse Kachel, auch ohne Positionen. */}
            {gridRows.flatMap((i) =>
              gridCols.map((j) => (
                <rect
                  key={`t${i}-${j}`}
                  x={grid!.colX[j]}
                  y={grid!.rowY[i]}
                  width={grid!.colW[j]}
                  height={grid!.rowH[i]}
                  rx={10}
                  className="graph-tile is-empty"
                />
              )),
            )}

            {visibleGroups.map(({ group, i }) => {
              const n = group.slots.length;
              const { cell } = group;
              if (cell !== null) {
                const nh = showHints ? (hintsByGroup.get(i) ?? 0) : 0;
                const count = formatCount(n);
                const sumFits = (group.sum.length + count.length + 6) * MONO_CHAR < cell.w;
                const classes = [
                  'graph-tile',
                  n === 0 ? 'is-empty' : '',
                  i === hoverGroup && n > 0 ? 'is-hot' : '',
                  i === pickedGroup ? 'is-picked' : '',
                ].join(' ');
                return (
                  <g key={group.key} data-group={i} style={{ cursor: 'pointer' }}>
                    <rect
                      x={cell.x}
                      y={cell.y}
                      width={cell.w}
                      height={cell.h}
                      rx={10}
                      className={classes}
                      fill={
                        n === 0
                          ? undefined
                          : `var(--heat-${Math.max(1, Math.ceil((5 * n) / maxInCell))})`
                      }
                    />
                    {labelFits && n > 0 && (
                      <>
                        <text
                          x={cell.x + cell.w - 10}
                          y={cell.y + 17}
                          textAnchor="end"
                          className="graph-tile-count"
                        >
                          {nh > 0 && <tspan fill="var(--amber)">{`${formatCount(nh)} ⚠  `}</tspan>}
                          {count}
                        </text>
                        {group.sum !== '' && sumFits && (
                          <text x={cell.x + 10} y={cell.y + 17} className="graph-tile-sum">
                            {group.sum}
                          </text>
                        )}
                      </>
                    )}
                    <title>
                      {[
                        map.axes?.rows[cell.row]?.label,
                        map.axes?.cols[cell.col]?.label,
                        `${count} Pos${group.sum === '' ? '' : ` · ${group.sum}`}`,
                      ]
                        .filter((line) => line !== undefined && line !== '')
                        .join('\n')}
                    </title>
                  </g>
                );
              }
              const hits = layout === 'lv' ? (hitCounts?.groups[i] ?? n) : n;
              const nh = hintsByGroup.get(i) ?? 0;
              const meta =
                (dimLv ? `${formatCount(hits)} / ${formatCount(n)}` : formatCount(n)) +
                ' Pos' +
                (group.sum === '' ? '' : ` · ${group.sum}`) +
                (nh > 0 && showHints ? ` · ${formatCount(nh)} ⚠` : '');
              const coarse = isCoarse(group);
              const chosen =
                selectedPosition === null &&
                selectedNode !== null &&
                group.nodeId === selectedNode.id;
              return (
                <g
                  key={group.key}
                  data-group={i}
                  opacity={group.rest ? 0.55 : dimLv && hits === 0 ? 0.35 : 1}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={group.x}
                    cy={group.y}
                    r={group.r}
                    fill={n === 0 ? 'none' : coarse ? 'var(--grp-fill-strong)' : 'var(--grp-fill)'}
                    stroke={chosen ? 'var(--blue)' : 'var(--line2)'}
                    strokeWidth={(chosen ? 2.5 : 1.2) / Math.max(k, 0.3)}
                    strokeDasharray={n === 0 || group.rest ? '4 4' : undefined}
                  />
                  {labelFits && (
                    <>
                      {group.context !== '' && (
                        <text
                          x={group.x}
                          y={group.y - group.r - 38}
                          textAnchor="middle"
                          className="graph-group-context"
                        >
                          {fitText(group.context, labelWidth(group), MONO_CHAR)}
                        </text>
                      )}
                      {group.title !== '' && (
                        <text
                          x={group.x}
                          y={group.y - group.r - 22}
                          textAnchor="middle"
                          className="graph-group-title"
                        >
                          {fitText(group.title, labelWidth(group), SANS_CHAR)}
                        </text>
                      )}
                      <text
                        x={group.x}
                        y={group.y - group.r - 8}
                        textAnchor="middle"
                        className="graph-group-meta"
                      >
                        {fitText(meta, labelWidth(group), MONO_CHAR)}
                      </text>
                    </>
                  )}
                  <title>
                    {[group.context, group.title, meta].filter((line) => line !== '').join('\n')}
                  </title>
                </g>
              );
            })}
          </g>

          {/* Eine flache Liste, Schlüssel = Position: so bleibt jeder Punkt beim Wechsel
              der Gliederung dasselbe Element und kann an den neuen Platz gleiten. Die Lage
              steht im transform, die Formen darin um (0, 0). */}
          {dotGroups.flatMap(({ group }) =>
            isCoarse(group)
              ? []
              : group.slots.map((slot) => {
                  const wx = map.px[slot];
                  const wy = map.py[slot];
                  const r = radii[slot];
                  if (!morphing && !isInView(cull, wx, wy, r + 12)) return null;
                  const hit = isHit(slot);
                  if (!hit && hide) return null;
                  const position = index.positions[slot];
                  const fill = colors[slot];
                  const hint = rings ? hints.get(index.nodes[slot].id)?.severity : undefined;
                  const type = position.positionType;
                  const delay =
                    morph === null
                      ? undefined
                      : `${Math.round(((wx - morph.lo) / morph.span) * MORPH_SWEEP_MS)}ms`;
                  return (
                    <g
                      key={slot}
                      data-slot={slot}
                      data-tier="position"
                      className="graph-dot"
                      opacity={hit ? 1 : 0.22}
                      style={{
                        cursor: 'pointer',
                        transform: `translate(${wx}px, ${wy}px)`,
                        transitionDelay: delay,
                      }}
                    >
                      {hint !== undefined && (
                        <circle
                          data-hint={hint}
                          cx={0}
                          cy={0}
                          r={r + 3}
                          fill="none"
                          stroke={hint === 'beachten' ? 'var(--amber)' : 'var(--mute)'}
                          strokeWidth={1.8}
                          strokeDasharray={hint === 'beachten' ? undefined : '3 2'}
                        />
                      )}
                      {type === 'BEDARF' ? (
                        <circle
                          cx={0}
                          cy={0}
                          r={Math.max(r - 1, 2)}
                          fill="var(--surface)"
                          stroke={fill}
                          strokeWidth={2}
                        />
                      ) : type === 'ALTERNATIV' ? (
                        <rect
                          x={-r * 0.8}
                          y={-r * 0.8}
                          width={r * 1.6}
                          height={r * 1.6}
                          fill={fill}
                          stroke="var(--dot-line)"
                          strokeWidth={0.6}
                          transform="rotate(45)"
                        />
                      ) : (
                        <circle
                          cx={0}
                          cy={0}
                          r={r}
                          fill={fill}
                          stroke="var(--dot-line)"
                          strokeWidth={0.6}
                        />
                      )}
                      {type === 'ZULAGENPOSITION' && (
                        <circle cx={0} cy={0} r={1.6} fill="var(--surface)" />
                      )}
                      {slot === selectedSlot && (
                        <>
                          <circle
                            cx={0}
                            cy={0}
                            r={r + 6}
                            fill="none"
                            stroke="var(--blue)"
                            strokeWidth={2.5}
                          />
                          <circle
                            cx={0}
                            cy={0}
                            r={r + 11}
                            fill="none"
                            stroke="var(--blue)"
                            strokeWidth={1}
                            opacity={0.35}
                          />
                        </>
                      )}
                      {graphFocused && slot === focusSlot && (
                        <circle
                          cx={0}
                          cy={0}
                          r={r + 4}
                          fill="none"
                          stroke="var(--ink)"
                          strokeWidth={1.5}
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  );
                }),
          )}

          {/* Eigene Notizen in einer eigenen Ebene über allen Punkten: in einer
              dichten Gruppe verdeckte sonst der nächste Punkt das Schild. Nur über
              die Positionen mit Notiz, nicht über alle. */}
          {!morphing &&
            noteSlots.map((slot) => {
              const x = map.px[slot];
              const y = map.py[slot];
              const r = radii[slot];
              if (!Number.isFinite(x) || !isInView(cull, x, y, r + 12)) return null;
              const group = map.groups[map.groupOf[slot]];
              if (group === undefined || isCoarse(group)) return null;
              const hit = isHit(slot);
              if (!hit && hide) return null;
              const id = index.nodes[slot].id;
              return (
                <g key={id} opacity={hit ? 1 : 0.22}>
                  <NoteBadges
                    x={x}
                    y={y}
                    r={r}
                    progress={annotations.progress.get(id) ?? null}
                    important={annotations.important.has(id)}
                    commented={hasComment(annotations, id)}
                  />
                </g>
              );
            })}

          {/* Nummer der Spalte im Vergleich, bildschirmfest neben dem Punkt. */}
          {!morphing &&
            compare.map((id, i) => {
              const slot = index.slotOf.get(id);
              if (slot === undefined || !Number.isFinite(map.px[slot])) return null;
              const group = map.groups[map.groupOf[slot]];
              if (group === undefined || isCoarse(group)) return null;
              const badge = 7 / k;
              const cx = map.px[slot] + radii[slot] + badge * 0.6;
              const cy = map.py[slot] - radii[slot] - badge * 0.6;
              return (
                <g key={id} data-compare={i + 1} pointerEvents="none">
                  <circle cx={cx} cy={cy} r={badge} fill="var(--blue)" />
                  <text
                    x={cx}
                    y={cy + 3.2 / k}
                    textAnchor="middle"
                    fontSize={9 / k}
                    fontFamily="var(--mono)"
                    fill="#fff"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>

      {overlay.leader !== null && (
        <svg
          width={w}
          height={h}
          className="pointer-events-none absolute inset-0 z-[9]"
          aria-hidden="true"
        >
          <path
            d={overlay.leader.d}
            fill="none"
            stroke="var(--blue)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <circle cx={overlay.leader.x} cy={overlay.leader.y} r={3.5} fill="var(--blue)" />
        </svg>
      )}

      {overlay.pins.length > 0 && (
        <svg
          width={w}
          height={h}
          className="pointer-events-none absolute inset-0 z-[7]"
          aria-label="Hinweise im Graphen"
        >
          {overlay.pins.map((pin) => {
            const strong = pin.anchor.strong;
            const slot = index.slotOf.get(pin.anchor.id) ?? -1;
            return (
              <g
                key={pin.anchor.id}
                {...graphOverlayProps}
                data-pin={pin.anchor.id}
                className="pointer-events-auto cursor-pointer"
                onClick={() => {
                  if (slot >= 0) selectSlot(slot);
                }}
              >
                <line
                  {...pin.line}
                  stroke={strong ? 'var(--amber)' : 'var(--mute)'}
                  strokeWidth={1}
                />
                <rect
                  x={pin.box.x}
                  y={pin.box.y}
                  width={pin.box.w}
                  height={pin.box.h}
                  rx={11}
                  fill={strong ? 'var(--amberS)' : 'var(--surface)'}
                  stroke={strong ? 'var(--amber)' : 'var(--line2)'}
                />
                <text
                  x={pin.box.x + 9}
                  y={pin.box.y + 15}
                  fontFamily="var(--mono)"
                  fontSize={10}
                  fill={strong ? 'var(--amberD)' : 'var(--dim)'}
                >
                  {pin.anchor.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {tooltipSlot >= 0 && Number.isFinite(map.px[tooltipSlot]) && (
        <div
          className="pointer-events-none absolute z-[11] max-w-[260px] rounded-[var(--r-sm)] bg-ink px-[8px] py-[6px] font-mono text-[10px] leading-[1.4] text-white"
          style={{
            left: Math.min(
              Math.max(0, view.tx + map.px[tooltipSlot] * k + radii[tooltipSlot] * k + 10),
              Math.max(0, w - 268),
            ),
            top: Math.min(Math.max(0, view.ty + map.py[tooltipSlot] * k - 14), Math.max(0, h - 40)),
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            boxShadow: 'var(--shadow-popover)',
          }}
        >
          {index.positions[tooltipSlot].oz} · {index.positions[tooltipSlot].shortText}
          {index.positions[tooltipSlot].quantity !== null && (
            <span className="text-white/70">
              {' · '}
              {formatNumber(index.positions[tooltipSlot].quantity)}{' '}
              {index.positions[tooltipSlot].unit ?? ''}
            </span>
          )}
        </div>
      )}

      <GraphControls
        onFit={fit}
        onFitSelection={selectedSlot >= 0 || selectedNode !== null ? fitSelection : undefined}
        onZoom={zoomBy}
      />
    </div>
  );
}
