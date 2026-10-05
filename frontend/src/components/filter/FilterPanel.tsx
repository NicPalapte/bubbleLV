// Reiter „Filter" im Seitenfenster: oben die Darstellung, darunter die
// Merkmale. Löst die Filterleiste unter der Kopfleiste ab (Issue #80 hatte sie
// schon in eine eigene Zeile gedrängt); die aktiven Filter stehen als Chips in
// der Suche (layout/SearchField.tsx).

import { useState } from 'react';
import { DisplayControls } from './DisplayControls';
import { RangeButton } from './RangeButton';
import { PopoverRow } from '../ui/Popover';
import { StatusPill } from '../ui/StatusPill';
import { FACETS, facetOptionLabel, isFacetVisible, type Facet } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { EMPTY_SUMMARY } from '../../lib/index/summary';
import { countActiveFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** So viele Werte stehen zugeklappt da; der Rest auf „alle zeigen". */
const SHORT_LIST = 6;
const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

function Heading({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="m-0 font-sans text-[13px] font-semibold text-ink">{children}</h3>
      {right}
    </div>
  );
}

function FacetSection({
  facet,
  counts,
  active,
  onChange,
}: {
  facet: Facet;
  counts: ReadonlyMap<string, number>;
  active: ReadonlySet<string>;
  onChange: (values: Set<string>) => void;
}) {
  const [all, setAll] = useState(false);
  const entries = [...counts];
  // Gewählte Werte bleiben sichtbar, auch wenn sie hinter der Kurzliste stünden.
  const shown = all
    ? entries
    : entries.filter(([value], index) => index < SHORT_LIST || active.has(value));

  const toggle = (value: string): void => {
    const next = new Set(active);
    if (!next.delete(value)) next.add(value);
    onChange(next);
  };

  return (
    <section aria-label={facet.label} className="flex flex-col gap-[2px]">
      <div className="flex items-center justify-between px-[2px] pb-[2px]">
        <span className="font-mono text-[10px] text-dim">{facet.label}</span>
        {active.size > 0 && (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[10px] text-blue"
          >
            zurücksetzen
          </button>
        )}
      </div>
      {shown.map(([value, count]) => {
        const label = facetOptionLabel(facet, value);
        return (
          <PopoverRow
            key={value}
            on={active.has(value)}
            onClick={() => toggle(value)}
            checkbox
            title={label}
            leading={facet.id === 'status' ? <StatusPill status={value} dotOnly /> : undefined}
            trailing={<span className="text-mute">{formatCount(count)}</span>}
          >
            <span className="truncate">{label}</span>
          </PopoverRow>
        );
      })}
      {entries.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="cursor-pointer self-start border-none bg-transparent px-[10px] py-[2px] font-mono text-[10px] text-blue"
        >
          alle {formatCount(entries.length)} zeigen
        </button>
      )}
    </section>
  );
}

export function FilterPanel() {
  const {
    lv,
    filter: { filters },
  } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  const summary = lv.summary ?? EMPTY_SUMMARY;
  const activeCount = countActiveFilters(filters);
  const visible = FACETS.filter((facet) =>
    isFacetVisible(facet, summary.facets.get(facet.id), (filters.facets[facet.id]?.size ?? 0) > 0),
  );

  return (
    <div className="absolute inset-0 overflow-auto px-[14px] py-[14px]">
      <div className="flex flex-col gap-[12px]">
        <Heading>Darstellung</Heading>
        <DisplayControls />
      </div>

      <hr className="my-[16px] border-0 border-t border-line" />

      <div className="flex flex-col gap-[14px]">
        <Heading
          right={
            activeCount > 0 ? (
              <button
                type="button"
                onClick={() => dispatch({ type: 'resetFilters' })}
                className="cursor-pointer border-none bg-transparent p-0 font-mono text-[10px] text-blue"
              >
                alle zurücksetzen
              </button>
            ) : undefined
          }
        >
          Filter
        </Heading>
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[10px] text-dim">Menge</span>
          <RangeButton
            label="Menge"
            bounds={summary.quantity}
            active={filters.menge}
            onChange={(range) => dispatch({ type: 'setMenge', range })}
          />
        </div>
        {visible.map((facet) => (
          <FacetSection
            key={facet.id}
            facet={facet}
            counts={summary.facets.get(facet.id) ?? EMPTY_COUNTS}
            active={filters.facets[facet.id] ?? EMPTY_SELECTION}
            onChange={(values) => dispatch({ type: 'setFacet', facetId: facet.id, values })}
          />
        ))}
      </div>
    </div>
  );
}
