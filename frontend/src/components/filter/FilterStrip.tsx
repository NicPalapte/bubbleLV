// Leiste der aktiven Filter: entfernbare Chips, Umschalter Hervorheben/Ausblenden,
// Zurücksetzen. Portiert aus `FilterStrip` in design/claude-design/lv-main.jsx.

import { Chip } from '../common/Chip';
import { FACETS, facetOptionLabel } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch, type HideMode } from '../../state/viewer';

interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}

const HIDE_MODES: ReadonlyArray<[HideMode, string]> = [
  ['dim', 'Hervorheben'],
  ['hide', 'Ausblenden'],
];

export function FilterStrip() {
  const { filters, hideMode } = useViewer();
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

  if (chips.length === 0) return null;

  return (
    <div className="relative z-[4] flex shrink-0 items-center gap-[8px] overflow-x-auto border-b border-line bg-white px-[16px] py-[7px]">
      <span className="shrink-0 font-mono text-[8px] tracking-[0.6px] text-mute">AKTIVE FILTER</span>
      <div className="flex flex-nowrap gap-[6px]">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-[6px] whitespace-nowrap border border-line2 bg-paper py-[3px] pl-[9px] pr-[6px] font-mono text-[10px] text-ink"
          >
            {chip.label}
            <span
              className="cursor-pointer text-[11px] leading-none text-mute"
              onClick={chip.remove}
              role="button"
              aria-label={`${chip.label} entfernen`}
            >
              ✕
            </span>
          </span>
        ))}
      </div>
      <span className="flex-1" />
      <span className="shrink-0 font-mono text-[8px] tracking-[0.6px] text-mute">NICHT-TREFFER</span>
      <div className="flex shrink-0 border border-line">
        {HIDE_MODES.map(([mode, label], index) => {
          const on = hideMode === mode;
          return (
            <span
              key={mode}
              onClick={() => dispatch({ type: 'hideMode', value: mode })}
              className="cursor-pointer px-[10px] py-[4px] font-mono text-[9.5px]"
              style={{
                background: on ? 'var(--blueS)' : 'var(--white)',
                color: on ? 'var(--blueD)' : 'var(--dim)',
                borderLeft: index > 0 ? '1px solid var(--line)' : 'none',
                fontWeight: on ? 500 : 400,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
      <Chip dashed onClick={() => dispatch({ type: 'resetFilters' })}>
        ✕ Zurücksetzen
      </Chip>
    </div>
  );
}
