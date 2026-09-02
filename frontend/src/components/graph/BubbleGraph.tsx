// Bubble-Graph — Kern des Produkts. Konsumiert denselben LVNode-Baum und
// denselben Aufklapp-Zustand wie die Tree-Spalte (Issue #18). Portiert aus
// `Bubbles` in design/claude-design/lv-graph.jsx; Vergabepaket-Kanten,
// Dokument-Knoten und das Demo-Los entfallen (out of scope).
//
// Lokal bleibt nur der Ausschnitt (Pan/Zoom): er ändert sich beim Ziehen pro
// Frame und würde als Context-State die ganze Seite neu rendern. Damit er den
// Abstecher in die Tabelle überlebt, bleibt die Komponente dort montiert und
// wird nur verborgen (Issue #19, siehe ViewerPage). Verborgen ruht das Layout
// (`active`) — sonst würde jeder Tastendruck in der Tabellensuche den ganzen
// Graphen im Hintergrund neu rechnen.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { BubbleNode, ClusterNode, DotNode } from './BubbleNode';
import { GraphControls } from './GraphControls';
import { MAX_ZOOM, MIN_ZOOM, RADII, sizeModeById, sizedRadius } from '../../lib/graph/constants';
import { cullBounds, isInView } from '../../lib/graph/culling';
import { layoutRadial, walkParents, type PlacedNode } from '../../lib/graph/layoutRadial';
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

const EMPTY_PLACED: ReadonlyMap<string, PlacedNode> = new Map();

interface BubbleGraphProps {
  root: LVNode;
  /** Verborgen (Tabelle in der Mitte): montiert bleiben, aber nicht rechnen. */
  active?: boolean;
}

export function BubbleGraph({ root, active = true }: BubbleGraphProps) {
  const { sizeMode, hideMode, hoveredNodeId, matches, openNodes, openClusters } = useViewer();
  const dispatch = useViewerDispatch();

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ tx: 0, ty: 0, k: 0.7 });

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

  // Ursprung in die Canvas-Mitte legen, sobald die echte Größe bekannt ist.
  const centered = useRef(false);
  useEffect(() => {
    if (w === 0 || h === 0 || centered.current) return;
    centered.current = true;
    setView((current) => ({ ...current, tx: w / 2, ty: h / 2 }));
  }, [w, h]);

  const parents = useMemo(() => walkParents(root), [root]);
  const placed = useMemo(
    () => (active ? layoutRadial(root, openNodes, openClusters).nodes : EMPTY_PLACED),
    [active, root, openNodes, openClusters],
  );

  const filtering = matches.filtering;

  // Größenmodus "Gesamtpreis" trägt nicht, wenn die Datei keine Einheitspreise
  // führt (x83) — dann würden alle Bubbles auf Radius 0 fallen.
  const priceless = root.totalPrice === 0;
  const mode = sizeModeById(sizeMode === 'cost' && priceless ? 'count' : sizeMode);

  const metrics = useMemo(() => {
    const map = new Map<string, Metric>();
    // Je Ebene eigene Spanne — ein Abschnitt wird gegen Abschnitte verglichen,
    // nicht gegen das Projekt.
    const rangeByTier = new Map<string, { min: number; max: number }>();
    for (const entry of placed.values()) {
      if (entry.node === null) continue;
      const value = mode.get(entry.node);
      const range = rangeByTier.get(entry.tier);
      if (range === undefined) rangeByTier.set(entry.tier, { min: value, max: value });
      else {
        range.min = Math.min(range.min, value);
        range.max = Math.max(range.max, value);
      }
    }

    for (const entry of placed.values()) {
      const node = entry.node;
      if (node === null) continue;
      const value = mode.get(node);
      const range = rangeByTier.get(entry.tier) ?? { min: value, max: value };
      const radius = sizedRadius(entry.tier, value, range, mode.uniform);

      const hits = matches.counts.get(node.id) ?? 0;
      const baseLabel = mode.uniform ? '' : mode.format(value);
      const subLabel =
        filtering && node.kind !== 'position' && hits !== node.positionCount
          ? `${hits.toLocaleString('de-DE')}/${node.positionCount.toLocaleString('de-DE')}${
              baseLabel === '' ? '' : ` · ${baseLabel}`
            }`
          : baseLabel;

      map.set(entry.id, { radius, subLabel, missed: filtering && hits === 0 });
    }
    return map;
  }, [placed, mode, matches, filtering]);

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

  const visibleNodes = useMemo(() => {
    const out: PlacedNode[] = [];
    for (const entry of placed.values()) {
      const radius = metrics.get(entry.id)?.radius ?? RADII[entry.tier];
      if (!inView(entry.cx, entry.cy, radius + 24)) continue;
      out.push(entry);
    }
    return out;
  }, [placed, metrics, inView]);

  // Kanten laufen leicht gebogen von der Eltern- zur Kind-Bubble — die kleine
  // Auslenkung nimmt dem Fächer die Sternform (Issue #11).
  const edges = useMemo(() => {
    const out: Array<{ a: string; b: string; d: string; key: string }> = [];
    for (const entry of placed.values()) {
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
  const spotlight = useMemo(() => {
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

  const toggleCollapse = useCallback(
    (id: string): void => dispatch({ type: 'toggleExpanded', id }),
    [dispatch],
  );

  /** Sprung in die Tabelle — nur über das Tabellensymbol an der Bubble. */
  const openTable = useCallback(
    (node: LVNode): void => {
      dispatch({ type: 'selectNode', id: node.id, open: true });
    },
    [dispatch],
  );

  const openNode = useCallback(
    (node: LVNode): void => {
      if (node.kind === 'position') {
        const parent = parents.get(node.id) ?? null;
        dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId: node.id });
        return;
      }
      // Sammel-Bubbles öffnen bzw. schließen sich im Graphen und wandern ins
      // Eigenschaften-Panel; die Mitte bleibt der Graph (Issue #10).
      dispatch({ type: 'selectNode', id: node.id });
      if (node.children.length > 0) toggleCollapse(node.id);
    },
    [dispatch, parents, toggleCollapse],
  );

  /** Cluster-Bubble auflösen bzw. wieder zusammenfassen. */
  const toggleCluster = useCallback(
    (parentId: string): void => dispatch({ type: 'toggleCluster', id: parentId }),
    [dispatch],
  );

  /** Tabelle für einen Cluster: nächster Abschnitt bzw. Los oberhalb. */
  const openClusterTable = useCallback(
    (entry: PlacedNode): void => {
      let current: LVNode | null =
        entry.clusterOf === null ? null : (placed.get(entry.clusterOf)?.node ?? null);
      while (current !== null) {
        if (current.kind === 'section' || current.kind === 'lot') {
          dispatch({ type: 'selectNode', id: current.id, open: true });
          return;
        }
        current = parents.get(current.id) ?? null;
      }
    },
    [placed, parents, dispatch],
  );

  const fit = useCallback((): void => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const entry of placed.values()) {
      const r = (metrics.get(entry.id)?.radius ?? RADII[entry.tier]) + 24;
      minX = Math.min(minX, entry.cx - r);
      maxX = Math.max(maxX, entry.cx + r);
      minY = Math.min(minY, entry.cy - r);
      maxY = Math.max(maxY, entry.cy + r);
    }
    if (!Number.isFinite(minX) || w === 0 || h === 0) return;
    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const pad = 50;
    const k = clampZoom(Math.min((w - 2 * pad) / boxW, (h - 2 * pad) / boxH));
    setView({
      tx: w / 2 - ((minX + maxX) / 2) * k,
      ty: h / 2 - ((minY + maxY) / 2) * k,
      k,
    });
  }, [placed, metrics, w, h]);

  // Die Ringradien hängen jetzt an der Größe des LV (Issue #11) — ein fixer
  // Startzoom passt dafür nicht mehr. Deshalb einmal je Baum einpassen.
  const fittedFor = useRef<LVNode | null>(null);
  useEffect(() => {
    if (w === 0 || h === 0 || fittedFor.current === root) return;
    fittedFor.current = root;
    fit();
  }, [root, w, h, fit]);

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

  return (
    <div
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
      className="absolute inset-0 select-none overflow-hidden"
      style={{ cursor: panning ? 'grabbing' : 'grab' }}
    >
      <svg width={w} height={h} className="absolute inset-0 block">
        <defs>
          {/* 14px-Punktraster hinter dem Graphen — Vorgabe des Design-Systems. */}
          <pattern id="bubble-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--grid2)" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#bubble-grid)" />

        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {edges.map((edge) => {
            const dim = spotlight !== null && !spotlight.has(edge.a) && !spotlight.has(edge.b);
            return (
              <path
                key={edge.key}
                d={edge.d}
                fill="none"
                stroke="var(--bub-edge)"
                strokeWidth={1.2 / Math.max(0.4, view.k)}
                opacity={dim ? 0.08 : 0.6}
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
                  onHover={(id) => dispatch({ type: 'hover', id })}
                  onClick={() => {
                    if (entry.clusterOf !== null) toggleCluster(entry.clusterOf);
                  }}
                  sampleTier={sampleTier}
                  expanded={entry.clusterOf !== null && openClusters.has(entry.clusterOf)}
                  onOpenTable={() => openClusterTable(entry)}
                />
              );
            }

            const node = entry.node;
            if (node === null) return null;
            const metric = metrics.get(entry.id);
            const missed = metric?.missed === true;
            const hidden = missed && hideMode === 'hide';
            const dimmed = spotlightDim || missed;

            if (entry.dotted) {
              return (
                <DotNode
                  key={entry.id}
                  placed={entry}
                  node={node}
                  zoom={view.k}
                  dimmed={dimmed}
                  hidden={hidden}
                  hovered={hoveredNodeId === entry.id}
                  onHover={(id) => dispatch({ type: 'hover', id })}
                  onClick={() => openNode(node)}
                />
              );
            }

            return (
              <BubbleNode
                key={entry.id}
                placed={entry}
                node={node}
                zoom={view.k}
                dimmed={dimmed}
                hidden={hidden}
                hovered={hoveredNodeId === entry.id}
                onHover={(id) => dispatch({ type: 'hover', id })}
                onClick={() => openNode(node)}
                radius={metric?.radius ?? RADII[entry.tier]}
                subLabel={metric?.subLabel ?? ''}
                collapsible={node.children.length > 0}
                isCollapsed={!openNodes.has(node.id)}
                childCount={node.children.length}
                onToggleCollapse={() => toggleCollapse(node.id)}
                onOpenTable={() => openTable(node)}
              />
            );
          })}
        </g>
      </svg>

      <GraphControls
        zoom={view.k}
        nodeCount={placed.size}
        renderCount={visibleNodes.length}
        onFit={fit}
        onReset={() => setView({ tx: w / 2, ty: h / 2, k: 0.7 })}
        onZoom={zoomBy}
        onCollapseAll={() => dispatch({ type: 'collapseAll' })}
        onExpandAll={() => dispatch({ type: 'expandAll' })}
      />
    </div>
  );
}
