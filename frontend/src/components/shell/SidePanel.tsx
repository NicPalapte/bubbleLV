// Seitenfenster links über dem Graphen: Überblick, Filter, Prüfung. Früher drei
// eigene Ansichten; jetzt Reiter, damit der Graph immer sichtbar bleibt
// (docs/decisions/0034-graph-als-hauptscreen.md).

import { useMemo } from 'react';
import { CheckCard } from '../overview/CheckCard';
import { FilterPanel } from '../filter/FilterPanel';
import { OverviewView } from '../overview/OverviewView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer, useViewerDispatch, type SidePanel as Panel } from '../../state/viewer';

/** Breite des Seitenfensters; das Tabellenfenster weicht ihr aus. */
export const SIDE_PANEL_WIDTH = 420;
/** Linker Rand plus Breite plus Abstand — so viel Platz belegt es links. */
export const SIDE_PANEL_SPACE = 16 + SIDE_PANEL_WIDTH + 16;

const TABS: ReadonlyArray<{ id: Panel; label: string }> = [
  { id: 'overview', label: 'Überblick' },
  { id: 'filter', label: 'Filter' },
  { id: 'check', label: 'Prüfung' },
];

export function SidePanel() {
  const { view, hints, matches } = useViewer();
  const dispatch = useViewerDispatch();
  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );
  const side = view.side;
  if (side === null) return null;

  return (
    <aside
      aria-label="Seitenfenster"
      style={{ width: SIDE_PANEL_WIDTH }}
      className="ov-glass absolute bottom-[64px] left-[16px] top-[88px] z-[9] flex max-w-[calc(100%-32px)] flex-col overflow-hidden"
    >
      <div
        role="tablist"
        className="flex shrink-0 items-center gap-[2px] border-b border-line p-[6px]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={side === tab.id}
            onClick={() => dispatch({ type: 'sidePanel', panel: tab.id })}
            className={`flex cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none px-[12px] py-[6px] font-mono text-[11px] ${
              side === tab.id
                ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                : 'bg-transparent text-dim hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'check' && hintCount > 0 && (
              <span className="rounded-[var(--r-pill)] bg-amberS px-[6px] text-[9.5px] text-amber">
                {formatCount(hintCount)}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => dispatch({ type: 'sidePanel', panel: null })}
          aria-label="Seitenfenster schließen"
          className="ml-auto inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>
      {/* Eigenes Netz: stürzt ein Reiter ab, bleibt der Graph bedienbar. */}
      <div role="tabpanel" className="relative min-h-0 flex-1">
        <ErrorBoundary key={side} bereich={side} dateiGeladen>
          {side === 'overview' && <OverviewView />}
          {side === 'filter' && <FilterPanel />}
          {side === 'check' && (
            <div className="absolute inset-0 overflow-auto px-[14px] py-[14px]">
              <CheckCard />
            </div>
          )}
        </ErrorBoundary>
      </div>
    </aside>
  );
}
