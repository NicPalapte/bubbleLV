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
// Größe ziehbar am Griff unten links: die Karte hängt rechts oben, deshalb
// wächst sie nach links und unten. Langtexte brauchen mehr Platz, als 360 px
// hergeben — ohne Resize bleibt nur Scrollen.
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
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { NodeDetails } from '../common/NodeDetails';
import { PositionDetails } from '../common/PositionDetails';
import { useDismiss } from '../common/useDismiss';
import { graphOverlayProps } from '../../lib/graph/overlay';
import type { LVNode } from '../../types/lvNode';

interface SelectionCardProps {
  node: LVNode;
  onClose: () => void;
}

const DEFAULT_POS = { right: 16, top: 16 };
const CARD_WIDTH = 360;
/** Rand, der beim Ziehen sichtbar bleiben muss, damit der Griff erreichbar bleibt. */
const EDGE_MARGIN = 40;
/** Untergrenzen beim Vergrößern: darunter ist der Kopf nicht mehr lesbar. */
const MIN_WIDTH = 280;
const MIN_HEIGHT = 160;
/** Abstand zum Rand des Canvas, den die Karte auch aufgezogen frei lässt. */
const EDGE_GAP = 16;

interface Size {
  width: number;
  /** `null` = so hoch wie der Inhalt, gedeckelt durch `maxHeight`. */
  height: number | null;
}

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
  return {
    width: width > MIN_WIDTH ? width : window.innerWidth - 2 * EDGE_GAP,
    height: height > MIN_HEIGHT ? height : window.innerHeight - 2 * EDGE_GAP,
  };
}

export function SelectionCard({ node, onClose }: SelectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true });

  const [pos, setPos] = useState(DEFAULT_POS);
  const [size, setSize] = useState<Size>({ width: CARD_WIDTH, height: null });
  const drag = useRef({ on: false, x0: 0, y0: 0, right0: 0, top0: 0, width0: CARD_WIDTH });
  const resize = useRef({ on: false, x0: 0, y0: 0, width0: 0, height0: 0, maxW: 0, maxH: 0 });

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (resize.current.on) {
        const state = resize.current;
        // Rechte Kante bleibt stehen: nach links ziehen vergrößert die Breite.
        setSize({
          width: clamp(state.width0 - (event.clientX - state.x0), MIN_WIDTH, state.maxW),
          height: clamp(state.height0 + (event.clientY - state.y0), MIN_HEIGHT, state.maxH),
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
  }, []);

  const onGripMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.stopPropagation();
      drag.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        right0: pos.right,
        top0: pos.top,
        width0: size.width,
      };
    },
    [pos, size.width],
  );

  const onResizeMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      const card = ref.current;
      if (card === null) return;
      const room = roomFor(card);
      resize.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        width0: size.width,
        // Aus „auto" wird beim ersten Zug die gerade gerenderte Höhe — sonst
        // springt die Karte auf die Mindesthöhe, bevor sie mitwächst.
        height0: size.height ?? card.getBoundingClientRect().height,
        maxW: room.width,
        maxH: room.height,
      };
    },
    [size],
  );

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      className="absolute z-[10] flex flex-col overflow-hidden border border-line2 bg-white"
      style={{
        right: pos.right,
        top: pos.top,
        width: size.width,
        height: size.height ?? undefined,
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
      <div
        onMouseDown={onResizeMouseDown}
        role="separator"
        title="Größe ändern — ziehen"
        aria-label="Karte in der Größe ändern"
        className="absolute bottom-0 left-0 z-[1] h-[15px] w-[15px] cursor-sw-resize"
        style={{
          // Der Griff liegt über dem scrollenden Inhalt — ohne eigenen Grund
          // verschwimmen seine Striche im Text darunter.
          backgroundColor: 'rgb(255 255 255 / 0.9)',
          backgroundImage:
            'linear-gradient(45deg, transparent 0 38%, var(--mute) 38% 48%, transparent 48% 62%,' +
            ' var(--mute) 62% 72%, transparent 72%)',
        }}
      />
    </div>
  );
}
