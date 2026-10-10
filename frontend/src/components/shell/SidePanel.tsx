// Seitenfenster links über dem Graphen: Überblick, Filter, Prüfung. Früher drei
// eigene Ansichten; jetzt Reiter, damit der Graph immer sichtbar bleibt
// (docs/decisions/0034-graph-als-hauptscreen.md).

import { useMemo, useRef } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { CheckCard } from '../overview/CheckCard';
import { FilterPanel } from '../filter/FilterPanel';
import { OverviewView } from '../overview/OverviewView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { SIDE_WIDTH_MAX, SIDE_WIDTH_MIN } from '../../state/viewState';
import { useViewer, useViewerDispatch, type SidePanel as Panel } from '../../state/viewer';

/** Linker Rand plus Breite plus Abstand — so viel Platz belegt das Fenster links. */
export function sidePanelSpace(width: number): number {
  return 16 + width + 16;
}

/** Schrittweite, wenn die Breite über die Pfeiltasten geändert wird. */
const KEY_STEP = 16;

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
  const drag = useRef<{ x0: number; w0: number } | null>(null);
  const side = view.side;
  if (side === null) return null;
  const width = view.sideWidth;

  const startResize = (event: MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    drag.current = { x0: event.clientX, w0: width };
    const move = (e: globalThis.MouseEvent): void => {
      if (drag.current === null) return;
      dispatch({ type: 'sideWidth', width: drag.current.w0 + e.clientX - drag.current.x0 });
    };
    const up = (): void => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  const resizeByKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.key === 'ArrowRight' ? KEY_STEP : event.key === 'ArrowLeft' ? -KEY_STEP : 0;
    if (step === 0) return;
    event.preventDefault();
    dispatch({ type: 'sideWidth', width: width + step });
  };

  const switchTabByKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = TABS.findIndex((tab) => tab.id === side);
    let next: number;
    if (event.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    // Nur auf einem Reiter, nicht auf dem Schließen-Knopf in derselben Leiste.
    if ((event.target as HTMLElement).getAttribute('role') !== 'tab') return;
    event.preventDefault();
    const tab = TABS[next];
    dispatch({ type: 'sidePanel', panel: tab.id });
    event.currentTarget.querySelector<HTMLElement>(`#side-tab-${tab.id}`)?.focus();
  };

  return (
    <aside
      aria-label="Seitenfenster"
      // Unten weicht es der Legende aus; ihre Höhe setzt GraphHeader als
      // --legend-space. Ohne Legende (schmal) bleibt Platz für Leiste und Steuerung.
      style={{ width, bottom: 'max(64px, calc(var(--legend-space, 0px) + 28px))' }}
      className="ov-glass absolute left-[16px] top-[88px] z-[9] flex max-w-[calc(100%-32px)] flex-col overflow-hidden"
    >
      <div
        role="tablist"
        aria-label="Reiter des Seitenfensters"
        onKeyDown={switchTabByKey}
        className="flex shrink-0 items-center gap-[2px] border-b border-line p-[6px]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`side-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={side === tab.id}
            aria-controls="side-tabpanel"
            // Roving tabindex: Tab springt in die Leiste, Pfeiltasten wechseln
            // den Reiter (WAI-ARIA Tabs, Issue #105).
            tabIndex={side === tab.id ? 0 : -1}
            onClick={() => dispatch({ type: 'sidePanel', panel: tab.id })}
            className={`flex h-[30px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-[var(--r-sm)] border-none px-[8px] font-mono text-[11px] ${
              side === tab.id
                ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                : 'bg-transparent text-dim hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'check' && hintCount > 0 && (
              <span className="rounded-[var(--r-pill)] bg-amberS px-[6px] text-[10px] text-amberD">
                {formatCount(hintCount)}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => dispatch({ type: 'sidePanel', panel: null })}
          aria-label="Seitenfenster schließen"
          className="ml-[4px] inline-flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>
      {/* Eigenes Netz: stürzt ein Reiter ab, bleibt der Graph bedienbar. */}
      <div
        role="tabpanel"
        id="side-tabpanel"
        aria-labelledby={`side-tab-${side}`}
        className="relative min-h-0 flex-1"
      >
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
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Breite des Seitenfensters"
        aria-valuenow={width}
        aria-valuemin={SIDE_WIDTH_MIN}
        aria-valuemax={SIDE_WIDTH_MAX}
        tabIndex={0}
        title="Breite ändern — ziehen"
        onMouseDown={startResize}
        onKeyDown={resizeByKey}
        className="absolute bottom-0 right-0 top-0 w-[8px] cursor-ew-resize hover:bg-[var(--blueS)] focus-visible:bg-[var(--blueS)] focus-visible:outline-none"
      />
    </aside>
  );
}
