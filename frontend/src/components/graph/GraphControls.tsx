// Schwebende Canvas-Steuerung: Zoom, Einpassen, Alles ein- und ausklappen.
// Portiert aus `CanvasControls` in design/claude-design/lv-graph.jsx
// (Demo-Datensatz-Schalter entfällt — kein Fixture-Pfad im Produktivbetrieb).

interface GraphControlsProps {
  zoom: number;
  onFit: () => void;
  /** Auf die aktuelle Auswahl einpassen; ohne Auswahl ist der Knopf gesperrt. */
  onFitSelection?: () => void;
  onReset: () => void;
  onZoom: (factor: number) => void;
  /** Alles auf-/zuklappen wirkt auf den LV-Baum; in der Isolation entfällt es. */
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
}

const BUTTON =
  'inline-flex h-[30px] min-w-[30px] cursor-pointer select-none items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent px-[8px] font-mono text-[11px] leading-none text-ink hover:bg-sunken';

export function GraphControls({
  zoom,
  onFit,
  onFitSelection,
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
      className="absolute bottom-[16px] right-[16px] z-[1] flex flex-col items-end gap-[6px]"
    >
      <div className="ov-pill inline-flex gap-[2px] p-[3px]">
        {onCollapseAll !== undefined && (
          <button type="button" title="Alles einklappen" className={BUTTON} onClick={onCollapseAll}>
            ⌄
          </button>
        )}
        {onExpandAll !== undefined && (
          <button type="button" title="Alles ausklappen" className={BUTTON} onClick={onExpandAll}>
            ⌃
          </button>
        )}
        <button type="button" title="Alles einpassen" className={BUTTON} onClick={onFit}>
          ⛶
        </button>
        <button
          type="button"
          title="Auf Auswahl zoomen (F, oder Doppelklick auf eine Bubble)"
          aria-label="Auf Auswahl zoomen"
          className={`${BUTTON} disabled:cursor-default disabled:opacity-40`}
          disabled={onFitSelection === undefined}
          onClick={onFitSelection}
        >
          ⌖
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

    </div>
  );
}
