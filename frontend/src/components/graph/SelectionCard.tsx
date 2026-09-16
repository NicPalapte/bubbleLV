// Schwebende Auswahlkarte im Graphen (Issue #30): ersetzt den früheren Sprung
// in die Tabelle beim Klick auf eine Bubble. Zeigt Positionsdetails für eine
// Position bzw. Kennzahlen für einen Abschnitt/ein Los/das Projekt — fest über
// dem Canvas platziert statt an der Bubble verankert, damit sie unabhängig von
// Zoom, Pan und Clustering lesbar bleibt.
//
// Frei verschiebbar (Ziehgriff oben in der Karte): Standardort ist oben
// rechts, wo sie sich mit der Canvas-Steuerung (GraphControls, unten rechts)
// beißen kann, sobald sie groß genug wird — die Karte lässt sich dann selbst
// aus dem Weg schieben, statt fest an der Ecke zu kleben.
//
// Größe am Knopf unten links: die Karte hängt rechts oben, deshalb wächst sie
// nach links und unten. Die Breite liegt im Viewer-Zustand (`panelSize`) und
// gilt damit auch für das Eigenschaften-Panel der Tabellenansicht — eine
// Größe für alle Info-Panels, über den Ansichtswechsel hinweg.
//
// `data-graph-overlay` (lib/graph/overlay.ts): der Canvas darunter fängt Rad
// und Maustaste global für Zoom und Pan ab. Ohne die Markierung zoomt das Rad
// über der Karte den Graphen, statt ihren Inhalt zu scrollen (Issue #47).
//
// `ignoreDrag` an `useDismiss`: ein Pan auf dem Canvas endet fast immer
// außerhalb der Karte und darf sie trotzdem nicht schließen — nur ein
// tatsächlicher Klick daneben (oder Escape) hebt die Auswahl auf.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { NodeDetails } from '../common/NodeDetails';
import { PositionDetails } from '../common/PositionDetails';
import { useDismiss } from '../common/useDismiss';
import { graphOverlayProps } from '../../lib/graph/overlay';
import {
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  useViewer,
  useViewerDispatch,
  type PanelSize,
} from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface SelectionCardProps {
  node: LVNode;
  onClose: () => void;
}

const DEFAULT_POS = { right: 16, top: 16 };
/** Rand, der beim Ziehen sichtbar bleiben muss, damit der Griff erreichbar bleibt. */
const EDGE_MARGIN = 40;
/** Abstand zum Rand des Canvas, den die Karte auch aufgezogen frei lässt. */
const EDGE_GAP = 16;
/** Schrittweite, wenn die Größe über die Pfeiltasten geändert wird. */
const KEY_STEP = 16;

/** Begrenzt `value` auf [min, max]; ein zu kleines `max` gewinnt nicht gegen `min`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Platz, der der Karte nach links bzw. nach unten noch bleibt. Gemessen am
 * Canvas, auf dem sie liegt; in Umgebungen ohne Layout (Tests) fällt die
 * Rechnung auf das Fenstermaß zurück, damit die Grenzen sinnvoll bleiben.
 */
function roomFor(card: HTMLElement): { width: number; height: number } {
  const own = card.getBoundingClientRect();
  const canvas = card.offsetParent?.getBoundingClientRect() ?? null;
  const width = canvas === null ? 0 : own.right - canvas.left - EDGE_GAP;
  const height = canvas === null ? 0 : canvas.bottom - own.top - EDGE_GAP;
  // Ohne Layout (Tests) liefert der Browser lauter Nullen — dann gelten die
  // gemeinsamen Grenzen bzw. das Fenstermaß.
  return {
    width: width > PANEL_MIN_WIDTH ? Math.min(width, PANEL_MAX_WIDTH) : PANEL_MAX_WIDTH,
    height: height > PANEL_MIN_HEIGHT ? height : window.innerHeight - 2 * EDGE_GAP,
  };
}

export function SelectionCard({ node, onClose }: SelectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true });

  const { panelSize } = useViewer();
  const dispatch = useViewerDispatch();
  const [pos, setPos] = useState(DEFAULT_POS);
  const drag = useRef({ on: false, x0: 0, y0: 0, right0: 0, top0: 0, width0: panelSize.width });
  const resize = useRef({ on: false, x0: 0, y0: 0, width0: 0, height0: 0, maxW: 0, maxH: 0 });

  const setSize = useCallback(
    (size: PanelSize): void => dispatch({ type: 'panelSize', size }),
    [dispatch],
  );

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (resize.current.on) {
        const state = resize.current;
        // Rechte Kante bleibt stehen: nach links ziehen vergrößert die Breite.
        setSize({
          width: clamp(state.width0 - (event.clientX - state.x0), PANEL_MIN_WIDTH, state.maxW),
          height: clamp(state.height0 + (event.clientY - state.y0), PANEL_MIN_HEIGHT, state.maxH),
        });
        return;
      }
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.x0;
      const dy = event.clientY - drag.current.y0;
      setPos({
        right: Math.min(
          Math.max(EDGE_MARGIN - drag.current.width0, drag.current.right0 - dx),
          window.innerWidth - EDGE_MARGIN,
        ),
        top: Math.min(Math.max(8, drag.current.top0 + dy), window.innerHeight - EDGE_MARGIN),
      });
    };
    const up = (): void => {
      drag.current.on = false;
      resize.current.on = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [setSize]);

  const onGripMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.stopPropagation();
      drag.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        right0: pos.right,
        top0: pos.top,
        width0: panelSize.width,
      };
    },
    [pos, panelSize.width],
  );

  // Aus „auto" wird beim ersten Zug die gerade gerenderte Höhe — sonst springt
  // die Karte auf die Mindesthöhe, bevor sie mitwächst.
  const currentHeight = (): number =>
    panelSize.height ?? ref.current?.getBoundingClientRect().height ?? PANEL_MIN_HEIGHT;

  const onResizeMouseDown = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const card = ref.current;
    if (card === null) return;
    const room = roomFor(card);
    resize.current = {
      on: true,
      x0: event.clientX,
      y0: event.clientY,
      width0: panelSize.width,
      height0: currentHeight(),
      maxW: room.width,
      maxH: room.height,
    };
  };

  /** Pfeiltasten am Knopf: links/unten vergrößern, rechts/oben verkleinern. */
  const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    const dw = event.key === 'ArrowLeft' ? KEY_STEP : event.key === 'ArrowRight' ? -KEY_STEP : 0;
    const dh = event.key === 'ArrowDown' ? KEY_STEP : event.key === 'ArrowUp' ? -KEY_STEP : 0;
    if (dw === 0 && dh === 0) return;
    // Sonst wandert der Tastendruck weiter an den Canvas, der mit den
    // Pfeiltasten durch die Bubbles navigiert.
    event.preventDefault();
    event.stopPropagation();
    const card = ref.current;
    if (card === null) return;
    const room = roomFor(card);
    setSize({
      width: clamp(panelSize.width + dw, PANEL_MIN_WIDTH, room.width),
      height: clamp(currentHeight() + dh, PANEL_MIN_HEIGHT, room.height),
    });
  };

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      className="absolute z-[10] flex flex-col overflow-hidden border border-line2 bg-white"
      style={{
        right: pos.right,
        top: pos.top,
        width: panelSize.width,
        height: panelSize.height ?? undefined,
        maxHeight: `calc(100% - ${pos.top + EDGE_GAP}px)`,
        boxShadow: 'var(--shadow-popover)',
      }}
    >
      <div
        onMouseDown={onGripMouseDown}
        title="Verschieben — ziehen"
        aria-label="Karte verschieben"
        className="flex shrink-0 cursor-grab items-center justify-center border-b border-line2 bg-panel py-[3px] text-[10px] leading-none text-dim active:cursor-grabbing"
      >
        ⠿
      </div>
      {node.position !== null ? (
        <PositionDetails node={node} position={node.position} onClose={onClose} />
      ) : (
        <NodeDetails node={node} onClose={onClose} />
      )}
      <button
        type="button"
        onMouseDown={onResizeMouseDown}
        onKeyDown={onResizeKeyDown}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Info-Panel in der Größe ändern"
        className="absolute bottom-[5px] left-[5px] z-[1] inline-flex h-[16px] w-[16px] cursor-sw-resize items-center justify-center border border-line bg-white p-0 font-mono text-[9px] leading-none text-dim hover:border-blue hover:text-blue focus-visible:border-blue focus-visible:text-blue"
      >
        ⤢
      </button>
    </div>
  );
}
