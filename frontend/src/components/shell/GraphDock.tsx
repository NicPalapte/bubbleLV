// Leiste unten mittig: holt die Tabelle als Fenster über den Graphen.

import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function GraphDock() {
  const { lv, matches, view } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null || view.tableWindow.open) return null;

  const shown = matches.filtering ? (matches.counts.get(lv.tree.id) ?? 0) : lv.tree.positionCount;

  return (
    <div className="absolute bottom-[64px] left-1/2 z-[8] flex -translate-x-1/2 gap-[8px] lg:bottom-[16px]">
      <button
        type="button"
        onClick={() => dispatch({ type: 'tableWindow', open: true })}
        className="ov-pill inline-flex h-[36px] cursor-pointer items-center gap-[8px] whitespace-nowrap px-[14px] font-mono text-[11px] text-ink"
      >
        ▴ Tabelle <span className="text-mute">{formatCount(shown)}</span>
      </button>
    </div>
  );
}
