// Was der Graph gerade zeigt, in zwei kleinen Teilen: oben mittig ein Hinweis,
// wenn der Filter nichts trifft; unten links die Legende — Formen der
// Positionsarten, Hinweis-Ringe und die Gewerk-Farben der Punkte. Die Legende
// steht fest; Fenster weichen ihr aus, nicht umgekehrt.

import { useEffect, useMemo, useRef } from 'react';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** So viele Gewerke nennt die Legende; der Rest steht in der Positionskarte. */
const MAX_GEWERKE = 6;

function Dot({ shape }: { shape: 'normal' | 'bedarf' | 'wahl' | 'zulage' }) {
  return (
    <svg width="12" height="12" aria-hidden="true">
      {shape === 'bedarf' ? (
        <circle cx="6" cy="6" r="3.6" fill="var(--surface)" stroke="var(--dim)" strokeWidth="1.6" />
      ) : shape === 'wahl' ? (
        <rect x="3" y="3" width="6" height="6" fill="var(--dim)" transform="rotate(45 6 6)" />
      ) : (
        <circle cx="6" cy="6" r="4.4" fill="var(--dim)" />
      )}
      {shape === 'zulage' && <circle cx="6" cy="6" r="1.4" fill="var(--surface)" />}
    </svg>
  );
}

function Ring({ strong }: { strong: boolean }) {
  return (
    <svg width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="2.6" fill="var(--dim)" />
      <circle
        cx="7"
        cy="7"
        r="5.6"
        fill="none"
        stroke={strong ? 'var(--amber)' : 'var(--mute)'}
        strokeWidth="1.4"
        strokeDasharray={strong ? undefined : '2.5 1.5'}
      />
    </svg>
  );
}

export function GraphHeader({ root }: { root: LVNode }) {
  const {
    view: {
      graph: { showHints },
    },
    matches,
    hints,
    gewerkColors,
  } = useViewer();

  const keineTreffer = matches.filtering && (matches.counts.get(root.id) ?? 0) === 0;
  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );
  // Das Seitenfenster weicht der Legende aus: ihre Höhe (samt Abstand unten)
  // steht als --legend-space an der Bühne. Ausgeblendet (schmal) ist sie 0.
  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const legend = legendRef.current;
    const stage = legend?.closest('main');
    if (legend === null || stage === null || stage === undefined) return;
    const publish = (): void => {
      const height = legend.offsetHeight;
      stage.style.setProperty('--legend-space', `${height === 0 ? 0 : height + 16}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(legend);
    return () => {
      observer.disconnect();
      stage.style.removeProperty('--legend-space');
    };
  }, []);

  const gewerke = gewerkColors.entries.slice(0, MAX_GEWERKE);
  const more = gewerkColors.entries.length - gewerke.length;

  return (
    <>
      {keineTreffer && (
        <div className="pointer-events-none absolute left-1/2 top-[16px] z-[7] flex -translate-x-1/2 gap-[8px]">
          <span className="ov-pill inline-flex h-[32px] items-center px-[14px] font-mono text-[11px] text-dim">
            Keine Treffer
          </span>
        </div>
      )}

      {/* Endet links vom Tabellen-Knopf unten mittig (halbe Breite minus dessen Hälfte). */}
      <div
        ref={legendRef}
        aria-label="Legende"
        className="ov-glass absolute bottom-[16px] left-[16px] z-[7] hidden max-w-[calc(50%-100px)] flex-col gap-[6px] !rounded-[var(--r-md)] px-[12px] py-[8px] font-mono text-[10px] text-dim lg:flex"
      >
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
          <span className="inline-flex items-center gap-[5px]">
            <Dot shape="normal" />
            Normal
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <Dot shape="bedarf" />
            Bedarf
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <Dot shape="wahl" />
            Wahl
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <Dot shape="zulage" />
            Zulage
          </span>
          {showHints && hintCount > 0 && (
            <>
              <span className="inline-flex items-center gap-[5px]">
                <Ring strong />
                beachten
              </span>
              <span className="inline-flex items-center gap-[5px]">
                <Ring strong={false} />
                Hinweis
              </span>
              <span title="Positionen, an denen eine Prüfregel etwas gefunden hat">
                {formatCount(hintCount)} mit Hinweis
              </span>
            </>
          )}
        </div>
        {gewerke.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
            {gewerke.map(([name, color]) => (
              <span
                key={name}
                title={name}
                className="inline-flex max-w-[160px] items-center gap-[5px]"
              >
                <span
                  aria-hidden="true"
                  className="h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{
                    background: color.replace('var(--cat-', 'var(--dot-'),
                    boxShadow: 'inset 0 0 0 0.6px var(--dot-line)',
                  }}
                />
                <span className="truncate">{name}</span>
              </span>
            ))}
            {more > 0 && <span className="text-mute">+{formatCount(more)} Gewerke</span>}
          </div>
        )}
      </div>
    </>
  );
}
