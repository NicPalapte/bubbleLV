// Steuerung unten rechts am Graphen: Zoom und Einpassen, Hinweise ein/aus,
// Größe der Positionen (docs/decisions/0035-graph-gliederung.md). Liest und
// schreibt Hinweise und Größe direkt im Viewer-Zustand; Zoom gehört dem Graphen.

import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES, type SizeModeId } from '../../lib/graph/sizes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

interface GraphControlsProps {
  onFit: () => void;
  /** Auf die aktuelle Auswahl einpassen; ohne Auswahl ist der Knopf gesperrt. */
  onFitSelection?: () => void;
  onZoom: (factor: number) => void;
}

const ZOOM_BUTTON =
  'inline-flex h-[26px] w-[28px] cursor-pointer select-none items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent font-mono text-[14px] leading-none text-dim hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent';

/**
 * Eine Fläche wie im Mockup: Zoom | Hinweise | Größe. Der Zoomwert steht nicht
 * mehr da — er sagt beim Lesen eines LVs nichts.
 */
export function GraphControls({ onFit, onFitSelection, onZoom }: GraphControlsProps) {
  const {
    lv,
    hints,
    view: {
      graph: { sizeMode, showHints },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const swallow = (event: { stopPropagation: () => void }): void => event.stopPropagation();
  const priceless = (lv?.tree.totalPrice ?? 0) === 0;

  return (
    <div
      onMouseDown={swallow}
      onClick={swallow}
      onDoubleClick={swallow}
      className="ov-glass absolute bottom-[16px] right-[16px] z-[8] flex items-center gap-[8px] !rounded-[var(--r-md)] p-[6px]"
    >
      <div className="flex items-center gap-[2px] border-r border-line pr-[6px]">
        <button
          type="button"
          title="Auszoomen"
          className={ZOOM_BUTTON}
          onClick={() => onZoom(1 / 1.25)}
        >
          −
        </button>
        <button
          type="button"
          title="Einzoomen"
          className={ZOOM_BUTTON}
          onClick={() => onZoom(1.25)}
        >
          +
        </button>
        <button
          type="button"
          title="Alles einpassen"
          aria-label="Ganzes LV zeigen"
          className={ZOOM_BUTTON}
          onClick={onFit}
        >
          ⤢
        </button>
        <button
          type="button"
          title="Auf Auswahl zoomen (F, oder Doppelklick auf einen Kreis)"
          aria-label="Auf Auswahl zoomen"
          className={ZOOM_BUTTON}
          disabled={onFitSelection === undefined}
          onClick={onFitSelection}
        >
          ⌖
        </button>
      </div>

      {hints.size > 0 && (
        <button
          type="button"
          aria-pressed={showHints}
          title="Hinweis-Ringe und -Schilder im Graphen ein- oder ausblenden"
          onClick={() => dispatch({ type: 'graphHints', value: !showHints })}
          className={`h-[28px] cursor-pointer whitespace-nowrap rounded-[var(--r-sm)] border px-[10px] font-mono text-[10.5px] ${
            showHints
              ? 'border-amber bg-amberS text-amber'
              : 'border-line bg-sunken text-mute line-through'
          }`}
        >
          ⚠ Hinweise
        </button>
      )}

      <div className="flex items-center gap-[6px]">
        <span className="pl-[4px] font-mono text-[9px] uppercase tracking-[0.6px] text-mute">
          Größe
        </span>
        <SegmentedControl
          label="Größe der Positionen"
          options={SIZE_MODES.map((mode) => ({
            value: mode.id,
            label: mode.label,
            title: mode.id === 'cost' && priceless ? 'Diese Datei führt keine Preise.' : mode.title,
            disabled: mode.id === 'cost' && priceless,
          }))}
          value={sizeMode}
          onChange={(value) => dispatch({ type: 'sizeMode', value: value as SizeModeId })}
        />
      </div>
    </div>
  );
}
