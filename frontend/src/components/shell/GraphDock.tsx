// Leiste unten mittig: holt Tabelle und Vergleich als Fenster über den Graphen.
// Ein Knopf steht nur da, solange sein Fenster zu ist.

import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const PILL =
  'ov-pill inline-flex h-[36px] cursor-pointer items-center gap-[8px] whitespace-nowrap px-[14px] font-mono text-[11px]';

export function GraphDock() {
  const { lv, matches, view, selection } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  const showTable = !view.tableWindow.open;
  const showCompare = selection.compare.length > 0 && !view.compareWindow.open;
  if (!showTable && !showCompare) return null;

  const shown = matches.filtering ? (matches.counts.get(lv.tree.id) ?? 0) : lv.tree.positionCount;

  return (
    <div className="absolute bottom-[64px] left-1/2 z-[8] flex -translate-x-1/2 gap-[8px] lg:bottom-[16px]">
      {showTable && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'tableWindow', open: true })}
          className={`${PILL} text-ink`}
        >
          ▴ Tabelle <span className="text-mute">{formatCount(shown)}</span>
        </button>
      )}
      {showCompare && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'compareWindow', open: true })}
          className={`${PILL} !border-blue text-blueD`}
        >
          ⇄ Vergleich <span>{formatCount(selection.compare.length)}</span>
        </button>
      )}
    </div>
  );
}
