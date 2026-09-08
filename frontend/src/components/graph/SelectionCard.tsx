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
import type { LVNode } from '../../types/lvNode';

interface SelectionCardProps {
  node: LVNode;
  onClose: () => void;
}

const DEFAULT_POS = { right: 16, top: 16 };
const CARD_WIDTH = 360;
/** Rand, der beim Ziehen sichtbar bleiben muss, damit der Griff erreichbar bleibt. */
const EDGE_MARGIN = 40;

export function SelectionCard({ node, onClose }: SelectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true });

  const [pos, setPos] = useState(DEFAULT_POS);
  const drag = useRef({ on: false, x0: 0, y0: 0, right0: 0, top0: 0 });

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.x0;
      const dy = event.clientY - drag.current.y0;
      setPos({
        right: Math.min(
          Math.max(EDGE_MARGIN - CARD_WIDTH, drag.current.right0 - dx),
          window.innerWidth - EDGE_MARGIN,
        ),
        top: Math.min(Math.max(8, drag.current.top0 + dy), window.innerHeight - EDGE_MARGIN),
      });
    };
    const up = (): void => {
      drag.current.on = false;
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
      };
    },
    [pos],
  );

  return (
    <div
      ref={ref}
      className="absolute z-[10] flex flex-col overflow-hidden border border-line2 bg-white"
      style={{
        right: pos.right,
        top: pos.top,
        width: CARD_WIDTH,
        maxHeight: `calc(100% - ${pos.top + 16}px)`,
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
    </div>
  );
}
