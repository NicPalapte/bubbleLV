// Kopfleiste: Logo, Projektkontext, Suche, Facetten-Buttons. Portiert aus
// `TopBar` in design/claude-design/lv-main.jsx (Breadcrumb-Dropdowns entfallen —
// es gibt genau ein geladenes LV je Session).

import { useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette } from '../palette/CommandPalette';
import { ReportDialog } from '../report/ReportDialog';
import { AboutMenu } from './AboutMenu';
import { Chip } from '../ui/Chip';
import { FacetButton } from '../filter/FacetButton';
import { FilterOverflowRow, type OverflowItem } from '../filter/FilterOverflowRow';
import { RangeButton } from '../filter/RangeButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FACETS } from '../../lib/facets';
import { EMPTY_SUMMARY } from '../../lib/index/summary';
import { countActiveFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const EMPTY_SELECTION: Set<string> = new Set();
const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();

/**
 * Wartezeit, bevor eine Eingabe zum Filter wird. Ein Suchlauf zieht Baum, Graph
 * und Tabelle neu auf — bei großen LVs (Richtung ~10k Positionen) dauert das
 * mehrere hundert Millisekunden bis Sekunden. Ohne Verzögerung passiert das je
 * Tastendruck, und die Eingabe hakt. Der Wert ist kurz genug, dass die Suche
 * beim Innehalten sofort greift.
 */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Acht gleichrangige Ansichten auf einem Filterzustand sind das Ziel (WP-L);
 * sieben stehen. Der Umschalter ändert **nur** die Ansicht — Filter, Suche und
 * Auswahl bleiben, wo sie sind.
 */
const VIEW_MODES = [
  { value: 'overview', label: 'Überblick', title: 'Kennzahlen, Treemap, Pareto' },
  { value: 'graph', label: 'Graph', title: 'Bubble-Graph, Vollbild' },
  { value: 'table', label: 'Tabelle', title: 'Baum, Tabelle und Eigenschaften' },
  { value: 'matrix', label: 'Matrix', title: 'Heatmap über zwei Merkmale' },
  { value: 'similar', label: 'Ähnlichkeit', title: 'Ähnliche Positionen, Unterschiede, Ausreißer' },
  { value: 'compare', label: 'Vergleich', title: 'Gewählte Positionen nebeneinander' },
  { value: 'check', label: 'Prüfung', title: 'Hinweise der Prüfregeln' },
] as const;

export function TopBar() {
  const {
    lv,
    filter: { filters, search },
    view,
  } = useViewer();
  const dispatch = useViewerDispatch();
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

  const activeCount = countActiveFilters(filters);
  const loaded = lv !== null;
  // Facetten-Zähler und Wertebereiche liegen fertig im geladenen LV (WP-I) —
  // die Knöpfe rechnen nichts mehr im Render.
  const summary = lv?.summary ?? EMPTY_SUMMARY;

  const filterItems: OverflowItem[] = useMemo(() => {
    if (!loaded) return [];
    const facetItems: OverflowItem[] = FACETS.map((facet) => ({
      key: facet.id,
      active: (filters.facets[facet.id]?.size ?? 0) > 0,
      node: (
        <FacetButton
          facet={facet}
          counts={summary.facets.get(facet.id) ?? EMPTY_COUNTS}
          active={filters.facets[facet.id] ?? EMPTY_SELECTION}
          onChange={(values) => dispatch({ type: 'setFacet', facetId: facet.id, values })}
        />
      ),
    }));
    const items: OverflowItem[] = [
      ...facetItems,
      {
        key: 'menge',
        active: filters.menge !== null,
        node: (
          <RangeButton
            label="Menge"
            bounds={summary.quantity}
            active={filters.menge}
            onChange={(range) => dispatch({ type: 'setMenge', range })}
          />
        ),
      },
    ];
    if (activeCount > 0) {
      items.push({
        key: 'reset',
        node: (
          <Chip dashed onClick={() => dispatch({ type: 'resetFilters' })}>
            ✕ {activeCount} zurücksetzen
          </Chip>
        ),
      });
    }
    return items;
  }, [loaded, summary, filters, activeCount, dispatch]);

  return (
    <>
      {/*
        Zwei Leisten statt einer (Issue #80). In einer Zeile teilten sich Logo,
        Projekt, Suche, sieben Ansichten, dreizehn Facetten und drei Knöpfe den
        Platz — gemessen bei 1440 px passte kein einziger Facetten-Knopf mehr
        hinein, und selbst das Wort „FILTER" wurde abgeschnitten.
        Oben steht, **wo** man ist und **was** man ansieht; unten, **wonach**
        gesucht und gefiltert wird.
      */}
      <div className="relative z-[5] flex h-[46px] shrink-0 items-stretch border-b border-line bg-white">
        {/* Das Logo öffnet „Über diese App": Version, Änderungen, Fehler melden
            (Issue #71). */}
        <div className="flex items-center border-r border-line">
          <AboutMenu onFehlerMelden={() => setMelden(true)} />
        </div>
        {/* Projektkontext: begrenzt und abgeschnitten — reale Projektnamen sind
            lang, und der Ansichtsumschalter daneben darf nicht wandern. */}
        <div className="flex max-w-[420px] shrink items-center gap-[8px] overflow-hidden border-r border-line px-[16px] font-mono text-[10px] text-dim">
          {loaded ? (
            <>
              <span className="truncate text-ink" title={lv.projectName ?? lv.fileName}>
                {lv.projectName ?? lv.fileName}
              </span>
              {lv.client !== null && (
                <>
                  <span className="text-line2">/</span>
                  <span className="truncate" title={lv.client}>
                    {lv.client}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-mute">Kein LV geladen</span>
          )}
        </div>
        {loaded && (
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto px-[12px]">
            <SegmentedControl
              label="Ansicht"
              options={VIEW_MODES}
              value={view.mode}
              onChange={(value) =>
                dispatch({ type: 'setViewMode', mode: value as typeof view.mode })
              }
            />
          </div>
        )}
        {loaded && (
          <div className="ml-auto flex items-center border-l border-line px-[14px]">
            <Chip onClick={() => dispatch({ type: 'clear' })} title="LV schließen und neu laden">
              ✕ LV schließen
            </Chip>
          </div>
        )}
      </div>

      {/* Zweite Leiste: Suche und Filter — der Zustand, auf dem alle acht
          Ansichten arbeiten. */}
      <div className="relative z-[5] flex h-[42px] shrink-0 items-center gap-[10px] border-b border-line bg-white px-[14px]">
        <div
          className="flex w-[280px] shrink-0 items-center gap-[8px] border border-line bg-white px-[10px] py-[4px]"
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
        {loaded && (
          <>
            <span className="shrink-0 font-mono text-[8px] tracking-[0.6px] text-mute">FILTER</span>
            <div className="flex min-w-0 flex-1 items-center gap-[6px]">
              <FilterOverflowRow items={filterItems} />
            </div>
            {/*
              Kein Knopf, nur der Hinweis: die Palette trägt seit Issue #80 auch
              Export, Druck und Melden. Ohne diesen Hinweis wäre sie unsichtbar
              — mit Knopf wäre die Leiste wieder voll.
            */}
            <span
              className="ml-auto shrink-0 whitespace-nowrap font-mono text-[8px] tracking-[0.6px] text-mute"
              title="Ansicht wechseln, filtern, zu einer OZ springen, exportieren, drucken, melden"
            >
              STRG/CMD + K · BEFEHLE
            </span>
          </>
        )}
      </div>

      {loaded && (
        // Die Palette schweigt, solange das Melde-Fenster offen ist: beide
        // liegen über der Seite, und zwei Fenster übereinander wären für
        // niemanden vorhersehbar.
        <CommandPalette gesperrt={melden} onFehlerMelden={() => setMelden(true)} />
      )}
      {melden && (
        <ReportDialog
          context={{ view: view.mode, loaded: lv !== null }}
          onClose={() => setMelden(false)}
        />
      )}
    </>
  );
}
