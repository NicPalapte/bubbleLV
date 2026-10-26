// Filterleiste unter der Kopfleiste (Issue #154): „+ Filter" klappt sie auf. Ein Chip
// je Gruppe öffnet eine Auswahlliste. „Material" fasst das Material und seine Merkmale
// zusammen (Material → Beton → Art, Druckfestigkeit …), „Status" Fortschritt, „Wichtig"
// und Kommentare. Nur Oberfläche: Filter und matchPos sind dieselben wie vorher, die
// aktiven Filter stehen weiter als Chips in der Suche (TopBar).
//
// Escape schließt zuerst eine offene Liste, dann — wenn der Fokus in der Leiste
// steht — die Leiste. Sonst gehört Escape weiter dem Hauptscreen (Auswahl aufheben).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RangeSlider } from './RangeSlider';
import { useDismiss } from '../common/useDismiss';
import { commentedIds, markerCounts, PROGRESS, PROGRESS_INFO } from '../../lib/annotations';
import { FACETS, facetOptionLabel, type Facet } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { countActiveFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

const CHIP =
  'inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-[var(--r-pill)] border px-[12px] font-mono text-[11.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

const OPTION =
  'flex min-h-[30px] cursor-pointer items-center gap-[8px] rounded-[var(--r-sm)] px-[8px] font-mono text-[12px] text-ink hover:bg-sunken';

const HEADING =
  'px-[8px] pb-[2px] pt-[8px] font-mono text-[9.5px] uppercase tracking-[0.7px] text-mute first:pt-[2px]';

/**
 * Reihenfolge der Chips (Nico, 2026-10-22): Menge, Einheit, Material, dann die übrigen
 * Facetten wie hier, zuletzt Status. Nicht genannte Facetten hinten.
 */
const CHIP_ORDER = [
  'einheit',
  'keywords',
  'normen',
  'platzhalter',
  'positionsart',
  'positionstyp',
  'fristen',
];
const BEFORE_MATERIAL: ReadonlySet<string> = new Set(['einheit']);
const orderOf = (id: string): number => {
  const at = CHIP_ORDER.indexOf(id);
  return at < 0 ? CHIP_ORDER.length : at;
};

const RESET =
  'cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] font-medium uppercase tracking-[0.7px] text-accent-ink';

function Chevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
      <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Chip mit Auswahlliste darunter; offen ist höchstens eine Liste der Leiste. */
function GroupChip({
  label,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  /** Gewählte Werte der Gruppe; 0 = Chip ohne Zahl. */
  active: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={active > 0 ? `${label}, ${formatCount(active)} gewählt` : label}
        onClick={onToggle}
        className={`${CHIP} ${
          active > 0
            ? 'border-accent bg-accent-soft text-accent-ink'
            : open
              ? 'border-ink bg-surface text-ink'
              : 'border-line bg-surface text-ink hover:border-line2'
        }`}
      >
        {label}
        {active > 0 && <span>{formatCount(active)}</span>}
        <Chevron />
      </button>
      {open && (
        <div
          role="group"
          aria-label={label}
          className="ov-window absolute left-0 top-[36px] z-[30] flex max-h-[min(420px,60vh)] min-w-[240px] max-w-[min(360px,calc(100vw-32px))] flex-col gap-[1px] overflow-auto p-[6px]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Eine Zeile der Auswahlliste: echtes Kästchen, Text, Anzahl. */
function Option({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`${OPTION} ${count === 0 && !checked ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-[14px] w-[14px] shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      <span className="min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      <span className="shrink-0 text-[11px] text-mute">{formatCount(count)}</span>
    </label>
  );
}

function FacetOptions({
  facet,
  counts,
  active,
  only,
}: {
  facet: Facet;
  counts: ReadonlyMap<string, number>;
  active: ReadonlySet<string>;
  /** Nur diesen Wert zeigen (Material-Zeile in der Gruppe „Material"). */
  only?: string;
}) {
  const dispatch = useViewerDispatch();
  const toggle = (value: string): void => {
    const next = new Set(active);
    if (!next.delete(value)) next.add(value);
    dispatch({ type: 'setFacet', facetId: facet.id, values: next });
  };
  return (
    <>
      {[...counts]
        .filter(([value]) => only === undefined || value === only)
        .map(([value, count]) => (
          <Option
            key={value}
            label={facetOptionLabel(facet, value)}
            count={count}
            checked={active.has(value)}
            onChange={() => toggle(value)}
          />
        ))}
    </>
  );
}

/** „Eigene": Fortschritt, „Wichtig", Kommentar (Entscheidungen 0047, 0062). */
function OwnOptions() {
  const {
    annotations,
    index,
    filter: { notes },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const counts = useMemo(() => markerCounts(annotations), [annotations]);
  const commented = useMemo(() => commentedIds(annotations).length, [annotations]);
  // Wie der Filter „Offen": Positionen des Index ohne Fortschritt. Marker an IDs, die
  // nicht (mehr) im Index stehen, zählen so nicht mit.
  const open = useMemo(
    () => index.nodes.filter((node) => !annotations.progress.has(node.id)).length,
    [index, annotations],
  );
  return (
    <>
      <div className={HEADING}>Fortschritt</div>
      <Option
        label="Offen"
        count={open}
        checked={notes.progress === 'offen'}
        onChange={() => dispatch({ type: 'toggleProgressFilter', value: 'offen' })}
      />
      {PROGRESS.map((progress) => (
        <Option
          key={progress}
          label={PROGRESS_INFO[progress].label}
          count={counts[progress]}
          checked={notes.progress === progress}
          onChange={() => dispatch({ type: 'toggleProgressFilter', value: progress })}
        />
      ))}
      <div className={HEADING}>Markierung</div>
      <Option
        label="Wichtig"
        count={counts.wichtig}
        checked={notes.important}
        onChange={() => dispatch({ type: 'toggleImportantFilter' })}
      />
      <Option
        label="Mit Kommentar"
        count={commented}
        checked={notes.commented}
        onChange={() => dispatch({ type: 'toggleCommentFilter' })}
      />
    </>
  );
}

/** Material mit seinen Merkmalen darunter; Merkmale klappen je Material auf. */
function MaterialOptions({
  material,
  properties,
  facets,
}: {
  /** Facette `material`, falls die Datei Materialien führt. */
  material: Facet | undefined;
  properties: readonly Facet[];
  facets: ReadonlyMap<string, ReadonlyMap<string, number>>;
}) {
  const {
    filter: { filters },
  } = useViewer();
  const [openNames, setOpenNames] = useState<ReadonlySet<string>>(new Set());
  const materialCounts = material === undefined ? undefined : facets.get(material.id);
  // Auch ein Material ohne eigenen Treffer zeigen, wenn nur seine Merkmale gefunden wurden.
  const names = [
    ...new Set([
      ...(materialCounts?.keys() ?? []),
      ...properties.flatMap((facet) => (facet.material === undefined ? [] : [facet.material])),
    ]),
  ];
  const activeOf = (facet: Facet): ReadonlySet<string> =>
    filters.facets[facet.id] ?? EMPTY_SELECTION;
  return (
    <>
      {names.map((name) => {
        const own = properties.filter((facet) => facet.material === name);
        const anyActive = own.some((facet) => activeOf(facet).size > 0);
        const open = openNames.has(name) || anyActive;
        const toggle = (): void => {
          const next = new Set(openNames);
          if (!next.delete(name)) next.add(name);
          setOpenNames(next);
        };
        return (
          <div key={name} className="flex flex-col gap-[1px]">
            <div className="flex items-center gap-[2px]">
              <div className="min-w-0 flex-1">
                {material !== undefined && materialCounts?.has(name) === true ? (
                  <FacetOptions
                    facet={material}
                    counts={materialCounts}
                    active={activeOf(material)}
                    only={name}
                  />
                ) : (
                  <div className={`${OPTION} cursor-default`}>{name}</div>
                )}
              </div>
              {own.length > 0 && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`Merkmale ${name}`}
                  onClick={toggle}
                  disabled={anyActive}
                  className="inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className={open ? '' : '-rotate-90'}>
                    <Chevron />
                  </span>
                </button>
              )}
            </div>
            {open && (
              <div className="ml-[14px] flex flex-col gap-[1px] border-l border-line pl-[6px]">
                {own.map((facet) => (
                  <div key={facet.id} className="flex flex-col gap-[1px]">
                    <div className={HEADING}>{facet.subLabel ?? facet.label}</div>
                    <FacetOptions
                      facet={facet}
                      counts={facets.get(facet.id) ?? new Map()}
                      active={activeOf(facet)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function FilterBar() {
  const {
    lv,
    view,
    summary,
    filter: { filters, notes },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const shown = lv !== null && view.filterBar;
  useDismiss(ref, shown && openGroup !== null, () => setOpenGroup(null));

  // Vor dem Escape des Hauptscreens: Kinder-Effekte laufen vor denen der Eltern,
  // dieser Listener steht also zuerst am Fenster.
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      const inside = ref.current?.contains(document.activeElement) === true;
      if (openGroup === null && !inside) return;
      event.stopImmediatePropagation();
      if (openGroup !== null) setOpenGroup(null);
      else dispatch({ type: 'filterBar', open: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, openGroup, dispatch]);

  if (!shown) return null;

  const ownActive =
    (notes.progress === null ? 0 : 1) + (notes.important ? 1 : 0) + (notes.commented ? 1 : 0);
  const anyActive = countActiveFilters(filters) + ownActive > 0;
  const toggle = (id: string): void => setOpenGroup(openGroup === id ? null : id);
  const present = FACETS.filter((facet) => (summary.facets.get(facet.id)?.size ?? 0) > 0);
  const inMaterial = (facet: Facet): boolean =>
    facet.id === 'material' || facet.material !== undefined;
  const facets = present
    .filter((facet) => !inMaterial(facet))
    .sort((a, b) => orderOf(a.id) - orderOf(b.id));
  const materialFacet = present.find((facet) => facet.id === 'material');
  const properties = present.filter((facet) => facet.material !== undefined);
  const materialActive = present
    .filter(inMaterial)
    .reduce((sum, facet) => sum + (filters.facets[facet.id]?.size ?? 0), 0);

  const facetChip = (facet: Facet): ReactNode => {
    const active = filters.facets[facet.id] ?? EMPTY_SELECTION;
    return (
      <GroupChip
        key={facet.id}
        label={facet.label}
        active={active.size}
        open={openGroup === facet.id}
        onToggle={() => toggle(facet.id)}
      >
        <FacetOptions
          facet={facet}
          counts={summary.facets.get(facet.id) ?? new Map()}
          active={active}
        />
      </GroupChip>
    );
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Filterleiste"
      className="relative z-[4] flex shrink-0 flex-wrap items-center gap-[8px] border-b border-line bg-panel px-[12px] py-[8px]"
    >
      {summary.quantity !== null && (
        <GroupChip
          label="Menge"
          active={filters.menge === null ? 0 : 1}
          open={openGroup === 'menge'}
          onToggle={() => toggle('menge')}
        >
          <div className="p-[6px]">
            <RangeSlider
              label="Menge"
              bounds={summary.quantity}
              active={filters.menge}
              onChange={(range) => dispatch({ type: 'setMenge', range })}
              renderHead={(isActive) =>
                isActive ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'setMenge', range: null })}
                      className={RESET}
                    >
                      zurücksetzen
                    </button>
                  </div>
                ) : null
              }
            />
          </div>
        </GroupChip>
      )}
      {facets.filter((facet) => BEFORE_MATERIAL.has(facet.id)).map(facetChip)}
      {(materialFacet !== undefined || properties.length > 0) && (
        <GroupChip
          label="Material"
          active={materialActive}
          open={openGroup === 'material-gruppe'}
          onToggle={() => toggle('material-gruppe')}
        >
          <MaterialOptions
            material={materialFacet}
            properties={properties}
            facets={summary.facets}
          />
        </GroupChip>
      )}
      {facets.filter((facet) => !BEFORE_MATERIAL.has(facet.id)).map(facetChip)}
      <GroupChip
        label="Status"
        active={ownActive}
        open={openGroup === 'status'}
        onToggle={() => toggle('status')}
      >
        <OwnOptions />
      </GroupChip>
      <div className="ml-auto flex items-center gap-[10px]">
        {anyActive && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'resetFilters' })}
            className={RESET}
          >
            alle zurücksetzen
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: 'filterBar', open: false })}
          aria-label="Filterleiste schließen"
          title="Schließen (Esc)"
          className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
