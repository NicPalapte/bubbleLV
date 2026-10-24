// Splitscreen (Entscheidungen 0064, 0070, 0072): Überblick, Prüfung, Graph,
// Tabelle, Dokument und Positionskarte stehen nebeneinander statt als Fenster
// übereinander — näher an der gewohnten Arbeitsweise in iTWO. Nahtlos: keine
// Karten, nur 1-px-Linien zwischen den Bereichen.
//
// Ziehen am Kopf eines Bereichs:
// - auf die Kopfzeile eines anderen Platzes ⇒ stapeln (Reiter),
// - auf die Fläche eines anderen Bereichs ⇒ beide tauschen den Platz,
// - auf die Fläche des eigenen Stapels ⇒ lösen, der Bereich bekommt einen freien Platz.
// Die Trennlinien sind ziehbar, Doppelklick setzt sie zurück.
//
// Jeder Bereich ist ein eigenes, absolut gesetztes Element mit festem Schlüssel:
// Tauschen und Stapeln verschieben nur Koordinaten, der Graph bleibt montiert und
// behält seinen Ausschnitt. Ein Reiter hinter einem anderen wird nur unsichtbar.
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
  PANES,
  PANE_LABEL,
  SLOTS,
  SPLIT_ROW_MAX,
  SPLIT_ROW_MIN,
  clampFrac,
  freeSlotFor,
  frontOf,
  moveBoundary,
  shownIn,
  slotOf,
  splitLayout,
  type ColumnPlace,
  type PaneId,
  type Rect,
  type RowColumn,
  type SlotId,
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

type Drop = { slot: SlotId; zone: 'stack' | 'swap' | 'detach' };
type Line =
  | { kind: 'col'; left: ColumnPlace; right: ColumnPlace }
  | { kind: 'row'; column: RowColumn; place: ColumnPlace };

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
  /** Lage der gezogenen Trennlinie (Anteil der Fläche), bis sie losgelassen wird. */
  const [preview, setPreview] = useState<{ key: string; at: number } | null>(null);

  const visible = (pane: PaneId): boolean =>
    !workspace.closed[pane] &&
    (pane === 'card' || pane === 'overview' || pane === 'check' || hosts[pane] === null);
  const layout = splitLayout(workspace.stacks, visible, workspace.widths, workspace.rows);
  const occupied = SLOTS.filter((slot) => layout.frames[slot] !== undefined);
  const cardNode = selectedPosition ?? selectedNode;

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

  /** Was ein Loslassen auf der Fläche von `slot` bewirkt; `null` = nichts. */
  const bodyZone = (slot: SlotId): Drop['zone'] | null => {
    if (dragged === null) return null;
    if (slotOf(workspace.stacks, dragged) !== slot) return 'swap';
    return freeSlotFor(workspace, dragged, visible) === null ? null : 'detach';
  };
  const dropOnBody = (slot: SlotId): void => {
    const zone = bodyZone(slot);
    const target = frontOf(workspace, slot, visible);
    if (dragged !== null && zone === 'swap' && target !== null) {
      dispatch({ type: 'swapPanes', a: dragged, b: target });
    } else if (dragged !== null && zone === 'detach') {
      const free = freeSlotFor(workspace, dragged, visible);
      if (free !== null) dispatch({ type: 'stackPane', pane: dragged, to: free });
    }
    endDrag();
  };
  const canStack = (slot: SlotId): boolean =>
    dragged !== null && slotOf(workspace.stacks, dragged) !== slot;

  // ── Trennlinien ──────────────────────────────────────────────────────────
  const lines: Array<{ key: string; line: Line }> = [
    ...layout.columns.slice(1).map((right, i) => ({
      key: `col-${layout.columns[i].id}`,
      line: { kind: 'col' as const, left: layout.columns[i], right },
    })),
    ...layout.rows.map((row) => ({
      key: `row-${row.id}`,
      line: { kind: 'row' as const, column: row.id, place: row },
    })),
  ];
  const widthsAt = (line: Line & { kind: 'col' }, at: number) =>
    moveBoundary(workspace.widths, layout.columns, line.left.id, line.right.id, at);
  /** Lage der Linie nach Begrenzung — so zeigt die Vorschau, wo sie landet. */
  const clampAt = (line: Line, at: number): number => {
    if (line.kind === 'row') return clampFrac(at, SPLIT_ROW_MIN, SPLIT_ROW_MAX);
    const widths = widthsAt(line, at);
    const total = layout.columns.reduce((sum, column) => sum + widths[column.id], 0);
    return line.left.x + widths[line.left.id] / total;
  };
  const currentAt = (line: Line): number =>
    line.kind === 'col' ? line.right.x : workspace.rows[line.column];
  const commit = (line: Line, at: number | null): void => {
    if (line.kind === 'col') {
      dispatch({ type: 'splitSize', widths: at === null ? null : widthsAt(line, at) });
    } else {
      dispatch({ type: 'splitSize', row: { column: line.column, frac: at } });
    }
  };
  const pointerAt = (line: Line, clientX: number, clientY: number): number | null => {
    const grid = gridRef.current;
    if (grid === null) return null;
    const rect = grid.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return clampAt(
      line,
      line.kind === 'col' ? (clientX - rect.left) / rect.width : (clientY - rect.top) / rect.height,
    );
  };

  const divider = (key: string, line: Line) => {
    const current = currentAt(line);
    const live = preview?.key === key;
    const at = live ? preview.at : current;
    const style: CSSProperties =
      line.kind === 'col'
        ? { left: `calc(${at * 100}% - ${GRIP / 2}px)`, top: 0, bottom: 0, width: GRIP }
        : {
            top: `calc(${at * 100}% - ${GRIP / 2}px)`,
            left: `${line.place.x * 100}%`,
            width: `${line.place.w * 100}%`,
            height: GRIP,
          };
    const onKeyDown = (event: KeyboardEvent): void => {
      const back = line.kind === 'col' ? 'ArrowLeft' : 'ArrowUp';
      const forth = line.kind === 'col' ? 'ArrowRight' : 'ArrowDown';
      if (event.key !== back && event.key !== forth) return;
      event.preventDefault();
      commit(line, clampAt(line, current + (event.key === forth ? KEY_STEP : -KEY_STEP)));
    };
    return (
      <div
        key={key}
        role="separator"
        tabIndex={0}
        aria-orientation={line.kind === 'col' ? 'vertical' : 'horizontal'}
        aria-label={line.kind === 'col' ? 'Breite der Bereiche' : 'Höhe der Bereiche'}
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
          line.kind === 'col' ? 'cursor-col-resize' : 'cursor-row-resize'
        }`}
        style={style}
      >
        <span
          aria-hidden="true"
          className={`${live ? 'bg-blue' : 'bg-transparent'} group-hover:bg-blue group-focus-visible:bg-blue ${
            line.kind === 'col' ? 'h-full w-[2px]' : 'h-[2px] w-full'
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
  const head = (slot: SlotId, rect: Rect) => {
    const shown = shownIn(workspace.stacks, slot, visible);
    const front = frontOf(workspace, slot, visible);
    if (front === null) return null;
    const target = canStack(slot);
    const hot = over?.slot === slot && over.zone === 'stack';
    const tabs = shown.length > 1;
    const switchByKey = (event: KeyboardEvent): void => {
      if ((event.target as HTMLElement).getAttribute('role') !== 'tab') return;
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = shown[(shown.indexOf(front) + step + shown.length) % shown.length];
      dispatch({ type: 'paneFront', pane: next });
      gridRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
    };
    return (
      <div
        key={`head-${slot}`}
        data-slot={slot}
        className={`absolute z-[3] flex items-stretch border-b border-line pr-[4px] ${
          hot ? 'bg-blueS shadow-[inset_0_0_0_2px_var(--blue)]' : 'bg-panel'
        }`}
        style={rectStyle(rect, 0, HEAD)}
        onDragOver={(event: DragEvent) => {
          if (!target) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          if (!hot) setOver({ slot, zone: 'stack' });
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          if (dragged !== null && target) dispatch({ type: 'stackPane', pane: dragged, to: slot });
          endDrag();
        }}
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
            const grip = (
              <span aria-hidden="true" className="text-[13px] leading-none text-mute">
                ⠿
              </span>
            );
            const common = {
              draggable: true,
              'data-tab': pane,
              'data-tour': pane === 'table' ? 'table' : undefined,
              title: 'Ziehen: auf eine Kopfzeile stapeln, auf eine Fläche tauschen',
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
                onClick={() => dispatch({ type: 'paneFront', pane })}
                {...common}
                className={`flex min-w-0 cursor-grab items-center gap-[7px] border-none px-[10px] font-display text-[13px] active:cursor-grabbing ${
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
                className={`flex min-w-0 flex-1 cursor-grab items-center gap-[7px] pl-[10px] active:cursor-grabbing ${
                  dragged === pane ? 'opacity-50' : ''
                }`}
              >
                {grip}
                <b className="truncate font-display text-[13px] font-semibold text-ink">{label}</b>
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-[2px]">
          {hot && <span className="px-[6px] font-mono text-[11px] text-blueD">stapeln</span>}
          {actions(front)}
        </div>
      </div>
    );
  };

  // ── Ablagefläche über einem Platz, solange gezogen wird ─────────────────
  const dropZone = (slot: SlotId, rect: Rect) => {
    const zone = bodyZone(slot);
    if (zone === null) return null;
    const hot = over?.slot === slot && over.zone === zone;
    return (
      <div
        key={`drop-${slot}`}
        data-drop={slot}
        className="absolute z-[5] p-[6px]"
        style={rectStyle(rect, HEAD)}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          if (!hot) setOver({ slot, zone });
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          dropOnBody(slot);
        }}
      >
        <div
          className={`flex h-full w-full items-center justify-center rounded-[var(--r-sm)] border-2 ${
            hot
              ? 'border-solid border-blue bg-[color-mix(in_srgb,var(--blueS)_45%,transparent)]'
              : 'border-dashed border-line2'
          }`}
        >
          {hot && (
            <span className="rounded-[var(--r-pill)] bg-surface px-[8px] py-[2px] font-mono text-[11px] text-blueD shadow-[var(--shadow-sm)]">
              {zone === 'swap' ? 'tauschen' : 'lösen'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className={`absolute inset-0 overflow-hidden bg-line${preview === null ? '' : ' select-none'}`}
    >
      {occupied.map((slot) => head(slot, layout.frames[slot]!))}
      {/* Fester Schlüssel je Bereich: Tauschen und Stapeln verschieben nur Koordinaten. */}
      {PANES.map((pane) => {
        const slot = slotOf(workspace.stacks, pane);
        const rect = layout.frames[slot];
        if (!visible(pane) || rect === undefined) return null;
        const front = frontOf(workspace, slot, visible) === pane;
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
      {dragged !== null && occupied.map((slot) => dropZone(slot, layout.frames[slot]!))}
      {lines.map(({ key, line }) => divider(key, line))}
      {occupied.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper font-mono text-[12px] text-mute">
          Alle Bereiche geschlossen
        </div>
      )}
    </div>
  );
}
