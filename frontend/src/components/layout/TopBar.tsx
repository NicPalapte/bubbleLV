// Kopfleiste: Logo, Projektkontext, Suche, Facetten-Buttons. Portiert aus
// `TopBar` in design/claude-design/lv-main.jsx (Breadcrumb-Dropdowns entfallen —
// es gibt genau ein geladenes LV je Session).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { BubbleLogo } from '../ui/BubbleLogo';
import { FacetButton } from '../filter/FacetButton';
import { RangeButton } from '../filter/RangeButton';
import { FACETS } from '../../lib/facets';
import { countActiveFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { PositionSummary } from '../../types/lvNode';

const EMPTY_SELECTION: Set<string> = new Set();

/**
 * Wartezeit, bevor eine Eingabe zum Filter wird. Ein Suchlauf zieht Baum, Graph
 * und Tabelle neu auf — bei großen LVs (Richtung ~10k Positionen) dauert das
 * mehrere hundert Millisekunden bis Sekunden. Ohne Verzögerung passiert das je
 * Tastendruck, und die Eingabe hakt. Der Wert ist kurz genug, dass die Suche
 * beim Innehalten sofort greift.
 */
const SEARCH_DEBOUNCE_MS = 250;

function quantityOf(position: PositionSummary): number | null {
  return position.quantity;
}

export function TopBar() {
  const { lv, positionNodes, filters, search } = useViewer();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Das Eingabefeld hängt am lokalen Wert, damit Tippen nie auf den Suchlauf
  // wartet; der Viewer-State folgt verzögert nach.
  const [draft, setDraft] = useState(search);
  const [mirrored, setMirrored] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Änderungen von außen (Import, „LV schließen" setzen die Suche zurück)
  // übernehmen — im Render statt im Effekt, sonst zeigt das Feld für einen
  // Frame den alten Begriff (react.dev/learn/you-might-not-need-an-effect).
  if (search !== mirrored) {
    setMirrored(search);
    setDraft(search);
  }

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const changeSearch = (value: string): void => {
    setDraft(value);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(
      () => dispatch({ type: 'search', value }),
      value === '' ? 0 : SEARCH_DEBOUNCE_MS,
    );
  };

  const positions = useMemo(
    () =>
      positionNodes.map((node) => node.position).filter((p): p is PositionSummary => p !== null),
    [positionNodes],
  );

  // "/" fokussiert die Suche — wie im Design.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== '/' || event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeCount = countActiveFilters(filters);
  const loaded = lv !== null;

  return (
    <div className="relative z-[5] flex h-[54px] shrink-0 items-stretch border-b border-line bg-white">
      <div className="flex items-center border-r border-line px-[18px]">
        <BubbleLogo size={22} />
      </div>
      <div className="flex items-center gap-[8px] border-r border-line px-[16px] font-mono text-[10px] text-dim">
        {loaded ? (
          <>
            <span className="text-ink">{lv.projectName ?? lv.fileName}</span>
            {lv.client !== null && (
              <>
                <span className="text-line2">/</span>
                <span>{lv.client}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-mute">Kein LV geladen</span>
        )}
      </div>
      <div className="flex flex-[0_1_260px] items-center gap-[8px] px-[12px]">
        <div
          className="flex flex-1 items-center gap-[8px] border border-line bg-white px-[10px] py-[5px]"
          style={{ opacity: loaded ? 1 : 0.45 }}
        >
          <span className="text-[12px] text-mute">⌕</span>
          <input
            ref={inputRef}
            value={draft}
            disabled={!loaded}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Positionen, OZ, Langtext…"
            aria-label="Suche"
            className="flex-1 border-none bg-transparent font-mono text-[11px] text-ink outline-none"
          />
          <span className="border border-line px-[5px] font-mono text-[9px] text-mute">/</span>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-[6px] overflow-visible px-[8px]">
        {loaded && (
          <>
            <span className="mr-[2px] font-mono text-[8px] tracking-[0.6px] text-mute">FILTER</span>
            {FACETS.map((facet) => (
              <FacetButton
                key={facet.id}
                facet={facet}
                positions={positions}
                active={filters.facets[facet.id] ?? EMPTY_SELECTION}
                onChange={(values) => dispatch({ type: 'setFacet', facetId: facet.id, values })}
              />
            ))}
            <RangeButton
              label="Menge"
              positions={positions}
              getValue={quantityOf}
              active={filters.menge}
              onChange={(range) => dispatch({ type: 'setMenge', range })}
            />
            {activeCount > 0 && (
              <Chip dashed onClick={() => dispatch({ type: 'resetFilters' })}>
                ✕ {activeCount} zurücksetzen
              </Chip>
            )}
          </>
        )}
      </div>
      {loaded && (
        <div className="flex items-center border-l border-line px-[18px]">
          <Chip onClick={() => dispatch({ type: 'clear' })} title="LV schließen und neu laden">
            ✕ LV schließen
          </Chip>
        </div>
      )}
    </div>
  );
}
