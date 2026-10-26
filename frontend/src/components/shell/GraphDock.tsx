// Knopf unten mittig: holt den Vergleich als Fenster über die Arbeitsfläche, solange
// er Positionen hat und zu ist. Tabelle und Dokument sind Bereiche im Splitscreen.

import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const PILL =
  'ov-pill inline-flex h-[36px] cursor-pointer items-center gap-[8px] whitespace-nowrap px-[14px] font-mono text-[12px]';

export function GraphDock() {
  const { lv, view, selection } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null || selection.compare.length === 0 || view.compareWindow.open) return null;

  return (
    <div className="absolute bottom-[64px] left-1/2 z-[8] flex -translate-x-1/2 gap-[8px] lg:bottom-[16px]">
      <button
        type="button"
        onClick={() => dispatch({ type: 'compareWindow', open: true })}
        data-tour="compare"
        className={`${PILL} !border-accent text-accent-ink`}
      >
        ⇄ Vergleich <span>{formatCount(selection.compare.length)}</span>
      </button>
    </div>
  );
}
