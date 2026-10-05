// Leiste unten mittig: holt Tabelle und Vergleich als Fenster über den Graphen.

import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const PILL =
  'ov-pill inline-flex h-[36px] cursor-pointer items-center gap-[8px] px-[14px] font-mono text-[11px] whitespace-nowrap';

export function GraphDock() {
  const { lv, matches, comparePositions, view } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  const shown = matches.filtering ? (matches.counts.get(lv.tree.id) ?? 0) : lv.tree.positionCount;
  const compared = comparePositions.length;

  return (
    <div className="absolute bottom-[64px] left-1/2 z-[8] flex -translate-x-1/2 gap-[8px] md:bottom-[16px]">
      {!view.tableWindow.open && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'tableWindow', open: true })}
          className={`${PILL} text-ink`}
        >
          ▴ Tabelle <span className="text-mute">{formatCount(shown)}</span>
        </button>
      )}
      {/* Weggeklicktes Vergleichsfenster: die Positionen stehen weiter darin. */}
      {!view.compare.windowOpen && compared > 0 && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'compareWindow', open: true })}
          className={`${PILL} text-blueD`}
          style={{ borderColor: 'var(--blue)' }}
        >
          ⇄ Vergleich <span>{formatCount(compared)}</span>
        </button>
      )}
    </div>
  );
}
