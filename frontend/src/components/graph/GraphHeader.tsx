// Was der Graph gerade zeigt, in zwei kleinen Teilen: oben mittig ein Hinweis,
// solange gefiltert oder eine Ähnlichkeitsgruppe hervorgehoben ist; unten links
// die Legende der Ringe. Größe und Trefferansicht stehen seit dem neuen
// Hauptscreen im Seitenfenster unter „Filter" (filter/DisplayControls.tsx).

import { useMemo } from 'react';
import { formatCount, truncate } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

export function GraphHeader({ root }: { root: LVNode }) {
  const {
    view: {
      graph: { focus: focusMode, highlightCluster },
    },
    matches,
    focus,
    hints,
    clusters,
    lv,
  } = useViewer();
  const dispatch = useViewerDispatch();

  // Filter ohne Treffer: dann gibt es nichts zu isolieren, und der Graph zeigt
  // weiter das ganze LV — das muss dastehen.
  const treffer = matches.counts.get(root.id) ?? 0;
  const keineTreffer = matches.filtering && treffer === 0;

  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );
  const gruppiert = useMemo(
    () => countInFilter(clusters.keys(), clusters.size, matches),
    [clusters, matches],
  );

  // Hervorgehobene Ähnlichkeitsgruppe (WP-R, R2): wer sie eingeschaltet hat,
  // muss sie auch wieder loswerden — sonst bliebe nur Escape.
  const hervorgehoben =
    highlightCluster === null
      ? null
      : (lv?.relations.clusters.find((cluster) => cluster.id === highlightCluster) ?? null);
  const sichtbareMitglieder =
    hervorgehoben === null
      ? 0
      : countInFilter(hervorgehoben.positionIds, hervorgehoben.positionIds.length, matches);

  const note = keineTreffer
    ? `Keine Treffer${focusMode === 'isolate' ? ' — nichts zu isolieren' : ''}`
    : focus !== null
      ? `${formatCount(focus.hitCount)} Treffer in ${formatCount(focus.groupCount)} Gruppen`
      : null;

  return (
    <>
      {(note !== null || hervorgehoben !== null) && (
        <div className="pointer-events-none absolute left-1/2 top-[16px] z-[7] flex -translate-x-1/2 gap-[8px]">
          {note !== null && (
            <span className="ov-pill inline-flex h-[32px] items-center px-[14px] font-mono text-[11px] text-dim">
              {note}
            </span>
          )}
          {hervorgehoben !== null && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'highlightCluster', id: null })}
              title="Hervorhebung aufheben (oder Escape)"
              className="ov-pill pointer-events-auto inline-flex h-[32px] max-w-[320px] cursor-pointer items-center gap-[6px] px-[14px] font-mono text-[11px] text-ink hover:text-blue"
            >
              <span className="truncate">
                Ähnliche: {truncate(hervorgehoben.label, 28)} · {formatCount(sichtbareMitglieder)}
                {sichtbareMitglieder < hervorgehoben.positionIds.length &&
                  ` von ${formatCount(hervorgehoben.positionIds.length)}`}
              </span>
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
      )}

      {(hintCount > 0 || gruppiert > 0) && (
        <div
          aria-label="Legende"
          className="ov-pill absolute bottom-[16px] left-[16px] z-[7] hidden items-center md:flex gap-[14px] px-[14px] py-[8px] font-mono text-[10px] text-dim"
        >
          {hintCount > 0 && (
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
          )}
          {hervorgehoben === null && gruppiert > 0 && (
            <span
              className="inline-flex items-center gap-[6px]"
              title="Gestrichelter Ring: zu dieser Position gibt es ähnliche. Sichtbar ab etwas Zoom."
            >
              <svg width="12" height="12" aria-hidden="true">
                <circle cx="6" cy="6" r="2.2" fill="var(--bub-position-line)" />
                <circle
                  cx="6"
                  cy="6"
                  r="4.8"
                  fill="none"
                  stroke="var(--line2)"
                  strokeWidth="1"
                  strokeDasharray="1.5 2.5"
                />
              </svg>
              {formatCount(gruppiert)} mit Ähnlichen
            </span>
          )}
        </div>
      )}
    </>
  );
}
