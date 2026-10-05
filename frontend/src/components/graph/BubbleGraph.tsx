// Bubble-Graph — der Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md).
// Gruppen als Kreise, Positionen als Punkte darin, Lose als gestrichelte Hülle;
// Gliederung „nach LV" oder „frei" (docs/decisions/0035-graph-gliederung.md).
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
import { SIDE_PANEL_SPACE } from '../shell/SidePanel';
import { SelectionCard } from './SelectionCard';
import {
  GROUP_GAP,
  GROUP_LOD_PX,
  LABEL_MIN_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  marksVisible,
} from '../../lib/graph/constants';
import { cullBounds, isInView } from '../../lib/graph/culling';
import { layoutMap, type MapGroup } from '../../lib/graph/layoutMap';
import { graphOverlayProps, isOverlayEvent } from '../../lib/graph/overlay';
import { placePins, type PinAnchor, type PlacedPin, type Rect } from '../../lib/graph/pins';
import { positionRadii } from '../../lib/graph/sizes';
import { NEUTRAL_COLOR } from '../../lib/colors';
import { FACETS } from '../../lib/facets';
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
const GEWERK_SLOT = FACETS.findIndex((facet) => facet.id === 'gewerk');

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

/** Rahmen um eine Gruppe samt Beschriftung darüber. */
function groupBox(group: MapGroup): { x0: number; y0: number; x1: number; y1: number } {
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

export function BubbleGraph({ root }: { root: LVNode }) {
  const {
    lv,
    index,
    parents,
    mask,
    matches,
    hints,
    gewerkColors,
    filter: {
      hideMode,
      filters: { facets: selectedFacets },
    },
    view: { graph, side, panelSize },
    selectedNode,
    selectedPosition,
  } = useViewer();
  const dispatch = useViewerDispatch();
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
    const observer = new ResizeObserver(measureSize);
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
  const layoutMask = layout === 'frei' || hide ? mask : null;
  const selected = layout === 'frei' ? selectedFacets : EMPTY_SELECTED;
  const map = useMemo(
    () =>
      measure('Graph-Layout', () =>
        layoutMap(index, parents, { layout, rows, cols, radii, mask: layoutMask, hide, selected }),
      ),
    [index, parents, layout, rows, cols, radii, layoutMask, hide, selected],
  );

  const colors = useMemo(() => {
    const out = new Array<string>(index.size);
    for (let slot = 0; slot < index.size; slot++) {
      const color = gewerkColors.of(index.facts[slot].facetValues[GEWERK_SLOT]?.[0]);
      // „Ohne Gewerk" ist auf der Gruppenfläche kaum zu sehen — ein eigener, ruhiger Ton.
      out[slot] =
        color === NEUTRAL_COLOR ? 'var(--dot-none)' : color.replace('var(--cat-', 'var(--dot-');
    }
    return out;
  }, [index, gewerkColors]);

  const isHit = useCallback((slot: number) => mask === null || mask[slot] === 1, [mask]);

  // Regel-ID → Überschrift, für die Schilder.
  const ruleLabels = useMemo(() => {
    const out = new Map<string, string>();
    for (const rule of lv?.check.rules ?? []) out.set(rule.id, rule.label);
    return out;
  }, [lv]);

  /** Positionen mit Hinweis, als Indexeinträge. */
  const hintSlots = useMemo(() => {
    const out: number[] = [];
    for (const id of hints.keys()) {
      const slot = index.slotOf.get(id);
      if (slot !== undefined) out.push(slot);
    }
    return out;
  }, [hints, index]);

  /** Hinweise je Gruppe, für die Kennzeile über dem Kreis. */
  const hintsByGroup = useMemo(() => {
    const out = new Map<number, number>();
    for (const slot of hintSlots) {
      const group = map.groupOf[slot];
      if (group < 0 || !isHit(slot)) continue;
      out.set(group, (out.get(group) ?? 0) + 1);
    }
    return out;
  }, [hintSlots, map, isHit]);

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
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

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
  const cardOpen = selectedPosition !== null || selectedNode !== null;
  const viewAround = useCallback(
    (box: { x0: number; y0: number; x1: number; y1: number }, maxZoom: number): View | null => {
      if (w === 0 || h === 0) return null;
      // Frei bleibt, was die festen Teile und offenen Fenster belegen: oben die
      // Kennzahlen, unten Legende und Steuerung, links das Seitenfenster, rechts die Karte.
      const wide = w > 900;
      const padL = wide && side !== null ? SIDE_PANEL_SPACE : 32;
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
    [w, h, side, cardOpen, panelSize.width],
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

  // ── Culling und Detailstufe
  const cull = useMemo(
    () => cullBounds({ tx: view.tx, ty: view.ty, k: view.k, width: w, height: h }),
    [view, w, h],
  );
  const marks = showHints && marksVisible(view.k);

  const visibleGroups = useMemo(
    () =>
      map.groups
        .map((group, i) => ({ group, i }))
        .filter(({ group }) => isInView(cull, group.x, group.y, group.r + 40)),
    [map, cull],
  );

  /** Gruppen, die so klein sind, dass ihre Punkte als Fläche gezeichnet werden. */
  const isCoarse = useCallback(
    (group: MapGroup) => group.slots.length > 8 && group.r * view.k < GROUP_LOD_PX,
    [view.k],
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
      selectSlot(Number(slot));
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
  const onWorldOver = (event: ReactMouseEvent<SVGGElement>): void => {
    const target = (event.target as Element).closest('[data-slot]');
    setHoverSlot(target === null ? -1 : Number(target.getAttribute('data-slot')));
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

    let pins: PlacedPin[] = [];
    if (marks) {
      const anchors: PinAnchor[] = [];
      for (const slot of hintSlots) {
        if (!isHit(slot) || !Number.isFinite(map.px[slot])) continue;
        const group = map.groups[map.groupOf[slot]];
        if (group === undefined || isCoarse(group)) continue;
        const id = index.nodes[slot].id;
        const found = hints.get(id);
        if (found === undefined) continue;
        const flag =
          found.flags.find((candidate) => candidate.severity === found.severity) ?? found.flags[0];
        anchors.push({
          id,
          sx: map.px[slot] * view.k + view.tx,
          sy: map.py[slot] * view.k + view.ty,
          rr: (radii[slot] + 3) * view.k,
          label: `⚠ ${flag.id} · ${ruleLabels.get(flag.id) ?? flag.title}`,
          strong: found.severity === 'beachten',
        });
      }
      pins = placePins(anchors, { width: w, height: h }, blocked);
    }

    let leader: Overlay['leader'] = null;
    const card = wrap.querySelector('[data-selection-card]');
    if (
      card !== null &&
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
  const cardNode = selectedPosition ?? selectedNode;

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
      <svg width={w} height={h} className="absolute inset-0 block">
        <defs>
          {/* 14px-Punktraster hinter dem Graphen — Vorgabe des Design-Systems. */}
          <pattern id="bubble-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--grid2)" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#bubble-grid)" />

        <g
          transform={`translate(${view.tx},${view.ty}) scale(${k})`}
          onClick={onWorldClick}
          onDoubleClick={onWorldDoubleClick}
          onMouseOver={onWorldOver}
          onMouseLeave={() => setHoverSlot(-1)}
        >
          {map.hulls.map((hull) => {
            const hits = filtering ? hull.slots.filter(isHit).length : hull.slots.length;
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
              {map.axes.cols.map((col) => (
                <text
                  key={`c${col.x}`}
                  x={col.x}
                  y={map.axes!.y0 - 8}
                  textAnchor="middle"
                  className="graph-axis"
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
              {map.axes.rows.map((row) => (
                <text
                  key={`r${row.y}`}
                  x={map.axes!.x0 - 10}
                  y={row.y + 5}
                  textAnchor="end"
                  className="graph-axis"
                >
                  {row.label}
                </text>
              ))}
            </g>
          )}

          {visibleGroups.map(({ group, i }) => {
            const n = group.slots.length;
            const hits = filtering && layout === 'lv' ? group.slots.filter(isHit).length : n;
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

          {visibleGroups.map(({ group }) =>
            isCoarse(group)
              ? null
              : group.slots.map((slot) => {
                  const x = map.px[slot];
                  const y = map.py[slot];
                  const r = radii[slot];
                  if (!isInView(cull, x, y, r + 12)) return null;
                  const hit = isHit(slot);
                  if (!hit && hide) return null;
                  const position = index.positions[slot];
                  const fill = colors[slot];
                  const hint = marks ? hints.get(index.nodes[slot].id)?.severity : undefined;
                  const type = position.positionType;
                  return (
                    <g
                      key={slot}
                      data-slot={slot}
                      data-tier="position"
                      opacity={hit ? 1 : 0.22}
                      style={{ cursor: 'pointer' }}
                    >
                      {hint !== undefined && (
                        <circle
                          data-hint={hint}
                          cx={x}
                          cy={y}
                          r={r + 3}
                          fill="none"
                          stroke={hint === 'beachten' ? 'var(--amber)' : 'var(--mute)'}
                          strokeWidth={1.8}
                          strokeDasharray={hint === 'beachten' ? undefined : '3 2'}
                        />
                      )}
                      {type === 'BEDARF' ? (
                        <circle
                          cx={x}
                          cy={y}
                          r={Math.max(r - 1, 2)}
                          fill="var(--surface)"
                          stroke={fill}
                          strokeWidth={2}
                        />
                      ) : type === 'ALTERNATIV' ? (
                        <rect
                          x={x - r * 0.8}
                          y={y - r * 0.8}
                          width={r * 1.6}
                          height={r * 1.6}
                          fill={fill}
                          stroke="var(--dot-line)"
                          strokeWidth={0.6}
                          transform={`rotate(45 ${x} ${y})`}
                        />
                      ) : (
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill={fill}
                          stroke="var(--dot-line)"
                          strokeWidth={0.6}
                        />
                      )}
                      {type === 'ZULAGENPOSITION' && (
                        <circle cx={x} cy={y} r={1.6} fill="var(--surface)" />
                      )}
                      {slot === selectedSlot && (
                        <>
                          <circle
                            cx={x}
                            cy={y}
                            r={r + 6}
                            fill="none"
                            stroke="var(--blue)"
                            strokeWidth={2.5}
                          />
                          <circle
                            cx={x}
                            cy={y}
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
                          cx={x}
                          cy={y}
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

      {cardNode !== null && (
        <SelectionCard node={cardNode} onClose={() => dispatch({ type: 'closeSelection' })} />
      )}

      <GraphControls
        zoom={k}
        onFit={fit}
        onFitSelection={selectedSlot >= 0 || selectedNode !== null ? fitSelection : undefined}
        onZoom={zoomBy}
      />
    </div>
  );
}
