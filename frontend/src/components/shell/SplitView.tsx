// Splitscreen (Entscheidung 0064): Graph, Tabelle und Positionskarte stehen
// nebeneinander statt als Fenster übereinander — näher an der gewohnten
// Arbeitsweise in iTWO. Drei Plätze (links oben, links unten, rechts); wer
// einen Bereich am Kopf auf einen anderen zieht, tauscht beide. Die
// Trennlinien sind ziehbar, Doppelklick setzt sie zurück.
//
// Während des Ziehens wandert nur eine Linie mit; die Bereiche folgen erst beim
// Loslassen. Sonst müsste der Graph mit ~10k Positionen jeden Frame neu messen.

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { GraphStage } from './GraphStage';
import { useWorkspace, type PopPane } from './WorkspaceProvider';
import { SelectionCard } from '../graph/SelectionCard';
import { PositionsTable } from '../table/PositionsTable';
import {
  PANES,
  SPLIT_COL_MAX,
  SPLIT_COL_MIN,
  SPLIT_ROW_MAX,
  SPLIT_ROW_MIN,
  clampFrac,
  slotOf,
  splitLayout,
  type PaneId,
} from '../../lib/workspace/split';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** Innenabstand und Lücke des Rasters in px — die Trennlinien sitzen in der Lücke. */
const PAD = 10;
const GAP = 10;
/** Schritt der Pfeiltasten an einer Trennlinie. */
const KEY_STEP = 0.02;

const PANE_LABEL: Record<PaneId, string> = {
  graph: 'Graph',
  table: 'Tabelle',
  card: 'Position',
};

const ICON_BUTTON =
  'inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

type Axis = 'col' | 'row';

interface PaneProps {
  pane: PaneId;
  place: { column: string; row: string };
  dragged: PaneId | null;
  over: PaneId | null;
  onDragStart: (pane: PaneId) => void;
  onDragOver: (pane: PaneId) => void;
  onDrop: (pane: PaneId) => void;
  onDragEnd: () => void;
  actions: ReactNode;
  children: ReactNode;
}

function Pane({
  pane,
  place,
  dragged,
  over,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  actions,
  children,
}: PaneProps) {
  const target = dragged !== null && dragged !== pane;
  const ring =
    dragged === pane
      ? ' opacity-50'
      : target && over === pane
        ? ' outline outline-2 outline-offset-2 outline-blue'
        : target
          ? ' outline-dashed outline-2 outline-offset-2 outline-line2'
          : '';
  return (
    <section
      aria-label={`${PANE_LABEL[pane]} — Bereich`}
      data-pane={pane}
      className={`ov-window relative flex min-h-0 min-w-0 flex-col overflow-hidden${ring}`}
      style={{ gridColumn: place.column, gridRow: place.row }}
      onDragOver={(event: DragEvent) => {
        if (!target) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOver(pane);
      }}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        onDrop(pane);
      }}
    >
      <div
        draggable
        data-tour={pane === 'table' ? 'table' : undefined}
        title="Ziehen, um den Platz zu tauschen"
        onDragStart={(event: DragEvent) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', pane);
          onDragStart(pane);
        }}
        onDragEnd={onDragEnd}
        className="flex h-[36px] shrink-0 cursor-grab items-center gap-[8px] border-b border-line pl-[10px] pr-[5px] active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-[13px] leading-none text-mute">
          ⠿
        </span>
        <b className="flex-1 font-display text-[14px] font-semibold text-ink">{PANE_LABEL[pane]}</b>
        {actions}
      </div>
      {children}
    </section>
  );
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
  const [over, setOver] = useState<PaneId | null>(null);
  /** Lage der gezogenen Trennlinie, bis sie losgelassen wird. */
  const [preview, setPreview] = useState<{ axis: Axis; frac: number } | null>(null);

  const visible = (pane: PaneId): boolean =>
    !workspace.closed[pane] && (pane === 'card' || hosts[pane] === null);
  const layout = splitLayout(workspace.slots, visible, workspace.colFrac, workspace.rowFrac);
  const cardNode = selectedPosition ?? selectedNode;

  const endDrag = (): void => {
    window.clearTimeout(dragTimer.current);
    setDragged(null);
    setOver(null);
  };
  const drop = (pane: PaneId): void => {
    if (dragged !== null && dragged !== pane) {
      dispatch({ type: 'movePane', pane: dragged, to: slotOf(workspace.slots, pane) });
    }
    endDrag();
  };

  const fracAt = (axis: Axis, clientX: number, clientY: number): number | null => {
    const grid = gridRef.current;
    if (grid === null) return null;
    const rect = grid.getBoundingClientRect();
    const span = (axis === 'col' ? rect.width : rect.height) - 2 * PAD - GAP;
    if (span <= 0) return null;
    const offset = axis === 'col' ? clientX - rect.left : clientY - rect.top;
    const raw = (offset - PAD - GAP / 2) / span;
    return axis === 'col'
      ? clampFrac(raw, SPLIT_COL_MIN, SPLIT_COL_MAX)
      : clampFrac(raw, SPLIT_ROW_MIN, SPLIT_ROW_MAX);
  };
  const commit = (axis: Axis, frac: number | null): void =>
    dispatch(
      axis === 'col' ? { type: 'splitSize', colFrac: frac } : { type: 'splitSize', rowFrac: frac },
    );

  const divider = (axis: Axis) => {
    const current = axis === 'col' ? workspace.colFrac : workspace.rowFrac;
    // Die waagerechte Linie endet an der senkrechten — auch während die gezogen wird.
    const colNow = preview?.axis === 'col' ? preview.frac : workspace.colFrac;
    const frac = preview?.axis === axis ? preview.frac : current;
    const along = `calc(${PAD}px + (100% - ${2 * PAD + GAP}px) * ${frac})`;
    const style =
      axis === 'col'
        ? { left: along, top: PAD, bottom: PAD, width: GAP }
        : {
            top: along,
            left: PAD,
            height: GAP,
            width: layout.colDivider
              ? `calc((100% - ${2 * PAD + GAP}px) * ${colNow})`
              : `calc(100% - ${2 * PAD}px)`,
          };
    const onKeyDown = (event: KeyboardEvent): void => {
      const back = axis === 'col' ? 'ArrowLeft' : 'ArrowUp';
      const forth = axis === 'col' ? 'ArrowRight' : 'ArrowDown';
      if (event.key !== back && event.key !== forth) return;
      event.preventDefault();
      commit(axis, current + (event.key === forth ? KEY_STEP : -KEY_STEP));
    };
    return (
      <div
        role="separator"
        tabIndex={0}
        aria-orientation={axis === 'col' ? 'vertical' : 'horizontal'}
        aria-label={axis === 'col' ? 'Breite der Bereiche' : 'Höhe der Bereiche'}
        aria-valuenow={Math.round(current * 100)}
        aria-valuemin={Math.round((axis === 'col' ? SPLIT_COL_MIN : SPLIT_ROW_MIN) * 100)}
        aria-valuemax={Math.round((axis === 'col' ? SPLIT_COL_MAX : SPLIT_ROW_MAX) * 100)}
        title="Ziehen ändert die Größe, Doppelklick setzt zurück"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setPreview({ axis, frac: current });
        }}
        onPointerMove={(event) => {
          if (preview?.axis !== axis) return;
          const next = fracAt(axis, event.clientX, event.clientY);
          if (next !== null && next !== preview.frac) setPreview({ axis, frac: next });
        }}
        onPointerUp={() => {
          if (preview?.axis !== axis) return;
          commit(axis, preview.frac);
          setPreview(null);
        }}
        onPointerCancel={() => setPreview(null)}
        onDoubleClick={() => commit(axis, null)}
        onKeyDown={onKeyDown}
        className={`group absolute z-[6] flex items-center justify-center focus-visible:outline-none ${
          axis === 'col' ? 'cursor-col-resize' : 'cursor-row-resize'
        }`}
        style={style}
      >
        <span
          aria-hidden="true"
          className={`rounded-full group-hover:bg-blue group-focus-visible:bg-blue ${
            preview?.axis === axis ? 'bg-blue' : 'bg-line2'
          } ${
            axis === 'col'
              ? preview?.axis === axis
                ? 'h-full w-[2px]'
                : 'h-[40px] w-[4px]'
              : preview?.axis === axis
                ? 'h-[2px] w-full'
                : 'h-[4px] w-[40px]'
          }`}
        />
      </div>
    );
  };

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
  const closeButton = (pane: PaneId) => (
    <button
      type="button"
      onClick={() => dispatch({ type: 'paneClosed', pane, closed: true })}
      aria-label={`${PANE_LABEL[pane]} schließen`}
      className={ICON_BUTTON}
    >
      ✕
    </button>
  );

  const content: Record<PaneId, ReactNode> = {
    graph: (
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <GraphStage root={root} cardOverlay={false} />
      </div>
    ),
    table: (
      <div className="relative min-h-0 flex-1">
        <PositionsTable root={selectedNode ?? tree ?? root} />
      </div>
    ),
    card:
      cardNode !== null ? (
        <SelectionCard
          node={cardNode}
          docked
          onClose={() => dispatch({ type: 'closeSelection' })}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center font-mono text-[12px] text-mute">
          Keine Auswahl
        </div>
      ),
  };
  const actions: Record<PaneId, ReactNode> = {
    graph: (
      <>
        {popButton('graph')}
        {closeButton('graph')}
      </>
    ),
    table: (
      <>
        {popButton('table')}
        {closeButton('table')}
      </>
    ),
    card: closeButton('card'),
  };
  const shown = PANES.filter((pane) => layout.places[pane] !== undefined);

  return (
    <div
      ref={gridRef}
      className={`absolute inset-0 grid${preview === null ? '' : ' select-none'}`}
      style={{
        gridTemplateColumns: layout.columns,
        gridTemplateRows: layout.rows,
        gap: GAP,
        padding: PAD,
      }}
    >
      {/* Fester Schlüssel je Bereich: ein Platztausch verschiebt nur das Raster,
          der Graph bleibt montiert und behält seinen Ausschnitt. */}
      {shown.map((pane) => (
        <Pane
          key={pane}
          pane={pane}
          place={layout.places[pane]!}
          dragged={dragged}
          over={over}
          onDragStart={(id) => {
            // Zustand erst nach dem Start setzen — Chrome bricht den Drag sonst ab.
            dragTimer.current = window.setTimeout(() => setDragged(id), 0);
          }}
          onDragOver={(id) => {
            if (over !== id) setOver(id);
          }}
          onDrop={drop}
          onDragEnd={endDrag}
          actions={actions[pane]}
        >
          {content[pane]}
        </Pane>
      ))}
      {layout.colDivider && divider('col')}
      {layout.rowDivider && divider('row')}
      {shown.length === 0 && (
        <div className="flex items-center justify-center font-mono text-[12px] text-mute">
          Alle Bereiche geschlossen
        </div>
      )}
    </div>
  );
}
