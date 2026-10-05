// Tabelle als Fenster über dem Graphen: verschieben am Kopf, Größe am Griff
// unten links. Ersetzt die frühere Tabellenansicht mit Baum und
// Eigenschaften-Spalte — die Eigenschaften zeigt die Positionskarte.

import { useCallback, useRef } from 'react';
import { sidePanelSpace } from './SidePanel';
import { useDragResize } from '../common/useDragResize';
import { PositionsTable } from '../table/PositionsTable';
import { graphOverlayProps } from '../../lib/graph/overlay';
import {
  TABLE_MAX_WIDTH,
  TABLE_MIN_HEIGHT,
  TABLE_MIN_WIDTH,
  useViewer,
  useViewerDispatch,
  type CardPos,
  type PanelSize,
} from '../../state/viewer';

/** Abstand zum Rand des Canvas, den das Fenster auch aufgezogen frei lässt. */
const EDGE_GAP = 16;

export function TableWindow() {
  const {
    tree,
    selectedNode,
    view: { tableWindow, side, sideWidth },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);

  const setPos = useCallback(
    (pos: CardPos): void => dispatch({ type: 'tableWindowPos', pos }),
    [dispatch],
  );
  const setSize = useCallback(
    (size: PanelSize): void => dispatch({ type: 'tableWindowSize', size }),
    [dispatch],
  );
  const handles = useDragResize({
    ref,
    pos: tableWindow.pos,
    size: tableWindow.size,
    minWidth: TABLE_MIN_WIDTH,
    maxWidth: TABLE_MAX_WIDTH,
    minHeight: TABLE_MIN_HEIGHT,
    setPos,
    setSize,
  });

  if (!tableWindow.open || tree === null) return null;

  return (
    <section
      ref={ref}
      {...graphOverlayProps}
      aria-label="Tabelle — Fenster über dem Graphen"
      className="ov-window absolute z-[10] flex flex-col overflow-hidden"
      style={{
        right: tableWindow.pos.right,
        top: tableWindow.pos.top,
        width: tableWindow.size.width,
        height: tableWindow.size.height ?? undefined,
        // Bei offenem Seitenfenster bleibt links dessen Platz frei — das
        // Fenster wird schmaler statt es zu überdecken, aber nie unter die
        // Mindestbreite.
        maxWidth:
          side === null
            ? `calc(100% - ${tableWindow.pos.right + EDGE_GAP}px)`
            : `max(${TABLE_MIN_WIDTH}px, calc(100% - ${tableWindow.pos.right + sidePanelSpace(sideWidth)}px))`,
        maxHeight: `calc(100% - ${tableWindow.pos.top + EDGE_GAP}px)`,
      }}
    >
      <div
        {...handles.grip}
        title="Verschieben — ziehen"
        className="flex h-[38px] shrink-0 cursor-grab items-center gap-[10px] border-b border-line pl-[12px] pr-[6px] active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-[10px] tracking-[-2px] text-mute">
          ⋮⋮
        </span>
        <b className="font-sans text-[13px] font-semibold text-ink">Tabelle</b>
        <span className="flex-1" />
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => dispatch({ type: 'tableWindow', open: false })}
          aria-label="Tabelle schließen"
          className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <PositionsTable root={selectedNode ?? tree} />
      </div>
      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Tabelle in der Größe ändern"
        className="absolute bottom-0 left-0 z-[1] inline-flex h-[18px] w-[18px] cursor-sw-resize items-end justify-start border-none bg-transparent p-[3px] text-line2 hover:text-blue focus-visible:text-blue"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M0 3.5 L8.5 12 M0 8 L4 12" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>
    </section>
  );
}
