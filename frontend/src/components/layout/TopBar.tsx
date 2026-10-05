// Kopfleiste: Logo-Menü, Datei, Suche mit den aktiven Filtern. Eine
// Befehlspalette gibt es nicht mehr; Export und Druck stehen im Logo-Menü
// (docs/decisions/0037-keine-befehlspalette.md).
// Seit dem neuen Hauptscreen eine schmale Zeile (docs/decisions/0034-graph-als-
// hauptscreen.md): kein Ansichtsumschalter mehr, die Filter wählt man im
// Seitenfenster („+ Filter"), hier stehen sie nur als entfernbare Chips.

import { useEffect, useRef, useState } from 'react';
import { ReportDialog } from '../report/ReportDialog';
import { AboutMenu } from './AboutMenu';
import { useMitnehmen } from '../common/useMitnehmen';
import { FACETS, facetOptionLabel } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/**
 * Wartezeit, bevor eine Eingabe zum Filter wird. Ein Suchlauf zieht Baum, Graph
 * und Tabelle neu auf — bei großen LVs (Richtung ~10k Positionen) dauert das
 * mehrere hundert Millisekunden bis Sekunden. Ohne Verzögerung passiert das je
 * Tastendruck, und die Eingabe hakt. Der Wert ist kurz genug, dass die Suche
 * beim Innehalten sofort greift.
 */
const SEARCH_DEBOUNCE_MS = 250;

/** So viele Filter-Chips passen in die Suche; der Rest steht als „+N". */
const MAX_CHIPS = 2;

interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}

const GHOST =
  'inline-flex h-[32px] shrink-0 cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[10px] font-mono text-[11px] text-dim hover:bg-sunken hover:text-ink';

export function TopBar() {
  const {
    lv,
    filter: { filters, search },
    view,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const mitnehmen = useMitnehmen();
  const inputRef = useRef<HTMLInputElement>(null);
  /** „Fehler melden" — das Fenster gehört hierher, nicht ins Menü (WP-P, Schritt 6). */
  const [melden, setMelden] = useState(false);

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

  const loaded = lv !== null;

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
  const filterOpen = view.side === 'filter';

  return (
    <>
      <div className="relative z-[5] flex h-[54px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pr-[12px]">
        {/* Das Logo öffnet „Über diese App": Version, Änderungen, Export, Druck,
            Fehler melden, Design (Issue #71). */}
        <AboutMenu
          onFehlerMelden={() => setMelden(true)}
          onAnderesLv={loaded ? () => dispatch({ type: 'clear' }) : undefined}
          mitnehmen={loaded ? mitnehmen : undefined}
        />

        {loaded && (
          <>
            {/* Datei: begrenzt und abgeschnitten — reale Projektnamen sind lang. */}
            <div className="hidden min-w-0 max-w-[300px] shrink flex-col border-l border-line pl-[12px] leading-tight md:flex">
              <b
                className="truncate font-sans text-[13px] font-semibold text-ink"
                title={lv.projectName ?? lv.fileName}
              >
                {lv.projectName ?? lv.fileName}
              </b>
              <span className="truncate font-mono text-[10px] text-mute" title={lv.fileName}>
                {lv.fileName}
                {lv.client !== null && ` · ${lv.client}`}
              </span>
            </div>

            <div className="mx-auto flex h-[36px] min-w-0 max-w-[620px] flex-1 items-center gap-[6px] overflow-hidden rounded-[var(--r-pill)] border border-line bg-surface pl-[12px] pr-[6px] shadow-[var(--shadow-sm)] focus-within:border-blue focus-within:shadow-[0_0_0_3px_var(--blueS)]">
              <span className="text-[14px] text-mute" aria-hidden="true">
                ⌕
              </span>
              {chips.slice(0, MAX_CHIPS).map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex h-[24px] max-w-[160px] shrink-0 items-center gap-[6px] rounded-[var(--r-pill)] bg-blueS pl-[9px] pr-[6px] font-mono text-[10.5px] text-blueD"
                >
                  <span className="truncate">{chip.label}</span>
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent px-[3px] py-0 text-[10px] leading-none text-blueD opacity-70 hover:opacity-100"
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
                  onClick={() => dispatch({ type: 'sidePanel', panel: 'filter' })}
                  className="shrink-0 cursor-pointer whitespace-nowrap border-none bg-transparent p-0 font-mono text-[10px] text-blue"
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
                className="min-w-[60px] flex-1 border-none bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-mute"
              />
              <span className="rounded-[5px] border border-line bg-sunken px-[5px] py-[1px] font-mono text-[9.5px] text-mute">
                /
              </span>
              <button
                type="button"
                aria-pressed={filterOpen}
                onClick={() => dispatch({ type: 'sidePanel', panel: filterOpen ? null : 'filter' })}
                className={`inline-flex h-[26px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[var(--r-pill)] border px-[10px] font-mono text-[10.5px] ${
                  filterOpen
                    ? 'border-solid border-blue bg-blueS text-blueD'
                    : 'border-dashed border-line2 bg-transparent text-dim hover:border-solid hover:border-blue hover:bg-blueS hover:text-blueD'
                }`}
              >
                + Filter
              </button>
            </div>

            {view.mode !== 'graph' && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'showGraph' })}
                className={GHOST}
              >
                ← Graph
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: 'clear' })}
              title="Datei verwerfen, zurück zur Startseite"
              className={`${GHOST} hidden sm:inline-flex`}
            >
              LV schließen
            </button>
          </>
        )}
      </div>

      {melden && (
        <ReportDialog
          context={{ view: view.mode, loaded: lv !== null }}
          onClose={() => setMelden(false)}
        />
      )}
    </>
  );
}
