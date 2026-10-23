// Begleitdokument (Entscheidung 0072) als Fenster über dem Graphen — dieselbe
// Mechanik wie die Tabelle (TableWindow.tsx): verschieben am Kopf, Größe am Griff
// unten rechts, ↗ in ein eigenes Browserfenster für den zweiten Bildschirm, ↙ dort
// holt es zurück. Das zweite Fenster rendert diese Komponente auch im
// Splitscreen — dort steht das Dokument sonst als Bereich in `SplitView`.

import { useCallback, useEffect, useRef } from 'react';
import { ExternalWindow } from '../common/ExternalWindow';
import { sidePanelSpace } from './SidePanel';
import { useWorkspace } from './WorkspaceProvider';
import { useDragResize } from '../common/useDragResize';
import { DocumentView } from '../docs/DocumentView';
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
const ICON_BUTTON =
  'inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

export function DocWindow() {
  const {
    tree,
    view: { docWindow, side, sideWidth, workspace },
  } = useViewer();
  const { split, hosts, blocked, popOut, dock } = useWorkspace();
  const popup = hosts.doc;
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);

  const setPos = useCallback(
    (pos: CardPos): void => dispatch({ type: 'docWindowPos', pos }),
    [dispatch],
  );
  const setSize = useCallback(
    (size: PanelSize): void => dispatch({ type: 'docWindowSize', size }),
    [dispatch],
  );
  const handles = useDragResize({
    ref,
    pos: docWindow.pos,
    size: docWindow.size,
    minWidth: TABLE_MIN_WIDTH,
    maxWidth: TABLE_MAX_WIDTH,
    minHeight: TABLE_MIN_HEIGHT,
    setPos,
    setSize,
    corner: 'right',
  });

  const shown = (split ? !workspace.closed.doc : docWindow.open) && tree !== null;
  // Dokument von woanders zu (neues LV): das zweite Fenster geht mit.
  useEffect(() => {
    if (!shown && popup !== null) dock('doc');
  }, [shown, popup, dock]);

  const detach = (): void => popOut('doc', docWindow.size.width);
  // Zweites Fenster von Hand zu: im Splitscreen kehrt das Dokument in seinen Bereich
  // zurück, im Fenster-Layout geht es zu.
  const closedByHand = useCallback((): void => {
    dock('doc');
    if (!split) dispatch({ type: 'docWindow', open: false });
  }, [dock, dispatch, split]);

  if (!shown) return null;

  if (popup !== null) {
    return (
      <ExternalWindow host={popup} onClosed={closedByHand}>
        <section aria-label="Dokument — eigenes Fenster" className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[38px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pl-[12px] pr-[6px]">
            <b className="font-display text-[14px] font-semibold text-ink">Dokument</b>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => dock('doc')}
              title="Zurück ins Hauptfenster"
              aria-label="Dokument zurück ins Hauptfenster"
              className={ICON_BUTTON}
            >
              ↙
            </button>
          </div>
          <DocumentView />
        </section>
      </ExternalWindow>
    );
  }
  // Im Splitscreen steht das Dokument als Bereich, nicht als Fenster.
  if (split) return null;

  return (
    <section
      ref={ref}
      {...graphOverlayProps}
      aria-label="Dokument — Fenster über dem Graphen"
      className="ov-window absolute z-[10] flex flex-col overflow-hidden"
      style={{
        right: docWindow.pos.right,
        top: docWindow.pos.top,
        width: docWindow.size.width,
        height: docWindow.size.height ?? undefined,
        // Bei offenem Seitenfenster bleibt links dessen Platz frei — das
        // Fenster wird schmaler statt es zu überdecken, aber nie unter die
        // Mindestbreite.
        maxWidth:
          side === null
            ? `calc(100% - ${docWindow.pos.right + EDGE_GAP}px)`
            : `max(${TABLE_MIN_WIDTH}px, calc(100% - ${docWindow.pos.right + sidePanelSpace(sideWidth)}px))`,
        maxHeight: `calc(100% - ${docWindow.pos.top + EDGE_GAP}px)`,
      }}
    >
      <div
        {...handles.grip}
        title="Verschieben — ziehen"
        className="flex h-[38px] shrink-0 cursor-grab items-center gap-[10px] border-b border-line pl-[12px] pr-[6px] active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-[11px] tracking-[-2px] text-mute">
          ⋮⋮
        </span>
        <b className="font-display text-[14px] font-semibold text-ink">Dokument</b>
        <span className="flex-1" />
        {blocked === 'doc' && (
          <span role="status" className="font-mono text-[11.5px] text-mute">
            Pop-up blockiert
          </span>
        )}
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={detach}
          title="In eigenem Fenster — z. B. auf dem zweiten Bildschirm"
          aria-label="Dokument in eigenem Fenster öffnen"
          className={ICON_BUTTON}
        >
          ↗
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => dispatch({ type: 'docWindow', open: false })}
          aria-label="Dokument schließen"
          className={ICON_BUTTON}
        >
          ✕
        </button>
      </div>
      <DocumentView />
      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Dokument in der Größe ändern"
        className="absolute bottom-0 right-0 z-[1] inline-flex h-[18px] w-[18px] cursor-se-resize items-end justify-end border-none bg-transparent p-[3px] text-line2 hover:text-blue focus-visible:text-blue"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M12 3.5 L3.5 12 M12 8 L8 12"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      </button>
    </section>
  );
}
