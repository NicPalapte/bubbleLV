// Schwebende Canvas-Steuerung: Zoom, Einpassen, Alles einklappen, Knotenzähler.
// Portiert aus `CanvasControls` in design/claude-design/lv-graph.jsx
// (Demo-Datensatz-Schalter entfällt — kein Fixture-Pfad im Produktivbetrieb).

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

  return (
    <div
      onMouseDown={swallow}
      onClick={swallow}
      className="absolute bottom-[14px] right-[14px] z-[1] flex flex-col items-end gap-[6px]"
    >
      <div className="inline-flex gap-[6px] shadow-[0_4px_14px_rgba(26,37,51,0.08)]">
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
