// Steuerung unten rechts am Graphen: Zoom und Einpassen, Hinweise ein/aus,
// Größe der Positionen (docs/decisions/0035-graph-gliederung.md). Liest und
// schreibt Hinweise und Größe direkt im Viewer-Zustand; Zoom gehört dem Graphen.

import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES, type SizeModeId } from '../../lib/graph/sizes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

interface GraphControlsProps {
  zoom: number;
  onFit: () => void;
  /** Auf die aktuelle Auswahl einpassen; ohne Auswahl ist der Knopf gesperrt. */
  onFitSelection?: () => void;
  onZoom: (factor: number) => void;
}

const BUTTON =
  'inline-flex h-[30px] min-w-[30px] cursor-pointer select-none items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent px-[8px] font-mono text-[11px] leading-none text-ink hover:bg-sunken';

export function GraphControls({ zoom, onFit, onFitSelection, onZoom }: GraphControlsProps) {
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
      className="absolute bottom-[16px] right-[16px] z-[8] flex flex-wrap items-center justify-end gap-[8px]"
    >
      <div className="ov-pill inline-flex items-center gap-[8px] py-[3px] pl-[12px] pr-[3px]">
        <span className="font-mono text-[10px] text-dim">Größe</span>
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

      {hints.size > 0 && (
        <button
          type="button"
          aria-pressed={showHints}
          title="Hinweis-Ringe und -Schilder im Graphen ein- oder ausblenden"
          onClick={() => dispatch({ type: 'graphHints', value: !showHints })}
          className={`ov-pill inline-flex h-[36px] cursor-pointer items-center px-[14px] font-mono text-[11px] ${
            showHints ? 'text-amberD' : 'text-mute line-through'
          }`}
        >
          ⚠ Hinweise
        </button>
      )}

      <div className="ov-pill inline-flex gap-[2px] p-[3px]">
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
          title="Alles einpassen"
          aria-label="Ganzes LV zeigen"
          className={BUTTON}
          onClick={onFit}
        >
          ⤢
        </button>
        <button
          type="button"
          title="Auf Auswahl zoomen (F, oder Doppelklick auf einen Kreis)"
          aria-label="Auf Auswahl zoomen"
          className={`${BUTTON} disabled:cursor-default disabled:opacity-40`}
          disabled={onFitSelection === undefined}
          onClick={onFitSelection}
        >
          ⌖
        </button>
      </div>
    </div>
  );
}
