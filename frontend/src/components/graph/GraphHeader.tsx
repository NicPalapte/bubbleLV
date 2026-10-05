// Was der Graph gerade zeigt, in zwei kleinen Teilen: oben mittig ein Hinweis,
// solange gefiltert wird; unten links die Legende der Ringe. Größe und
// Trefferansicht stehen seit dem neuen Hauptscreen im Seitenfenster unter
// „Filter" (filter/DisplayControls.tsx).

import { useMemo } from 'react';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

export function GraphHeader({ root }: { root: LVNode }) {
  const {
    view: {
      graph: { focus: focusMode },
    },
    matches,
    focus,
    hints,
  } = useViewer();

  const treffer = matches.counts.get(root.id) ?? 0;
  const keineTreffer = matches.filtering && treffer === 0;

  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );

  const note = keineTreffer
    ? `Keine Treffer${focusMode === 'isolate' ? ' — nichts zu isolieren' : ''}`
    : focus !== null
      ? `${formatCount(focus.hitCount)} Treffer in ${formatCount(focus.groupCount)} Gruppen`
      : null;

  return (
    <>
      {note !== null && (
        <div className="pointer-events-none absolute left-1/2 top-[16px] z-[7] flex -translate-x-1/2 gap-[8px]">
          <span className="ov-pill inline-flex h-[32px] items-center px-[14px] font-mono text-[11px] text-dim">
            {note}
          </span>
        </div>
      )}

      {hintCount > 0 && (
        <div
          aria-label="Legende"
          className="ov-pill absolute bottom-[16px] left-[16px] z-[7] hidden items-center gap-[14px] px-[14px] py-[8px] font-mono text-[10px] text-dim md:flex"
        >
          <span
            className="inline-flex items-center gap-[6px]"
            title="Ring an der Bubble: eine Prüfregel hat etwas gefunden. Sichtbar ab etwas Zoom."
          >
            <svg width="12" height="12" aria-hidden="true">
              <circle cx="6" cy="6" r="2.2" fill="var(--bub-position-line)" />
              <circle cx="6" cy="6" r="4.6" fill="none" stroke="var(--amber)" strokeWidth="1.2" />
            </svg>
            {formatCount(hintCount)} mit Hinweis
          </span>
        </div>
      )}
    </>
  );
}
