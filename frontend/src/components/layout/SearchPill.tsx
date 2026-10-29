// Die eine Suchleiste: Suchfeld, aktive Filter als entfernbare Chips, „Nicht-Treffer"
// dimmen/ausblenden und „+ Filter". Steht in der Kopfleiste und in Graph und Tabelle im
// eigenen Browserfenster (Entscheidung 0039) — immer auf demselben Filterzustand.
// Sie durchsucht nur das LV; PDFs haben ihre eigene Suche (Entscheidung 0084).
// Der Schalter „Nicht-Treffer" sitzt hier, weil er für Suche und alle Filter gilt
// (docs/decisions/0058-nicht-treffer-in-der-suche.md). Er regelt auch, ob ein
// hervorgehobener Abschnitt die übrigen blass zeigt oder ausblendet, und erscheint
// deshalb auch dann (Entscheidung 0078).

import { useEffect, useRef, type ReactNode } from 'react';
import { useHostWindow } from '../common/hostWindow';
import { useSearchDraft } from '../common/useSearchDraft';
import { PROGRESS_INFO } from '../../lib/annotations';
import { FACETS, facetOptionLabel } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch, type HideMode } from '../../state/viewer';

/** So viele Filter-Chips passen in die Suche; der Rest steht als „+N". */
const MAX_CHIPS = 2;

interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}

const HIDE_MODES: ReadonlyArray<{ value: HideMode; label: string; icon: ReactNode }> = [
  {
    value: 'dim',
    label: 'dimmen',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
      </>
    ),
  },
  {
    value: 'hide',
    label: 'ausblenden',
    icon: <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />,
  },
];

/** Nicht-Treffer dimmen oder ausblenden — zwei Symbole, Text im Tooltip. */
function HideModeToggle() {
  const {
    filter: { hideMode },
  } = useViewer();
  const dispatch = useViewerDispatch();
  return (
    <div
      role="radiogroup"
      aria-label="Nicht-Treffer"
      data-tour="hide-mode"
      className="inline-flex shrink-0 gap-[2px] rounded-[var(--r-pill)] border border-line bg-sunken p-[2px]"
    >
      {HIDE_MODES.map((mode) => {
        const on = mode.value === hideMode;
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={mode.label}
            title={`Nicht-Treffer ${mode.label}`}
            onClick={() => dispatch({ type: 'hideMode', value: mode.value })}
            className={`inline-flex h-[20px] w-[24px] cursor-pointer items-center justify-center rounded-[var(--r-pill)] border-none p-0 ${
              on ? 'bg-accent-fill text-white' : 'bg-transparent text-dim hover:text-accent-ink'
            }`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              {mode.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/** Aktive Filter als Chips — auch die eigenen Marker. */
function useActiveChips(): ActiveChip[] {
  const {
    filter: { filters, notes },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const chips: ActiveChip[] = [];
  for (const facet of FACETS) {
    const selected = filters.facets[facet.id];
    if (selected === undefined || selected.size === 0) continue;
    const values =
      facet.sortValues === undefined
        ? [...selected].sort((a, b) => a.localeCompare(b, 'de'))
        : facet.sortValues([...selected]);
    for (const value of values) {
      chips.push({
        key: `${facet.id}:${value}`,
        label: facetOptionLabel(facet, value),
        remove: () => {
          const next = new Set(selected);
          next.delete(value);
          dispatch({ type: 'setFacet', facetId: facet.id, values: next });
        },
      });
    }
  }
  if (filters.menge !== null) {
    const [low, high] = filters.menge;
    chips.push({
      key: 'menge',
      label: `Menge ${formatCount(low)}–${formatCount(high)}`,
      remove: () => dispatch({ type: 'setMenge', range: null }),
    });
  }
  if (notes.progress !== null) {
    chips.push({
      key: 'progress',
      label: notes.progress === 'offen' ? 'Offen' : PROGRESS_INFO[notes.progress].label,
      remove: () => dispatch({ type: 'toggleProgressFilter', value: notes.progress ?? 'offen' }),
    });
  }
  if (notes.important) {
    chips.push({
      key: 'important',
      label: 'Wichtig',
      remove: () => dispatch({ type: 'toggleImportantFilter' }),
    });
  }
  if (notes.commented) {
    chips.push({
      key: 'commented',
      label: 'Mit Kommentar',
      remove: () => dispatch({ type: 'toggleCommentFilter' }),
    });
  }
  return chips;
}

export interface SearchPillProps {
  /** Filterleiste unter dieser Suche offen? Jedes Fenster hat seine eigene. */
  filterOpen: boolean;
  onFilterOpen: (open: boolean) => void;
  /** Breite und Lage in der umgebenden Zeile. */
  className?: string;
  /** Für die Tour: nur die Suche in der Kopfleiste. */
  tour?: boolean;
}

export function SearchPill({
  filterOpen,
  onFilterOpen,
  className = '',
  tour = false,
}: SearchPillProps) {
  const { view, active } = useViewer();
  const spotlighted = view.graph.layout === 'lv' && view.graph.spotlight !== null;
  const host = useHostWindow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, changeSearch] = useSearchDraft();
  const chips = useActiveChips();

  // "/" und Strg/Cmd + K holen die Suche — im Fenster, in dem sie steht. Strg K greift
  // auch in Eingabefeldern: wer es drückt, will suchen; "/" dagegen ist dort ein Zeichen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const strgK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      // Kein `instanceof`: im ausgelagerten Fenster sind das andere Klassen.
      const tag = (event.target as Element | null)?.tagName;
      const imFeld = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!strgK && (event.key !== '/' || imFeld)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    host.addEventListener('keydown', onKey);
    return () => host.removeEventListener('keydown', onKey);
  }, [host]);

  return (
    <div
      data-tour={tour ? 'search' : undefined}
      className={`flex h-[36px] min-w-0 items-center gap-[6px] overflow-hidden rounded-[var(--r-pill)] border border-line bg-surface pl-[12px] pr-[6px] shadow-[var(--shadow-sm)] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)] ${className}`}
    >
      <span className="text-[14px] text-mute" aria-hidden="true">
        ⌕
      </span>
      {chips.slice(0, MAX_CHIPS).map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-[24px] max-w-[160px] shrink-0 items-center gap-[6px] rounded-[var(--r-pill)] bg-accent-soft pl-[9px] pr-[6px] font-mono text-[11.5px] text-accent-ink"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent px-[3px] py-0 text-[11px] leading-none text-accent-ink opacity-70 hover:opacity-100"
            onClick={chip.remove}
            aria-label={`${chip.label} entfernen`}
          >
            ✕
          </button>
        </span>
      ))}
      {chips.length > MAX_CHIPS && (
        <button
          type="button"
          onClick={() => onFilterOpen(true)}
          className="shrink-0 cursor-pointer whitespace-nowrap border-none bg-transparent p-0 font-mono text-[10px] text-accent"
        >
          +{formatCount(chips.length - MAX_CHIPS)} weitere
        </button>
      )}
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => changeSearch(event.target.value)}
        placeholder="Positionen, OZ, Langtext durchsuchen"
        aria-label="Suche"
        className="min-w-[60px] flex-1 border-none bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-mute"
      />
      <span className="hidden rounded-[5px] border border-line bg-sunken px-[5px] py-[1px] font-mono text-[11px] text-mute [@media(pointer:fine)]:inline">
        /
      </span>
      {(active.filtering || spotlighted) && <HideModeToggle />}
      <button
        type="button"
        aria-expanded={filterOpen}
        data-tour={tour ? 'filter' : undefined}
        onClick={() => onFilterOpen(!filterOpen)}
        className={`inline-flex h-[26px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[var(--r-pill)] border px-[10px] font-mono text-[10.5px] ${
          filterOpen
            ? 'border-solid border-accent bg-accent-soft text-accent-ink'
            : 'border-dashed border-line2 bg-transparent text-dim hover:border-solid hover:border-accent hover:bg-accent-soft hover:text-accent-ink'
        }`}
      >
        + Filter
      </button>
    </div>
  );
}
