// Steuerung unten rechts am Graphen, in einer Zeile mit der Legende (GraphHeader): Zoom und Einpassen, Hinweise ein/aus und die
// Darstellung — Größe der Positionen und Gliederung (docs/decisions/0035-graph-
// gliederung.md). Die Darstellung ist eingeklappt; der Knopf nennt den Stand und
// klappt sie darüber auf (Issue #154: „Visualisierung" kam aus dem Filterfenster).
// Liest und schreibt direkt im Viewer-Zustand; Zoom gehört dem Graphen.

import { DisplayControls, Row } from '../filter/DisplayControls';
import { SegmentedControl } from '@conocto/design';
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
 * Eine Fläche wie im Mockup: Zoom | Hinweise | Darstellung. Der Zoomwert steht nicht
 * mehr da — er sagt beim Lesen eines LVs nichts.
 */
export function GraphControls({ onFit, onFitSelection, onZoom }: GraphControlsProps) {
  const {
    lv,
    hints,
    view: {
      graph: { sizeMode, showHints, layout },
      graphSettings,
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const swallow = (event: { stopPropagation: () => void }): void => event.stopPropagation();
  const priceless = (lv?.tree.totalPrice ?? 0) === 0;
  const summary = `${layout === 'matrix' ? 'Matrix' : 'nach LV'} · ${
    SIZE_MODES.find((mode) => mode.id === sizeMode)?.label ?? ''
  }`;

  return (
    <div
      onMouseDown={swallow}
      onClick={swallow}
      onDoubleClick={swallow}
      className="ov-glass pointer-events-auto relative ml-auto flex shrink-0 items-center gap-[8px] !rounded-[var(--r-md)] p-[6px]"
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
          data-tour="hints"
          title="Hinweis-Ringe und -Schilder im Graphen ein- oder ausblenden"
          onClick={() => dispatch({ type: 'graphHints', value: !showHints })}
          className={`h-[28px] cursor-pointer whitespace-nowrap rounded-[var(--r-sm)] border px-[10px] font-mono text-[11.5px] ${
            showHints
              ? 'border-amber bg-amberS text-amberD'
              : 'border-line bg-sunken text-mute line-through'
          }`}
        >
          ⚠ Hinweise
        </button>
      )}

      <button
        type="button"
        aria-expanded={graphSettings}
        aria-controls="graph-settings"
        title="Darstellung: Größe und Gliederung"
        onClick={() => dispatch({ type: 'graphSettings', open: !graphSettings })}
        className={`inline-flex h-[28px] cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-[var(--r-sm)] border px-[9px] font-mono text-[11.5px] ${
          graphSettings
            ? 'border-accent bg-accent-soft text-accent-ink'
            : 'border-line bg-surface text-dim hover:border-line2 hover:text-ink'
        }`}
      >
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
          <path d="M1 3h12M1 9h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle
            cx="5"
            cy="3"
            r="1.8"
            fill="var(--surface)"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle
            cx="9"
            cy="9"
            r="1.8"
            fill="var(--surface)"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        {summary}
      </button>

      {graphSettings && (
        <div
          id="graph-settings"
          role="group"
          aria-label="Darstellung"
          className="ov-glass absolute bottom-[calc(100%+8px)] right-0 flex max-h-[min(420px,60vh)] w-[300px] max-w-[calc(100vw-32px)] flex-col gap-[12px] overflow-auto !rounded-[var(--r-md)] p-[12px]"
        >
          <Row label="Größe">
            <SegmentedControl
              label="Größe der Positionen"
              options={SIZE_MODES.map((mode) => ({
                value: mode.id,
                label: mode.label,
                title:
                  mode.id === 'cost' && priceless ? 'Diese Datei führt keine Preise.' : mode.title,
                disabled: mode.id === 'cost' && priceless,
              }))}
              value={sizeMode}
              onChange={(value) => dispatch({ type: 'sizeMode', value: value as SizeModeId })}
            />
          </Row>
          <DisplayControls />
        </div>
      )}
    </div>
  );
}
