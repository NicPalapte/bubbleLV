// Kopfleiste: Logo-Menü, Datei, Suche mit den aktiven Filtern. Eine
// Befehlspalette gibt es nicht mehr; Strg K holt die Suche, Export und Druck
// stehen im Logo-Menü (docs/decisions/0038-keine-befehlspalette.md).
// Seit dem neuen Hauptscreen eine schmale Zeile (docs/decisions/0034-graph-als-
// hauptscreen.md): kein Ansichtsumschalter mehr, die Filter wählt man im
// Seitenfenster („+ Filter"), hier stehen sie nur als entfernbare Chips.
// Der Schalter „Nicht-Treffer" sitzt in der Suche, weil er für Suche und alle
// Filter gilt — in Graph und Tabelle (docs/decisions/0058-nicht-treffer-in-der-suche.md).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReportDialog } from '../report/ReportDialog';
import { AdminDialog } from './AdminDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { AboutMenu } from './AboutMenu';
import { useMitnehmen } from '../common/useMitnehmen';
import { commentedIds, MARKER_INFO, MARKERS, markerCounts } from '../../lib/annotations';
import { FACETS, facetOptionLabel } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch, type HideMode } from '../../state/viewer';

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

/** Filterschalter für eigene Notizen; versteckt, solange es nichts zu filtern gibt. */
function NoteFilterButton({
  label,
  glyph,
  count,
  on,
  onClick,
}: {
  label: string;
  glyph: string;
  count: number;
  on: boolean;
  onClick: () => void;
}) {
  if (count === 0 && !on) return null;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={on ? `${label}: Filter aus` : `Nur ${label.toLowerCase()} zeigen`}
      className={`inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-[var(--r-pill)] border px-[11px] font-mono text-[10.5px] shadow-[var(--shadow-sm)] ${
        on
          ? 'border-blue bg-blueS text-blueD'
          : 'border-line bg-surface text-dim hover:border-line2'
      }`}
    >
      <span aria-hidden="true">{glyph}</span>
      {label}
      <span className={on ? 'text-blueD' : 'text-mute'}>{count}</span>
    </button>
  );
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
              on ? 'bg-blue text-white' : 'bg-transparent text-dim hover:text-blueD'
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

export function TopBar() {
  const {
    lv,
    filter: { filters, search, notes },
    annotations,
    index,
    view,
    active,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const counts = useMemo(() => markerCounts(annotations), [annotations]);
  const commentCount = useMemo(() => commentedIds(annotations).length, [annotations]);
  const mitnehmen = useMitnehmen();
  const inputRef = useRef<HTMLInputElement>(null);
  /** „Fehler melden" — das Fenster gehört hierher, nicht ins Menü (WP-P, Schritt 6). */
  const [melden, setMelden] = useState(false);
  /** „Tastenkürzel" aus dem Logo-Menü oder per „?". */
  const [kuerzel, setKuerzel] = useState(false);
  /** „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053). */
  const [adminOffen, setAdminOffen] = useState(false);
  const adminFrei = useAdmin().unlocked;

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

  // "/" und Strg/Cmd + K holen die Suche. Strg K greift auch in Eingabefeldern:
  // wer es drückt, will suchen; "/" dagegen ist dort ein Zeichen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const strgK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      const imFeld =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === '?' && !imFeld) {
        event.preventDefault();
        setKuerzel(true);
        return;
      }
      if (!strgK && (event.key !== '/' || imFeld)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
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
          onTastenkuerzel={() => setKuerzel(true)}
          onTour={loaded ? () => dispatch({ type: 'tour', step: 0 }) : undefined}
          onAnderesLv={loaded ? () => dispatch({ type: 'clear' }) : undefined}
          mitnehmen={loaded ? mitnehmen : undefined}
          onAdmin={() => setAdminOffen(true)}
        />
        {adminFrei && (
          <button
            type="button"
            onClick={() => setAdminOffen(true)}
            title="Admin-Werkzeuge"
            className="-ml-[8px] inline-flex h-[20px] shrink-0 cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-[var(--violetS)] px-[8px] font-mono text-[10px] text-[var(--violetD)]"
          >
            Admin
          </button>
        )}

        {loaded && (
          <>
            {/* Einzige h1 der Seite, auch auf schmalen Bildschirmen, wo der
                sichtbare Titel ausgeblendet ist: Bildschirmleser springen über
                Überschriften. */}
            <h1 className="sr-only">{lv.projectName ?? lv.fileName}</h1>
            {/* Datei: begrenzt und abgeschnitten — reale Projektnamen sind lang. */}
            <div className="hidden min-w-0 max-w-[300px] shrink flex-col border-l border-line pl-[12px] leading-tight md:flex">
              <b
                aria-hidden="true"
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

            <div
              data-tour="search"
              className="mx-auto flex h-[36px] min-w-0 max-w-[620px] flex-1 items-center gap-[6px] overflow-hidden rounded-[var(--r-pill)] border border-line bg-surface pl-[12px] pr-[6px] shadow-[var(--shadow-sm)] focus-within:border-blue focus-within:shadow-[0_0_0_3px_var(--blueS)]"
            >
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
              <span className="rounded-[5px] border border-line bg-sunken px-[5px] py-[1px] font-mono text-[10px] text-mute">
                /
              </span>
              {active.filtering && <HideModeToggle />}
              <button
                type="button"
                aria-pressed={filterOpen}
                data-tour="filter"
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

            {/* Eigene Marker und Kommentare (Entscheidungen 0047, 0053): erst sichtbar,
                wenn es welche gibt — sonst wären es leere Knöpfe mehr. */}
            {MARKERS.map((marker) => (
              <NoteFilterButton
                key={marker}
                label={MARKER_INFO[marker].label}
                glyph={MARKER_INFO[marker].glyph}
                count={counts[marker]}
                on={notes.marker === marker}
                onClick={() => dispatch({ type: 'toggleMarkerFilter', value: marker })}
              />
            ))}
            {/* Beim Kalkulieren: nur, was noch nicht erledigt ist. */}
            <NoteFilterButton
              label="Nicht erledigt"
              glyph="○"
              count={counts.erledigt > 0 ? index.size - counts.erledigt : 0}
              on={notes.marker === 'offen'}
              onClick={() => dispatch({ type: 'toggleMarkerFilter', value: 'offen' })}
            />
            <NoteFilterButton
              label="Mit Kommentar"
              glyph="✎"
              count={commentCount}
              on={notes.commented}
              onClick={() => dispatch({ type: 'toggleCommentFilter' })}
            />

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

      {kuerzel && <ShortcutsDialog onClose={() => setKuerzel(false)} />}
      {adminOffen && <AdminDialog onClose={() => setAdminOffen(false)} />}
      {melden && (
        <ReportDialog
          context={{ view: view.mode, loaded: lv !== null }}
          onClose={() => setMelden(false)}
        />
      )}
    </>
  );
}
