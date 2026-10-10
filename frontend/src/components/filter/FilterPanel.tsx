// Reiter „Filter" im Seitenfenster: oben die Visualisierung, darunter die
// Merkmale. Löst die Filterleiste unter der Kopfleiste ab (Issue #80 hatte sie
// schon in eine eigene Zeile gedrängt); die aktiven Filter stehen als Chips in
// der Suche (layout/SearchField.tsx).

import { useState } from 'react';
import { CAP, DisplayControls } from './DisplayControls';
import { RangeSlider } from './RangeSlider';
import { ChipGroup, ValueChip } from '../ui/ValueChip';
import { StatusPill } from '../ui/StatusPill';
import { FACETS, facetOptionLabel, isFacetVisible, type Facet } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { EMPTY_SUMMARY } from '../../lib/index/summary';
import { countActiveFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** So viele Werte stehen zugeklappt da; der Rest auf „alle zeigen". */
const SHORT_LIST = 12;
const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

function Heading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-[10px] gap-y-[4px]">
      <h2 className="m-0 inline-flex items-center gap-[8px] font-sans text-[14px] font-bold tracking-[-0.2px] text-ink">
        {children}
      </h2>
      {right}
    </div>
  );
}

const RESET =
  'cursor-pointer border-none bg-transparent p-0 font-mono text-[10px] font-medium uppercase tracking-[0.7px] text-blueD';

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
    <section aria-label={facet.label} className="flex flex-col gap-[6px]">
      <div className="flex items-baseline justify-between">
        <span className={CAP}>{facet.label}</span>
        {active.size > 0 && (
          <button type="button" onClick={() => onChange(new Set())} className={RESET}>
            zurücksetzen
          </button>
        )}
      </div>
      <ChipGroup label={facet.label}>
        {shown.map(([value, count]) => {
          const label = facetOptionLabel(facet, value);
          return (
            <ValueChip
              key={value}
              on={active.has(value)}
              onClick={() => toggle(value)}
              title={label}
              count={count}
              leading={facet.id === 'status' ? <StatusPill status={value} dotOnly /> : undefined}
            >
              {label}
            </ValueChip>
          );
        })}
        {entries.length > shown.length && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className="h-[26px] cursor-pointer rounded-[var(--r-pill)] border border-dashed border-line2 bg-transparent px-[10px] font-mono text-[10.5px] text-dim hover:border-blue hover:text-blueD"
          >
            alle {formatCount(entries.length)}
          </button>
        )}
      </ChipGroup>
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
    <div className="absolute inset-0 flex flex-col gap-[18px] overflow-auto px-[16px] pb-[18px] pt-[14px]">
      <section className="flex flex-col gap-[14px]">
        <Heading>Visualisierung</Heading>
        <DisplayControls />
      </section>

      <section className="flex flex-col gap-[14px] border-t border-line pt-[18px]">
        <Heading
          right={
            activeCount > 0 ? (
              <button
                type="button"
                onClick={() => dispatch({ type: 'resetFilters' })}
                className={RESET}
              >
                alle zurücksetzen
              </button>
            ) : undefined
          }
        >
          Filter
          {activeCount > 0 && (
            <span className="rounded-[var(--r-pill)] bg-blueS px-[8px] py-[2px] font-mono text-[10px] font-medium text-blueD">
              {formatCount(activeCount)}
            </span>
          )}
        </Heading>
        <RangeSlider
          label="Menge"
          bounds={summary.quantity}
          active={filters.menge}
          onChange={(range) => dispatch({ type: 'setMenge', range })}
          renderHead={(isActive) => (
            <div className="flex items-baseline justify-between">
              <span className={CAP}>Menge</span>
              {isActive && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'setMenge', range: null })}
                  className={RESET}
                >
                  zurücksetzen
                </button>
              )}
            </div>
          )}
        />
        {visible.map((facet) => (
          <FacetSection
            key={facet.id}
            facet={facet}
            counts={summary.facets.get(facet.id) ?? EMPTY_COUNTS}
            active={filters.facets[facet.id] ?? EMPTY_SELECTION}
            onChange={(values) => dispatch({ type: 'setFacet', facetId: facet.id, values })}
          />
        ))}
      </section>
    </div>
  );
}
