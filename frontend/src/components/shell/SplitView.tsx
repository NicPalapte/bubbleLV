// Splitscreen (Entscheidungen 0064, 0070, 0072, 0073): Überblick, Prüfung, Graph,
// Tabelle, Dokument und Positionskarte stehen nebeneinander statt als Fenster
// übereinander — näher an der gewohnten Arbeitsweise in iTWO. Nahtlos: keine
// Karten, nur 1-px-Linien zwischen den Bereichen.
//
// Ziehen am Kopf eines Bereichs — eine Vorschau zeigt vorher die Fläche, die er bekommt:
// - auf die Kopfzeile eines anderen Platzes ⇒ stapeln (Reiter),
// - auf die Mitte eines anderen Bereichs ⇒ beide tauschen den Platz,
// - an einen Rand eines Bereichs ⇒ nur dieser Platz wird geteilt,
// - an den äußeren Rand der Fläche ⇒ der Bereich läuft über die volle Höhe bzw. Breite.
// Die Trennlinien sind ziehbar, Doppelklick setzt ihre Teilung zurück.
//
// Schmale Fläche (unter `COMPACT_WIDTH`, Entscheidung 0074): nur der Graph und ein Platz
// mit allen anderen Bereichen als Reiter, auf dem Handy übereinander. Diese Anordnung
// ist abgeleitet, nicht gespeichert — wer das Fenster wieder breit zieht, findet seine.
//
// Jeder Bereich ist ein eigenes, absolut gesetztes Element mit festem Schlüssel:
// Tauschen, Stapeln und Teilen verschieben nur Koordinaten, der Graph bleibt montiert
// und behält seinen Ausschnitt. Ein Reiter hinter einem anderen wird nur unsichtbar.
// Während des Ziehens einer Trennlinie wandert nur die Linie; die Bereiche folgen
// erst beim Loslassen — sonst müsste der Graph mit ~10k Positionen jeden Frame
// neu messen.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { GraphStage } from './GraphStage';
import { useWorkspace, type PopPane } from './WorkspaceProvider';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SelectionCard } from '../graph/SelectionCard';
import { CheckCard, CheckFlyout } from '../overview/CheckCard';
import { OverviewView } from '../overview/OverviewView';
import { PositionsTable } from '../table/PositionsTable';
import { DocumentView } from '../docs/DocumentView';
import {
  COMPACT_WIDTH,
  PANES,
  PANE_LABEL,
  STACKED_WIDTH,
  compactRoot,
  edgePane,
  findSplit,
  frontOf,
  leafOf,
  leavesOf,
  moveBoundary,
  shownChildren,
  shownIn,
  splitLayout,
  splitPane,
  stackPane,
  swapPanes,
  type Arrangement,
  type Leaf,
  type PaneId,
  type Rect,
  type Side,
  type SplitLine,
} from '../../lib/workspace/split';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** Höhe der Kopfzeile je Platz in px. */
const HEAD = 32;
/** Breite der greifbaren Zone um eine Trennlinie in px. */
const GRIP = 8;
/** Schritt der Pfeiltasten an einer Trennlinie. */
const KEY_STEP = 0.02;

const ICON_BUTTON =
  'inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

const EDGE = 0.9999;

/** Rechteck in CSS; innen liegende Kanten lassen 1 px frei — dort scheint die Linie durch. */
function rectStyle(rect: Rect, top = 0, height?: number): CSSProperties {
  const right = rect.x + rect.w >= EDGE ? 0 : 1;
  const bottom = rect.y + rect.h >= EDGE ? 0 : 1;
  return {
    left: `${rect.x * 100}%`,
    top: `calc(${rect.y * 100}% + ${top}px)`,
    width: `calc(${rect.w * 100}% - ${right}px)`,
    height: height === undefined ? `calc(${rect.h * 100}% - ${top + bottom}px)` : `${height}px`,
  };
}

/** Rand der ganzen Fläche in px, an dem ein Bereich durchläuft. */
const OUTER = 16;
/** Anteil am Rand eines Bereichs, der ihn teilt; die Mitte tauscht. */
const BAND = 0.25;
/** Kleinste Hälfte in px, die ein Teilen noch übrig lässt. */
const MIN_W = 200;
const MIN_H = 120;

type Drop =
  | { kind: 'stack'; leaf: string }
  | { kind: 'swap'; leaf: string; with: PaneId }
  | { kind: 'split'; leaf: string; side: Side }
  | { kind: 'edge'; side: Side };

const DROP_LABEL: Record<Drop['kind'], string> = {
  stack: 'als Reiter',
  swap: 'tauschen',
  split: 'teilen',
  edge: 'durchlaufend',
};

function sameDrop(a: Drop | null, b: Drop | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyDrop<T extends Arrangement>(arrangement: T, pane: PaneId, drop: Drop): T {
  switch (drop.kind) {
    case 'stack':
      return stackPane(arrangement, pane, drop.leaf);
    case 'swap':
      return swapPanes(arrangement, pane, drop.with);
    case 'split':
      return splitPane(arrangement, pane, drop.leaf, drop.side);
    case 'edge':
      return edgePane(arrangement, pane, drop.side);
  }
}

/** Breite eines Elements in px; 0, solange sie unbekannt ist (z. B. ohne ResizeObserver). */
function useWidth(ref: { readonly current: HTMLElement | null }): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function SplitView({ root }: { root: LVNode }) {
  const {
    tree,
    selectedNode,
    selectedPosition,
    view: { workspace },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const { hosts, blocked, popOut } = useWorkspace();
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<PaneId | null>(null);
  const dragTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(dragTimer.current), []);
  const [over, setOver] = useState<Drop | null>(null);
  /** Lage der gezogenen Trennlinie (Anteil ihrer Teilung), bis sie losgelassen wird. */
  const [preview, setPreview] = useState<{ key: string; at: number } | null>(null);

  const visible = (pane: PaneId): boolean =>
    !workspace.closed[pane] &&
    (pane === 'card' || pane === 'overview' || pane === 'check' || hosts[pane] === null);
  const width = useWidth(gridRef);
  const compact = width > 0 && width < COMPACT_WIDTH;
  // Welcher Reiter auf dem gemeinsamen Platz vorn liegt: nur Bildschirmzustand.
  const [compactFront, setCompactFront] = useState<PaneId | null>(null);
  // Ein gerade geöffneter Bereich (Sprung in die Prüfung, „Ansicht") kommt nach vorn.
  const before = useRef(workspace.closed);
  useEffect(() => {
    const opened = PANES.find((pane) => before.current[pane] && !workspace.closed[pane]);
    before.current = workspace.closed;
    if (opened !== undefined && opened !== 'graph') setCompactFront(opened);
  }, [workspace.closed]);
  const layoutRoot = compact
    ? compactRoot(visible, width < STACKED_WIDTH ? 'col' : 'row', compactFront)
    : workspace.root;
  const layout = splitLayout(layoutRoot, visible);
  const places = leavesOf(layoutRoot).filter((place) => layout.frames[place.id] !== undefined);
  const cardNode = selectedPosition ?? selectedNode;
  // Schmal: der Reiter wechselt nur auf dem Bildschirm, die gemerkte Anordnung bleibt.
  const bringFront = (pane: PaneId): void => {
    if (compact) setCompactFront(pane);
    else dispatch({ type: 'paneFront', pane });
  };

  const endDrag = (): void => {
    window.clearTimeout(dragTimer.current);
    setDragged(null);
    setOver(null);
  };
  const startDrag = (event: DragEvent, pane: PaneId): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pane);
    // Zustand erst nach dem Start setzen — Chrome bricht den Drag sonst ab.
    dragTimer.current = window.setTimeout(() => setDragged(pane), 0);
  };

  /** Was ein Loslassen an dieser Stelle bewirkt; `null` = nichts. */
  const dropAt = (clientX: number, clientY: number): Drop | null => {
    const grid = gridRef.current;
    if (dragged === null || grid === null) return null;
    const box = grid.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const px = clientX - box.left;
    const py = clientY - box.top;
    const source = leafOf(workspace.root, dragged);
    const alone = places.length === 1 && shownIn(source, visible).length < 2;
    const outer: Side | null =
      px < OUTER
        ? 'left'
        : px > box.width - OUTER
          ? 'right'
          : py > box.height - OUTER
            ? 'bottom'
            : null;
    if (outer !== null) {
      if (alone) return null;
      // Wie beim Teilen: nur, wenn die neue Fläche noch nutzbar groß ist.
      const next = edgePane(workspace, dragged, outer);
      const r = splitLayout(next.root, visible).frames[leafOf(next.root, dragged).id];
      const roomy = r !== undefined && r.w * box.width >= MIN_W && r.h * box.height >= MIN_H;
      return roomy ? { kind: 'edge', side: outer } : null;
    }
    const place = places.find((entry) => {
      const r = layout.frames[entry.id];
      return (
        px >= r.x * box.width &&
        px < (r.x + r.w) * box.width &&
        py >= r.y * box.height &&
        py < (r.y + r.h) * box.height
      );
    });
    if (place === undefined) return null;
    const r = layout.frames[place.id];
    const left = r.x * box.width;
    const top = r.y * box.height;
    const w = r.w * box.width;
    const h = r.h * box.height;
    const own = place.id === source.id;
    if (py - top < HEAD) return own ? null : { kind: 'stack', leaf: place.id };
    const rx = (px - left) / w;
    const ry = (py - top - HEAD) / Math.max(1, h - HEAD);
    const sides: Array<[Side, number]> = [
      ['left', rx],
      ['right', 1 - rx],
      ['top', ry],
      ['bottom', 1 - ry],
    ];
    const [side, distance] = sides.reduce((best, next) => (next[1] < best[1] ? next : best));
    const roomy = side === 'left' || side === 'right' ? w / 2 >= MIN_W : (h - HEAD) / 2 >= MIN_H;
    const canSplit = !own || shownIn(place, visible).length > 1;
    if (distance < BAND && roomy && canSplit) return { kind: 'split', leaf: place.id, side };
    const target = frontOf(place, visible);
    return own || target === null ? null : { kind: 'swap', leaf: place.id, with: target };
  };

  /** Fläche, die der gezogene Bereich nach dem Loslassen bekäme. */
  const landing = (drop: Drop): Rect | undefined => {
    if (dragged === null) return undefined;
    const next = applyDrop(workspace, dragged, drop);
    return splitLayout(next.root, visible).frames[leafOf(next.root, dragged).id];
  };

  const onDragOver = (event: DragEvent): void => {
    const drop = dropAt(event.clientX, event.clientY);
    if (drop === null) {
      if (over !== null) setOver(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!sameDrop(drop, over)) setOver(drop);
  };
  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    const drop = dropAt(event.clientX, event.clientY);
    if (dragged !== null && drop !== null) {
      switch (drop.kind) {
        case 'stack':
          dispatch({ type: 'stackPane', pane: dragged, to: drop.leaf });
          break;
        case 'swap':
          dispatch({ type: 'swapPanes', a: dragged, b: drop.with });
          break;
        case 'split':
          dispatch({ type: 'splitPane', pane: dragged, target: drop.leaf, side: drop.side });
          break;
        case 'edge':
          dispatch({ type: 'edgePane', pane: dragged, side: drop.side });
          break;
      }
    }
    endDrag();
  };

  // ── Trennlinien ──────────────────────────────────────────────────────────
  const lineKey = (line: SplitLine): string => `${line.split}-${line.before}-${line.after}`;
  const sizesAt = (line: SplitLine, at: number): number[] | null => {
    const split = findSplit(workspace.root, line.split);
    if (split === null) return null;
    return moveBoundary(split, line, shownChildren(split, visible), at);
  };
  /** Lage der Linie nach Begrenzung — so zeigt die Vorschau, wo sie landet. */
  const clampAt = (line: SplitLine, at: number): number => {
    const split = findSplit(workspace.root, line.split);
    const sizes = sizesAt(line, at);
    if (split === null || sizes === null) return line.at;
    const shown = shownChildren(split, visible);
    const total = shown.reduce((acc, i) => acc + sizes[i], 0);
    return shown.filter((i) => i < line.after).reduce((acc, i) => acc + sizes[i], 0) / total;
  };
  const commit = (line: SplitLine, at: number | null): void => {
    const sizes = at === null ? null : sizesAt(line, at);
    if (at !== null && sizes === null) return;
    dispatch({ type: 'splitSize', split: line.split, sizes });
  };
  const pointerAt = (line: SplitLine, clientX: number, clientY: number): number | null => {
    const grid = gridRef.current;
    if (grid === null) return null;
    const box = grid.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const { area } = line;
    const at =
      line.axis === 'row'
        ? ((clientX - box.left) / box.width - area.x) / area.w
        : ((clientY - box.top) / box.height - area.y) / area.h;
    return clampAt(line, at);
  };

  const divider = (line: SplitLine) => {
    const key = lineKey(line);
    const current = line.at;
    const live = preview?.key === key;
    const at = live ? preview.at : current;
    const { area } = line;
    const style: CSSProperties =
      line.axis === 'row'
        ? {
            left: `calc(${(area.x + at * area.w) * 100}% - ${GRIP / 2}px)`,
            top: `${area.y * 100}%`,
            height: `${area.h * 100}%`,
            width: GRIP,
          }
        : {
            top: `calc(${(area.y + at * area.h) * 100}% - ${GRIP / 2}px)`,
            left: `${area.x * 100}%`,
            width: `${area.w * 100}%`,
            height: GRIP,
          };
    const onKeyDown = (event: KeyboardEvent): void => {
      const back = line.axis === 'row' ? 'ArrowLeft' : 'ArrowUp';
      const forth = line.axis === 'row' ? 'ArrowRight' : 'ArrowDown';
      if (event.key !== back && event.key !== forth) return;
      event.preventDefault();
      commit(line, clampAt(line, current + (event.key === forth ? KEY_STEP : -KEY_STEP)));
    };
    return (
      <div
        key={key}
        role="separator"
        tabIndex={0}
        aria-orientation={line.axis === 'row' ? 'vertical' : 'horizontal'}
        aria-label={line.axis === 'row' ? 'Breite der Bereiche' : 'Höhe der Bereiche'}
        aria-valuenow={Math.round(current * 100)}
        title="Ziehen ändert die Größe, Doppelklick setzt zurück"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setPreview({ key, at: current });
        }}
        onPointerMove={(event) => {
          if (preview?.key !== key) return;
          const next = pointerAt(line, event.clientX, event.clientY);
          if (next !== null && next !== preview.at) setPreview({ key, at: next });
        }}
        onPointerUp={() => {
          if (preview?.key !== key) return;
          commit(line, preview.at);
          setPreview(null);
        }}
        onPointerCancel={() => setPreview(null)}
        onDoubleClick={() => commit(line, null)}
        onKeyDown={onKeyDown}
        className={`group absolute z-[6] flex items-center justify-center focus-visible:outline-none ${
          line.axis === 'row' ? 'cursor-col-resize' : 'cursor-row-resize'
        }`}
        style={style}
      >
        <span
          aria-hidden="true"
          className={`${live ? 'bg-blue' : 'bg-transparent'} group-hover:bg-blue group-focus-visible:bg-blue ${
            line.axis === 'row' ? 'h-full w-[2px]' : 'h-[2px] w-full'
          }`}
        />
      </div>
    );
  };

  // ── Inhalte und Knöpfe je Bereich ────────────────────────────────────────
  const popButton = (pane: PopPane) => (
    <>
      {blocked === pane && (
        <span role="status" className="font-mono text-[11.5px] text-mute">
          Pop-up blockiert
        </span>
      )}
      <button
        type="button"
        onClick={() => popOut(pane)}
        title="In eigenem Fenster — z. B. auf dem zweiten Bildschirm"
        aria-label={`${PANE_LABEL[pane]} in eigenem Fenster öffnen`}
        className={ICON_BUTTON}
      >
        ↗
      </button>
    </>
  );
  const actions = (pane: PaneId) => (
    <>
      {(pane === 'graph' || pane === 'table' || pane === 'doc') && popButton(pane)}
      <button
        type="button"
        onClick={() => dispatch({ type: 'paneClosed', pane, closed: true })}
        aria-label={`${PANE_LABEL[pane]} schließen`}
        className={ICON_BUTTON}
      >
        ✕
      </button>
    </>
  );

  const content: Record<PaneId, ReactNode> = {
    graph: (
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <GraphStage root={root} />
      </div>
    ),
    table: (
      <div className="relative min-h-0 flex-1">
        <PositionsTable root={selectedNode ?? tree ?? root} />
      </div>
    ),
    card:
      cardNode !== null ? (
        <SelectionCard node={cardNode} />
      ) : (
        <div className="flex flex-1 items-center justify-center font-mono text-[12px] text-mute">
          Keine Auswahl
        </div>
      ),
    overview: (
      <div className="relative min-h-0 flex-1">
        <ErrorBoundary bereich="overview" dateiGeladen>
          <OverviewView />
        </ErrorBoundary>
      </div>
    ),
    doc: (
      <ErrorBoundary bereich="doc" dateiGeladen>
        <DocumentView />
      </ErrorBoundary>
    ),
    check: (
      <ErrorBoundary bereich="check" dateiGeladen>
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 overflow-auto px-[14px] py-[14px]">
            <CheckCard />
          </div>
        </div>
        <CheckFlyout />
      </ErrorBoundary>
    ),
  };

  // ── Kopfzeile je Platz: Titel oder Reiter ────────────────────────────────
  const head = (place: Leaf, rect: Rect) => {
    const shown = shownIn(place, visible);
    const front = frontOf(place, visible);
    if (front === null) return null;
    const hot = over?.kind === 'stack' && over.leaf === place.id;
    const tabs = shown.length > 1;
    const switchByKey = (event: KeyboardEvent): void => {
      if ((event.target as HTMLElement).getAttribute('role') !== 'tab') return;
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = shown[(shown.indexOf(front) + step + shown.length) % shown.length];
      bringFront(next);
      gridRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
    };
    return (
      <div
        key={`head-${place.id}`}
        data-slot={place.id}
        className={`absolute z-[3] flex items-stretch border-b border-line pr-[4px] ${
          hot ? 'bg-blueS shadow-[inset_0_0_0_2px_var(--blue)]' : 'bg-panel'
        }`}
        style={rectStyle(rect, 0, HEAD)}
      >
        <div
          role={tabs ? 'tablist' : undefined}
          aria-label={tabs ? 'Gestapelte Bereiche' : undefined}
          onKeyDown={tabs ? switchByKey : undefined}
          className="flex min-w-0 flex-1 items-stretch"
        >
          {shown.map((pane) => {
            const on = pane === front;
            const label = PANE_LABEL[pane];
            // Schmal wird nicht gezogen — dann auch kein Griff.
            const grip = compact ? null : (
              <span aria-hidden="true" className="text-[13px] leading-none text-mute">
                ⠿
              </span>
            );
            const hand = compact ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing';
            const common = {
              draggable: !compact,
              'data-tab': pane,
              'data-tour': pane === 'table' ? 'table' : undefined,
              title: compact
                ? undefined
                : 'Ziehen: auf eine Kopfzeile stapeln, in die Mitte tauschen, an einen Rand teilen',
              onDragStart: (event: DragEvent) => startDrag(event, pane),
              onDragEnd: endDrag,
            };
            return tabs ? (
              <button
                key={pane}
                type="button"
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => bringFront(pane)}
                {...common}
                className={`flex min-w-0 ${hand} items-center gap-[7px] border-none px-[10px] font-display text-[13px] ${
                  on
                    ? 'bg-surface font-semibold text-ink shadow-[inset_0_-2px_0_var(--blue)]'
                    : 'bg-transparent text-dim hover:text-ink'
                } ${dragged === pane ? 'opacity-50' : ''}`}
              >
                {grip}
                <span className="truncate">{label}</span>
              </button>
            ) : (
              <div
                key={pane}
                {...common}
                className={`flex min-w-0 flex-1 ${hand} items-center gap-[7px] pl-[10px] ${
                  dragged === pane ? 'opacity-50' : ''
                }`}
              >
                {grip}
                <b className="truncate font-display text-[13px] font-semibold text-ink">{label}</b>
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-[2px]">{actions(front)}</div>
      </div>
    );
  };

  // ── Ablagefläche über der ganzen Arbeitsfläche, solange gezogen wird ──────
  const target = over === null ? undefined : landing(over);
  const dropLayer = (
    <div
      key="drop"
      data-drop="split"
      className="absolute inset-0 z-[5]"
      onDragOver={onDragOver}
      onDragLeave={(event: DragEvent) => {
        if (event.target === event.currentTarget) setOver(null);
      }}
      onDrop={onDrop}
    >
      {over !== null && target !== undefined && (
        <div
          className="pointer-events-none absolute flex items-center justify-center border-2 border-solid border-blue bg-[color-mix(in_srgb,var(--blueS)_55%,transparent)]"
          style={rectStyle(target)}
        >
          <span className="rounded-[var(--r-pill)] bg-surface px-[8px] py-[2px] font-mono text-[11px] text-blueD shadow-[var(--shadow-sm)]">
            {dragged === null ? '' : `${PANE_LABEL[dragged]} · ${DROP_LABEL[over.kind]}`}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={gridRef}
      data-split-grid=""
      className={`absolute inset-0 overflow-hidden bg-line${preview === null ? '' : ' select-none'}`}
    >
      {places.map((place) => head(place, layout.frames[place.id]))}
      {/* Fester Schlüssel je Bereich: Tauschen, Stapeln, Teilen verschieben nur Koordinaten. */}
      {PANES.map((pane) => {
        const place = leafOf(layoutRoot, pane);
        const rect = layout.frames[place.id];
        if (!visible(pane) || rect === undefined) return null;
        const front = frontOf(place, visible) === pane;
        return (
          <section
            key={pane}
            aria-label={`${PANE_LABEL[pane]} — Bereich`}
            aria-hidden={front ? undefined : true}
            data-pane={pane}
            className={`absolute z-[1] flex flex-col overflow-hidden bg-surface ${front ? '' : 'invisible'}`}
            style={rectStyle(rect, HEAD)}
          >
            {content[pane]}
          </section>
        );
      })}
      {dragged !== null && dropLayer}
      {!compact && layout.lines.map(divider)}
      {places.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper font-mono text-[12px] text-mute">
          Alle Bereiche geschlossen
        </div>
      )}
    </div>
  );
}
