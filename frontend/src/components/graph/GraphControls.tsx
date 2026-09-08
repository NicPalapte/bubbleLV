// Schwebende Canvas-Steuerung: Zoom, Einpassen, Alles einklappen, Knotenzähler.
// Portiert aus `CanvasControls` in design/claude-design/lv-graph.jsx
// (Demo-Datensatz-Schalter entfällt — kein Fixture-Pfad im Produktivbetrieb).
//
// Frei verschiebbar (Griff links im Button-Riegel): Standardort ist unten
// rechts, wo er sich mit der schwebenden Auswahlkarte (SelectionCard) beißen
// kann, sobald die groß genug wird — der Nutzer schiebt die Steuerung dann
// selbst aus dem Weg statt dass sie fest verdeckt bleibt.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { formatCount } from '../../lib/format';

interface GraphControlsProps {
  zoom: number;
  nodeCount: number;
  renderCount: number;
  onFit: () => void;
  onReset: () => void;
  onZoom: (factor: number) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

const BUTTON =
  'inline-flex h-[28px] min-w-[28px] cursor-pointer select-none items-center justify-center border border-line bg-white px-[8px] font-mono text-[11px] leading-none text-ink';

const DEFAULT_POS = { right: 14, bottom: 14 };
/** Rand, der beim Ziehen sichtbar bleiben muss, damit der Griff erreichbar bleibt. */
const EDGE_MARGIN = 8;

export function GraphControls({
  zoom,
  nodeCount,
  renderCount,
  onFit,
  onReset,
  onZoom,
  onCollapseAll,
  onExpandAll,
}: GraphControlsProps) {
  const swallow = (event: { stopPropagation: () => void }): void => event.stopPropagation();

  const [pos, setPos] = useState(DEFAULT_POS);
  const drag = useRef({ on: false, x0: 0, y0: 0, right0: 0, bottom0: 0 });

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.x0;
      const dy = event.clientY - drag.current.y0;
      setPos({
        right: Math.min(
          Math.max(EDGE_MARGIN, drag.current.right0 - dx),
          window.innerWidth - EDGE_MARGIN,
        ),
        bottom: Math.min(
          Math.max(EDGE_MARGIN, drag.current.bottom0 - dy),
          window.innerHeight - EDGE_MARGIN,
        ),
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
    (event: ReactMouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      drag.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        right0: pos.right,
        bottom0: pos.bottom,
      };
    },
    [pos],
  );

  return (
    <div
      onMouseDown={swallow}
      onClick={swallow}
      className="absolute z-[1] flex flex-col items-end gap-[6px]"
      style={{ right: pos.right, bottom: pos.bottom }}
    >
      <div className="inline-flex gap-[6px] shadow-[0_4px_14px_rgba(26,37,51,0.08)]">
        <button
          type="button"
          title="Verschieben — ziehen"
          aria-label="Steuerung verschieben"
          onMouseDown={onGripMouseDown}
          className={`${BUTTON} cursor-grab active:cursor-grabbing`}
        >
          ⠿
        </button>
        <button type="button" title="Alles einklappen" className={BUTTON} onClick={onCollapseAll}>
          ⌄
        </button>
        <button type="button" title="Alles ausklappen" className={BUTTON} onClick={onExpandAll}>
          ⌃
        </button>
        <button type="button" title="Alles einpassen" className={BUTTON} onClick={onFit}>
          ⛶
        </button>
        <button type="button" title="Auszoomen" className={BUTTON} onClick={() => onZoom(1 / 1.25)}>
          −
        </button>
        <div className={`${BUTTON} min-w-[46px] cursor-default text-dim`}>
          {Math.round(zoom * 100)}%
        </div>
        <button type="button" title="Einzoomen" className={BUTTON} onClick={() => onZoom(1.25)}>
          +
        </button>
        <button
          type="button"
          title="Zurücksetzen"
          className={`${BUTTON} text-[9px] text-dim`}
          onClick={onReset}
        >
          1:1
        </button>
      </div>

      <div
        className="inline-flex items-center gap-[8px] border border-grid px-[10px] py-[4px] font-mono text-[9px] text-mute"
        style={{ background: 'var(--scrim)', boxShadow: 'var(--shadow-hairline)' }}
      >
        <span className="text-ink">{formatCount(renderCount)}</span>
        <span>/ {formatCount(nodeCount)} Knoten gezeichnet</span>
      </div>
    </div>
  );
}
