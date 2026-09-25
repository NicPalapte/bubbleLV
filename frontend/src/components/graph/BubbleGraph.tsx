// Bubble-Graph — Kern des Produkts. Konsumiert denselben LVNode-Baum und
// denselben Aufklapp-Zustand wie die Tree-Spalte (Issue #18). Portiert aus
// `Bubbles` in design/claude-design/lv-graph.jsx; Vergabepaket-Kanten,
// Dokument-Knoten und das Demo-Los entfallen (out of scope).
//
// Lokal bleibt nur der laufende Ausschnitt (Pan/Zoom): er ändert sich beim
// Ziehen pro Frame und würde als Context-State die ganze Seite neu rendern.
// Beim Verlassen der Ansicht wandert er einmal in `view.graph.viewport` und
// steht beim Zurückwechseln wieder genau so da (WP-L). Nur ein neuer Import
// verwirft ihn — dann passt `fit()` beim Mounten neu ein.

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
import { BubbleNode, CloudDisc, CloudHalo, ClusterNode, type GroupMark } from './BubbleNode';
import { GraphControls } from './GraphControls';
import { SelectionCard } from './SelectionCard';
import {
  CLOUD_LOD_MIN,
  CLOUD_LOD_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  RADII,
  effectiveSizeMode,
  marksVisible,
  sizeModeById,
  sizedRadius,
} from '../../lib/graph/constants';
import { cullBounds, isInView } from '../../lib/graph/culling';
import type { FocusGraph } from '../../lib/graph/focusTree';
import { isOverlayEvent } from '../../lib/graph/overlay';
import {
  layoutRadial,
  walkParents,
  type CloudOrder,
  type PlacedCloud,
  type PlacedNode,
} from '../../lib/graph/layoutRadial';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface View {
  tx: number;
  ty: number;
  k: number;
}

interface Metric {
  radius: number;
  subLabel: string;
  missed: boolean;
}

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/**
 * Anteil als Prozentangabe; unter einem halben Prozent als „<1 %". Wer das
 * Ganze ist, bekommt keine Angabe: „100 %" an einem Los, das als einziges im
 * LV steht, ist keine Information.
 */
function formatShare(share: number): string {
  if (share >= 0.995) return '';
  if (share < 0.005) return '<1 %';
  return `${Math.round(share * 100)} %`;
}

/** Obergrenze beim Einpassen auf eine Auswahl — eine Position bleibt lesbar, nicht riesig. */
const FIT_SELECTION_MAX_ZOOM = 2;

interface BubbleGraphProps {
  root: LVNode;
  /**
   * Isolation der Treffer (WP-Q): statt des LV-Baums zeichnet der Graph den
   * synthetischen Treffer-Baum. Dieselbe Engine, dieselbe Auswahl — nur Baum,
   * Trefferzahlen und Aufklapp-Zustand kommen dann von hier statt aus dem
   * Viewer-Zustand.
   */
  focus?: FocusGraph;
}

export function BubbleGraph({ root: lvRoot, focus }: BubbleGraphProps) {
  const {
    filter: { hideMode },
    selection: { hoveredNodeId },
    view: { graph },
    selectedNode,
    selectedPosition,
    matches: lvMatches,
    openNodes: lvOpenNodes,
    openClusters,
    parents: treeParents,
    quantities,
    hints,
    clusters,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const { sizeMode, highlightCluster } = graph;

  const isolated = focus !== undefined;
  /** Nur der ganze Graph nimmt den zuletzt verlassenen Ausschnitt wieder auf. */
  const remembers = !isolated;
  const root = focus?.tree ?? lvRoot;
  const matches = focus?.matches ?? lvMatches;
  const openNodes = focus?.openNodes ?? lvOpenNodes;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Startwert aus dem Ansichts-Zustand, falls die Ansicht schon einmal offen
  // war; sonst passt der Graph unten selbst ein.
  // Die Isolation merkt sich keinen Ausschnitt: ihr Baum wechselt mit jedem
  // Filterzug, ein gemerkter Ausschnitt zeigte danach ins Leere. Sie passt sich
  // stattdessen jedes Mal neu ein.
  const [view, setView] = useState<View>(
    (remembers ? graph.viewport : null) ?? { tx: 0, ty: 0, k: 0.7 },
  );

  // Ausschnitt beim Abbau sichern — einmal, nicht je Frame.
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    if (!remembers) return;
    return () => dispatch({ type: 'graphViewport', viewport: viewRef.current });
  }, [dispatch, remembers]);

  useLayoutEffect(() => {
    const element = wrapRef.current;
    if (element === null) return;
    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { w, h } = size;

  // Kein eigenes Zentrieren mehr: sobald die Canvas ihre Größe kennt, passt das
  // Einpassen weiter unten den Ausschnitt ein — ein Effekt, der danach noch
  // den Ursprung zentrierte, überschrieb genau diesen Ausschnitt.

  const parents = useMemo(() => walkParents(root), [root]);

  const filtering = matches.filtering;

  // Im Modus "Ausblenden" fallen Nicht-Treffer ganz aus dem Layout: die
  // Positionswolke schrumpft dann auf die Treffer, statt Löcher zu lassen.
  // Im Modus "Dämpfen" bleibt das Layout bewusst stabil, damit der Graph beim
  // Tippen nicht unter der Maus wegspringt.
  const skip = useMemo(() => {
    if (!filtering || hideMode !== 'hide') return undefined;
    return (node: LVNode): boolean => (matches.counts.get(node.id) ?? 0) === 0;
  }, [filtering, hideMode, matches]);

  // Ein Maß, das für diese Datei oder diesen Filter nichts aussagt, fällt auf
  // "Anzahl" zurück — dieselbe Regel, nach der die Isolation ihre Gruppen ordnet
  // (lib/graph/constants.ts). Gesperrt sind solche Modi ohnehin (GraphHeader).
  const priceless = lvRoot.totalPrice === 0;
  const mode = sizeModeById(effectiveSizeMode(sizeMode, { priceless, unit: quantities.unit }));
  // In der Isolation tragen Wurzel und Gruppen synthetische IDs, die die
  // Mengenkarte des echten Baums nicht kennt — der Isolations-Baum bringt
  // seine eigene mit (lib/graph/focusTree.ts).
  const byNode = focus?.quantities ?? quantities.byNode;

  // Die Wolke eines Abschnitts steht nach Größe — die größte Position innen
  // (WP-Q, Issue #51). "Anzahl" ordnet nichts, dort bleibt die OZ-Reihenfolge.
  const cloudOrder = useMemo<CloudOrder | undefined>(() => {
    if (!mode.ranksPositions) return undefined;
    return (a, b) => mode.get(b, byNode) - mode.get(a, byNode);
  }, [mode, byNode]);

  const { nodes: placed, clouds } = useMemo(
    () => layoutRadial(root, openNodes, openClusters, skip, cloudOrder),
    [root, openNodes, openClusters, skip, cloudOrder],
  );

  const metrics = useMemo(() => {
    const map = new Map<string, Metric>();
    // Je Ebene eigene Spanne — ein Abschnitt wird gegen Abschnitte verglichen,
    // nicht gegen das Projekt.
    const rangeByTier = new Map<string, { min: number; max: number }>();
    for (const entry of placed.values()) {
      if (entry.node === null) continue;
      const value = mode.get(entry.node, byNode);
      const range = rangeByTier.get(entry.tier);
      if (range === undefined) rangeByTier.set(entry.tier, { min: value, max: value });
      else {
        range.min = Math.min(range.min, value);
        range.max = Math.max(range.max, value);
      }
    }

    // Bezugsgröße für den Anteil: der Wert der Wurzel im selben Maß.
    const ganzes = mode.get(root, byNode);

    for (const entry of placed.values()) {
      const node = entry.node;
      if (node === null) continue;
      const value = mode.get(node, byNode);
      const range = rangeByTier.get(entry.tier) ?? { min: value, max: value };
      // Positionen sind immer gleich groß (Issue #41) — der Größenmodus
      // vergleicht nur Lose und Abschnitte.
      const radius =
        entry.tier === 'position'
          ? RADII.position
          : sizedRadius(entry.tier, value, range, mode.uniform);

      const hits = matches.counts.get(node.id) ?? 0;
      // Anteil am Ganzen (WP-Q, Issue #51): beantwortet „welcher Abschnitt
      // macht den größten Teil aus?" ohne Kopfrechnen. Nicht an der Wurzel
      // (immer 100 %) und nicht an Positionen (zu kleine Zahlen).
      const anteil =
        mode.uniform ||
        ganzes <= 0 ||
        value <= 0 ||
        entry.tier === 'project' ||
        entry.tier === 'position'
          ? ''
          : formatShare(value / ganzes);
      const valueLabel = mode.uniform ? '' : mode.format(value, quantities.unit);
      const baseLabel = anteil === '' ? valueLabel : `${valueLabel} · ${anteil}`;
      const subLabel =
        filtering && node.kind !== 'position' && hits !== node.positionCount
          ? `${hits.toLocaleString('de-DE')}/${node.positionCount.toLocaleString('de-DE')}${
              baseLabel === '' ? '' : ` · ${baseLabel}`
            }`
          : baseLabel;

      map.set(entry.id, { radius, subLabel, missed: filtering && hits === 0 });
    }
    return map;
  }, [placed, root, mode, byNode, quantities.unit, matches, filtering]);

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
    // Zug am Scrollbalken oder Text in der Auswahlkarte darf den Graphen
    // nicht mitziehen (Issue #47).
    if (isOverlayEvent(event.target)) return;
    // Ein Klick auf eine Bubble (SVG-<g>, nicht fokussierbar) holt sonst nie
    // den Tastaturfokus auf den Canvas — Browser vererben Fokus nicht an
    // fokussierbare Vorfahren eines geklickten Kindelements.
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
      // Über einer Überlagerung gehört das Rad ihr: nicht abfangen, damit der
      // Browser dort normal scrollt (Issue #47).
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

  // ── Viewport-Culling
  const cull = useMemo(
    () => cullBounds({ tx: view.tx, ty: view.ty, k: view.k, width: w, height: h }),
    [view, w, h],
  );
  const inView = useCallback(
    (cx: number, cy: number, r: number): boolean => isInView(cull, cx, cy, r),
    [cull],
  );

  // Mitglieder der hervorgehobenen Ähnlichkeitsgruppe (WP-R, R2). Die Gruppe
  // steht fertig im Zustand — hier wird nur nachgeschlagen, nicht gerechnet.
  const highlighted = useMemo<ReadonlySet<string> | null>(() => {
    if (highlightCluster === null) return null;
    for (const cluster of clusters.values()) {
      if (cluster.id === highlightCluster) return new Set(cluster.positionIds);
    }
    return null;
  }, [highlightCluster, clusters]);

  // Markierungen an Positionen (WP-R, R1) erscheinen erst, wenn die Bubble
  // groß genug für einen Ring ist. Positionen sind alle gleich groß (Issue #41),
  // also fällt die Entscheidung einmal für den ganzen Graphen.
  const showMarks = marksVisible(view.k);

  /**
   * Gruppen-Markierung einer Position (WP-R, R2): leise für jedes Mitglied
   * irgendeiner Gruppe, kräftig für die der hervorgehobenen. Dieselbe
   * Zoom-Schwelle wie beim Hinweis-Ring.
   */
  const groupMark = useCallback(
    (id: string): GroupMark | undefined => {
      if (!showMarks || !clusters.has(id)) return undefined;
      if (highlighted === null) return 'leise';
      return highlighted.has(id) ? 'hervor' : 'leise';
    },
    [showMarks, clusters, highlighted],
  );

  // Detailstufe: zu kleine Wolken werden als eine Fläche gezeichnet. Ohne das
  // hingen bei 10k Positionen zehntausende Kreise im DOM.
  const lodClouds = useMemo(() => {
    const out = new Set<string>();
    for (const cloud of clouds.values()) {
      if (cloud.count > CLOUD_LOD_MIN && cloud.radius * view.k < CLOUD_LOD_PX) {
        out.add(cloud.parentId);
      }
    }
    return out;
  }, [clouds, view.k]);

  const visibleClouds = useMemo(() => {
    const out: PlacedCloud[] = [];
    for (const cloud of clouds.values()) {
      if (!inView(cloud.cx, cloud.cy, cloud.radius)) continue;
      out.push(cloud);
    }
    return out;
  }, [clouds, inView]);

  const visibleNodes = useMemo(() => {
    const out: PlacedNode[] = [];
    for (const entry of placed.values()) {
      if (entry.cloudOf !== null && lodClouds.has(entry.cloudOf)) continue;
      const radius = metrics.get(entry.id)?.radius ?? RADII[entry.tier];
      if (!inView(entry.cx, entry.cy, radius + 24)) continue;
      out.push(entry);
    }
    return out;
  }, [placed, metrics, inView, lodClouds]);

  // Kanten laufen leicht gebogen von der Eltern- zur Kind-Bubble — die kleine
  // Auslenkung nimmt dem Fächer die Sternform (Issue #11).
  const edges = useMemo(() => {
    const out: Array<{ a: string; b: string; d: string; key: string }> = [];
    for (const entry of placed.values()) {
      // Positionen hängen an keiner eigenen Kante — ihre Zugehörigkeit zeigt
      // der Halo ihrer Wolke (Issue #41, G7).
      if (entry.cloudOf !== null) continue;
      const parentId = entry.clusterOf ?? parents.get(entry.id)?.id ?? null;
      if (parentId === null) continue;
      const from = placed.get(parentId);
      if (from === undefined) continue;
      const midX = (entry.cx + from.cx) / 2;
      const midY = (entry.cy + from.cy) / 2;
      const dx = entry.cx - from.cx;
      const dy = entry.cy - from.cy;
      if (!inView(midX, midY, Math.hypot(dx, dy) / 2 + 40)) continue;
      out.push({
        a: from.id,
        b: entry.id,
        key: `${from.id}->${entry.id}`,
        d: `M${from.cx},${from.cy} Q${midX - dy * 0.06},${midY + dx * 0.06} ${entry.cx},${entry.cy}`,
      });
    }
    return out;
  }, [placed, parents, inView]);

  // ── Hover-Spotlight: Pfad zur Wurzel + gesamter Teilbaum.
  const hoverSpotlight = useMemo(() => {
    if (hoveredNodeId === null) return null;
    const entry = placed.get(hoveredNodeId);
    if (entry === undefined) return null;
    const connected = new Set<string>([entry.id]);
    const anchorId = entry.clusterOf ?? entry.id;
    let current: LVNode | null = placed.get(anchorId)?.node ?? null;
    while (current !== null) {
      connected.add(current.id);
      current = parents.get(current.id) ?? null;
    }
    const descend = (node: LVNode): void => {
      connected.add(node.id);
      if (!openNodes.has(node.id)) return;
      for (const child of node.children) descend(child);
    };
    if (entry.node !== null) descend(entry.node);
    return connected;
  }, [hoveredNodeId, placed, parents, openNodes]);

  /**
   * Hervorgehobene Ähnlichkeitsgruppe (WP-R, R2): ihre Mitglieder **und** die
   * Pfade zu ihnen bleiben hell — ohne die Pfade hingen die Bubbles in einem
   * grauen Baum, dessen Zusammenhang nicht mehr zu sehen wäre.
   */
  const clusterSpotlight = useMemo(() => {
    if (highlighted === null) return null;
    const on = new Set<string>();
    for (const id of highlighted) {
      let current: LVNode | null = placed.get(id)?.node ?? null;
      if (current === null) on.add(id);
      while (current !== null) {
        on.add(current.id);
        current = parents.get(current.id) ?? null;
      }
    }
    return on;
  }, [highlighted, placed, parents]);

  /**
   * Eine Dämpfung, nicht zwei: das Überfahren mit der Maus ist flüchtig und
   * gewinnt, solange es andauert; danach steht die Gruppe wieder da.
   */
  const spotlight = hoverSpotlight ?? clusterSpotlight;

  const toggleCollapse = useCallback(
    (id: string): void => dispatch({ type: 'toggleExpanded', id }),
    [dispatch],
  );

  const openNode = useCallback(
    (node: LVNode): void => {
      if (node.kind === 'position') {
        // Öffnet die schwebende Positionskarte über dem Canvas statt in die
        // Tabelle zu springen (Issue #30) — `selectedPosition` treibt die
        // Karte in ViewerPage, solange der Graph der aktive Ansichtsmodus ist.
        // Der Elternknoten kommt aus dem **echten** Baum: in der Isolation ist
        // der Elternknoten eine Gruppen-Bubble, und die steht in keiner Tabelle.
        const parent = treeParents.get(node.id) ?? null;
        dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId: node.id });
        return;
      }
      // Sammel-Bubbles öffnen bzw. schließen sich im Graphen; die Ansicht
      // bleibt der Graph (Issue #10).
      dispatch({ type: 'selectNode', id: node.id });
      if (node.children.length > 0) toggleCollapse(node.id);
    },
    [dispatch, treeParents, toggleCollapse],
  );

  /** Cluster-Bubble auflösen bzw. wieder zusammenfassen. */
  const toggleCluster = useCallback(
    (parentId: string): void => dispatch({ type: 'toggleCluster', id: parentId }),
    [dispatch],
  );

  /**
   * Ausschnitt, der die gegebenen Knoten mit Rand einschließt — reine
   * Berechnung ohne State, damit sie auch im Render nutzbar ist.
   */
  const viewAround = useCallback(
    (entries: Iterable<PlacedNode>, maxZoom: number): View | null => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const entry of entries) {
        const r = (metrics.get(entry.id)?.radius ?? RADII[entry.tier]) + 24;
        minX = Math.min(minX, entry.cx - r);
        maxX = Math.max(maxX, entry.cx + r);
        minY = Math.min(minY, entry.cy - r);
        maxY = Math.max(maxY, entry.cy + r);
      }
      if (!Number.isFinite(minX) || w === 0 || h === 0) return null;
      const boxW = Math.max(1, maxX - minX);
      const boxH = Math.max(1, maxY - minY);
      const pad = 50;
      const k = clampZoom(Math.min(maxZoom, (w - 2 * pad) / boxW, (h - 2 * pad) / boxH));
      return {
        tx: w / 2 - ((minX + maxX) / 2) * k,
        ty: h / 2 - ((minY + maxY) / 2) * k,
        k,
      };
    },
    [metrics, w, h],
  );

  const fitView = useCallback(
    (): View | null => viewAround(placed.values(), MAX_ZOOM),
    [viewAround, placed],
  );
  const fit = useCallback((): void => {
    const next = fitView();
    if (next !== null) setView(next);
  }, [fitView]);

  /**
   * Ausschnitt auf einen Knoten und seinen gezeichneten Teilbaum einpassen
   * (Issue #41). Ein einzelner kleiner Knoten würde sonst bis zum Maximalzoom
   * aufgeblasen — deshalb die Obergrenze.
   */
  const fitToView = useCallback(
    (requestedId: string): View | null => {
      // Steckt die Auswahl in einem zugeklappten Abschnitt oder einer
      // Sammel-Bubble, zählt der nächste gezeichnete Vorfahre.
      let id = requestedId;
      while (!placed.has(id)) {
        const parent = parents.get(id);
        if (parent === undefined || parent === null) return null;
        id = parent.id;
      }
      const start = placed.get(id);
      if (start === undefined) return null;
      const entries: PlacedNode[] = [start];
      const descend = (node: LVNode): void => {
        for (const child of node.children) {
          const entry = placed.get(child.id);
          if (entry === undefined) continue;
          entries.push(entry);
          descend(child);
        }
        const cluster = placed.get(`cluster:${node.id}`);
        if (cluster !== undefined) entries.push(cluster);
      };
      if (start.node !== null) descend(start.node);
      return viewAround(entries, FIT_SELECTION_MAX_ZOOM);
    },
    [placed, parents, viewAround],
  );
  const fitTo = useCallback(
    (id: string): void => {
      const next = fitToView(id);
      if (next !== null) setView(next);
    },
    [fitToView],
  );

  /**
   * Klick oder Eingabetaste auf eine Bubble. Eine Gruppe der Isolation ist kein
   * LV-Knoten — sie lässt sich nicht auswählen und nicht auf- oder zuklappen
   * (ihre Positionen stehen ohnehin offen), wohl aber einpassen.
   */
  const isFocusGroup = useCallback(
    (node: LVNode | null): boolean =>
      node !== null && focus !== undefined && focus.groupIds.has(node.id),
    [focus],
  );

  const activateNode = useCallback(
    (node: LVNode, multi = false): void => {
      // Strg- bzw. Cmd-Klick sammelt Positionen für den Vergleich (WP-N),
      // statt die Karte zu öffnen.
      if (multi && node.kind === 'position') {
        dispatch({ type: 'toggleCompare', positionId: node.id });
        return;
      }
      if (isFocusGroup(node)) {
        fitTo(node.id);
        return;
      }
      openNode(node);
    },
    [dispatch, isFocusGroup, fitTo, openNode],
  );

  // Die Ringradien hängen jetzt an der Größe des LV (Issue #11) — ein fixer
  // Startzoom passt dafür nicht mehr. Deshalb einmal je Baum einpassen. Steht
  // beim Mounten schon eine Auswahl (Wechsel Tabelle → Graph), wird auf sie
  // eingepasst statt auf alles (Issue #41).
  // Im Render statt im Effekt, wie der Fokus weiter unten
  // (react.dev/learn/you-might-not-need-an-effect): erst wenn die Canvas
  // ihre Größe kennt, sonst würde auf 0×0 eingepasst.
  // Ein gemerkter Ausschnitt gilt als bereits eingepasst: sonst spränge der
  // Graph beim Zurückwechseln doch wieder auf die Gesamtansicht.
  const selectionId = selectedPosition?.id ?? selectedNode?.id ?? null;
  const [fittedRoot, setFittedRoot] = useState<LVNode | null>(
    remembers && graph.viewport !== null ? root : null,
  );
  if (fittedRoot !== root && w > 0 && h > 0) {
    setFittedRoot(root);
    const next = (selectionId === null ? null : fitToView(selectionId)) ?? fitView();
    if (next !== null) setView(next);
  }

  const fitSelection = useCallback((): void => {
    if (selectionId !== null) fitTo(selectionId);
  }, [selectionId, fitTo]);

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

  // ── Tastatur: der Graph war bislang ausschließlich mit der Maus bedienbar
  // (Issue #25). Fokus ist ein einzelner Tab-Stopp am Canvas — wie im Baum
  // (Tree.tsx, "aria-activedescendant"-Pattern) — statt jeder Bubble einzeln,
  // sonst müsste man sich durch hunderte Knoten tabben.
  const [focusedId, setFocusedId] = useState<string | null>(root.id);
  const [graphFocused, setGraphFocused] = useState(false);

  // Neue Datei geladen (anderer Baum) — Fokus zurück auf die Wurzel. Im
  // Render statt im Effekt, sonst zeigte ein Frame lang den Fokus des
  // vorigen LV (react.dev/learn/you-might-not-need-an-effect).
  const [focusedRoot, setFocusedRoot] = useState(root);
  if (focusedRoot !== root) {
    setFocusedRoot(root);
    setFocusedId(root.id);
  }

  /** Eltern-ID im Layout — Cluster-Bubbles kennen ihren Elternknoten direkt. */
  const parentIdOf = useCallback(
    (entry: PlacedNode): string | null =>
      entry.tier === 'cluster' ? entry.clusterOf : (parents.get(entry.id)?.id ?? null),
    [parents],
  );

  /** Geschwister eines Knotens, in der Reihenfolge, in der sie um den
   *  Elternknoten aufgefächert sind (Winkel) — dieselbe Reihenfolge, in der
   *  sie auf dem Bildschirm stehen. */
  const siblingsOf = useCallback(
    (entry: PlacedNode): PlacedNode[] => {
      const parentId = parentIdOf(entry);
      const list: PlacedNode[] = [];
      for (const candidate of placed.values()) {
        if (parentIdOf(candidate) === parentId) list.push(candidate);
      }
      list.sort((a, b) => a.angle - b.angle);
      return list;
    },
    [placed, parentIdOf],
  );

  const childrenOf = useCallback(
    (id: string): PlacedNode[] => {
      const list: PlacedNode[] = [];
      for (const candidate of placed.values()) {
        if (parentIdOf(candidate) === id) list.push(candidate);
      }
      list.sort((a, b) => a.angle - b.angle);
      return list;
    },
    [placed, parentIdOf],
  );

  const centerOn = useCallback(
    (cx: number, cy: number): void => {
      setView((current) => ({
        ...current,
        tx: w / 2 - cx * current.k,
        ty: h / 2 - cy * current.k,
      }));
    },
    [w, h],
  );

  /** Fokus setzen und die Bubble in die Mitte holen — wie `revealRow` im Baum. */
  const focusEntry = useCallback(
    (entry: PlacedNode): void => {
      setFocusedId(entry.id);
      centerOn(entry.cx, entry.cy);
    },
    [centerOn],
  );

  const activate = useCallback(
    (entry: PlacedNode): void => {
      if (entry.tier === 'cluster') {
        if (entry.clusterOf !== null) toggleCluster(entry.clusterOf);
        return;
      }
      if (entry.node !== null) activateNode(entry.node);
    },
    [toggleCluster, activateNode],
  );

  const onGraphKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (focusedId === null) return;
      const entry = placed.get(focusedId);
      if (entry === undefined) return;

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown': {
          event.preventDefault();
          const siblings = siblingsOf(entry);
          const index = siblings.findIndex((candidate) => candidate.id === entry.id);
          if (index < 0) return;
          const next = siblings[event.key === 'ArrowUp' ? index - 1 : index + 1];
          if (next !== undefined) focusEntry(next);
          return;
        }
        case 'ArrowRight': {
          event.preventDefault();
          if (entry.tier === 'cluster') {
            if (entry.clusterOf !== null) toggleCluster(entry.clusterOf);
            return;
          }
          const node = entry.node;
          if (node === null || node.children.length === 0) return;
          if (!openNodes.has(node.id)) {
            toggleCollapse(node.id);
            return;
          }
          const firstChild = childrenOf(entry.id)[0];
          if (firstChild !== undefined) focusEntry(firstChild);
          return;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          const node = entry.node;
          // Eine Gruppe der Isolation steht immer offen und klappt nicht zu.
          // Ohne diese Ausnahme schluckte der Zweig hier die Taste, und der
          // Sprung zum Elternknoten darunter käme nie an (WP-Q).
          if (
            entry.tier !== 'cluster' &&
            node !== null &&
            !isFocusGroup(node) &&
            node.children.length > 0 &&
            openNodes.has(node.id)
          ) {
            toggleCollapse(node.id);
            return;
          }
          const parentId = parentIdOf(entry);
          const parentEntry = parentId === null ? undefined : placed.get(parentId);
          if (parentEntry !== undefined) focusEntry(parentEntry);
          return;
        }
        case 'Enter':
        case ' ':
          event.preventDefault();
          activate(entry);
          return;
        case 'f':
        case 'F':
          // Auf die Auswahl einpassen, sonst auf den fokussierten Knoten.
          event.preventDefault();
          fitTo(selectionId !== null && placed.has(selectionId) ? selectionId : entry.id);
          return;
        default:
          return;
      }
    },
    [
      focusedId,
      placed,
      siblingsOf,
      childrenOf,
      parentIdOf,
      openNodes,
      isFocusGroup,
      toggleCollapse,
      toggleCluster,
      activate,
      focusEntry,
      selectionId,
      fitTo,
    ],
  );

  const focusedEntry = focusedId === null ? undefined : placed.get(focusedId);
  const focusedLabel = useMemo(() => {
    if (focusedEntry === undefined) return '';
    if (focusedEntry.tier === 'cluster') {
      return `${formatCount(focusedEntry.clusterCount)} weitere Knoten, eingeklappt`;
    }
    const node = focusedEntry.node;
    if (node === null) return '';
    const title = node.label ?? node.code;
    return node.kind === 'position'
      ? title
      : `${title}, ${formatCount(node.positionCount)} Positionen`;
  }, [focusedEntry]);

  // ── Hover-Tooltip: HTML statt SVG-Text, damit der Kurztext vollständig und
  // mit echtem Zeilenumbruch erscheint (Issue #30) — SVG-<text> kann das
  // nicht. Tastatur-Fokus zeigt denselben Tooltip, wie schon der Fokusring.
  const tooltipId = hoveredNodeId ?? (graphFocused ? focusedId : null);
  const tooltipEntry = tooltipId === null ? undefined : placed.get(tooltipId);
  const tooltipPosition =
    tooltipEntry !== undefined && tooltipEntry.tier === 'position'
      ? (tooltipEntry.node?.position ?? null)
      : null;
  const tooltipRadius =
    tooltipEntry === undefined ? 0 : (metrics.get(tooltipEntry.id)?.radius ?? RADII.position);
  const tooltipLeft =
    tooltipEntry === undefined
      ? 0
      : view.tx + tooltipEntry.cx * view.k + tooltipRadius * view.k + 10;
  const tooltipTop = tooltipEntry === undefined ? 0 : view.ty + tooltipEntry.cy * view.k - 14;

  // Schließt die Karte komplett (X, Klick daneben, Escape) statt nur eine
  // Ebene zurückzugehen — sonst würde die Positionskarte beim Schließen kurz
  // auf den übergeordneten Abschnitt zurückspringen, statt zu verschwinden.
  const closeCard = useCallback(() => dispatch({ type: 'closeSelection' }), [dispatch]);
  // Positionsauswahl hat Vorrang — sie kann neben einem gewählten Abschnitt
  // stehen ('selectPosition' setzt beide IDs), die Karte zeigt aber immer nur
  // eine Ebene.
  const cardNode = selectedPosition ?? selectedNode;

  /**
   * Escape hebt die hervorgehobene Ähnlichkeitsgruppe auf (WP-R, R2).
   *
   * Am `window` in der Capture-Phase, wie die Popover selbst: ein React-Handler
   * am Canvas sähe die Taste nie, solange eine Karte offen ist — `useDismiss`
   * stoppt sie dort mit `stopImmediatePropagation` — und er verlangte obendrein
   * den Tastaturfokus auf dem Canvas.
   *
   * **Gestaffelt, nicht gleichzeitig:** solange eine Karte oder ein Dialog offen
   * steht, gehört Escape dem. Erst der nächste Druck hebt die Gruppe auf — eine
   * Taste, eine Ebene. Der Listener steht dafür selbst still, statt sich auf die
   * Reihenfolge des Einhängens zu verlassen: die Kommandopalette hängt ihren
   * Listener erst beim Öffnen ein, also nach diesem, und würde sonst von ihm
   * überholt.
   */
  useEffect(() => {
    if (highlightCluster === null || cardNode !== null) return;
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Palette und Melde-Fenster sind Dialoge; solange einer offen ist,
      // schließt Escape ihn und sonst nichts.
      if (document.querySelector('[role="dialog"]') !== null) return;
      event.stopImmediatePropagation();
      dispatch({ type: 'highlightCluster', id: null });
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [highlightCluster, cardNode, dispatch]);

  return (
    <div
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
      onKeyDown={onGraphKeyDown}
      onFocus={() => setGraphFocused(true)}
      onBlur={() => setGraphFocused(false)}
      tabIndex={0}
      role="group"
      aria-label="Bubble-Graph — mit den Pfeiltasten navigierbar, Eingabetaste öffnet den Knoten"
      className="absolute inset-0 select-none overflow-hidden outline-none"
      style={{ cursor: panning ? 'grabbing' : 'grab' }}
    >
      {/* Für Screenreader: der Graph ist rein grafisch, der fokussierte
          Knoten wird stattdessen hier angesagt. */}
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

        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {visibleClouds.map((cloud) =>
            lodClouds.has(cloud.parentId) ? (
              <CloudDisc key={cloud.id} cloud={cloud} zoom={view.k} />
            ) : (
              <CloudHalo
                key={cloud.id}
                cloud={cloud}
                dimmed={
                  (spotlight !== null && !spotlight.has(cloud.parentId)) ||
                  metrics.get(cloud.parentId)?.missed === true
                }
              />
            ),
          )}

          {edges.map((edge) => {
            const dim = spotlight !== null && !spotlight.has(edge.a) && !spotlight.has(edge.b);
            return (
              <path
                key={edge.key}
                d={edge.d}
                fill="none"
                stroke="var(--bub-edge)"
                // Auf dem Schirm immer gleich breit — beim Rauszoomen wurden
                // die Kanten sonst zu Haarlinien (Issue #41).
                strokeWidth={1.4 / view.k}
                opacity={dim ? 0.1 : 0.85}
              />
            );
          })}

          {visibleNodes.map((entry) => {
            const spotlightDim = spotlight !== null && !spotlight.has(entry.id);
            if (entry.tier === 'cluster') {
              const sample = entry.clusterOf === null ? null : placed.get(entry.clusterOf);
              const sampleTier = sample?.node?.children[0]?.kind ?? 'position';
              return (
                <ClusterNode
                  key={entry.id}
                  placed={entry}
                  zoom={view.k}
                  dimmed={spotlightDim}
                  hovered={hoveredNodeId === entry.id}
                  focused={graphFocused && focusedId === entry.id}
                  onHover={(id) => dispatch({ type: 'hover', id })}
                  onClick={() => {
                    if (entry.clusterOf !== null) toggleCluster(entry.clusterOf);
                  }}
                  onDoubleClick={() => fitTo(entry.id)}
                  sampleTier={sampleTier}
                  expanded={entry.clusterOf !== null && openClusters.has(entry.clusterOf)}
                />
              );
            }

            const node = entry.node;
            if (node === null) return null;
            const metric = metrics.get(entry.id);
            const missed = metric?.missed === true;
            const hidden = missed && hideMode === 'hide';
            const dimmed = spotlightDim || missed;

            const radius = metric?.radius ?? RADII[entry.tier];

            return (
              <BubbleNode
                key={entry.id}
                placed={entry}
                node={node}
                zoom={view.k}
                dimmed={dimmed}
                hidden={hidden}
                hovered={hoveredNodeId === entry.id}
                focused={graphFocused && focusedId === entry.id}
                onHover={(id) => dispatch({ type: 'hover', id })}
                onClick={(event) => activateNode(node, event.ctrlKey || event.metaKey)}
                onDoubleClick={() => fitTo(entry.id)}
                radius={radius}
                subLabel={metric?.subLabel ?? ''}
                cloudRadius={clouds.get(entry.id)?.radius}
                hint={showMarks ? hints.get(entry.id)?.severity : undefined}
                group={groupMark(entry.id)}
              />
            );
          })}
        </g>
      </svg>

      {tooltipPosition !== null && (
        <div
          className="pointer-events-none absolute z-[6] max-w-[260px] border border-line2 bg-ink px-[8px] py-[6px] font-mono text-[10px] leading-[1.4] text-white"
          style={{
            left: Math.min(Math.max(0, tooltipLeft), Math.max(0, w - 268)),
            top: Math.min(Math.max(0, tooltipTop), Math.max(0, h - 40)),
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            boxShadow: 'var(--shadow-popover)',
          }}
        >
          {tooltipPosition.shortText}
        </div>
      )}

      {cardNode !== null && <SelectionCard node={cardNode} onClose={closeCard} />}

      <GraphControls
        zoom={view.k}
        nodeCount={placed.size}
        renderCount={visibleNodes.length}
        onFit={fit}
        onFitSelection={selectionId === null ? undefined : fitSelection}
        onReset={() => setView({ tx: w / 2, ty: h / 2, k: 0.7 })}
        onZoom={zoomBy}
        onCollapseAll={isolated ? undefined : () => dispatch({ type: 'collapseAll' })}
        onExpandAll={isolated ? undefined : () => dispatch({ type: 'expandAll' })}
      />
    </div>
  );
}
