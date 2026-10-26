// Kopfleiste: Logo-Menü, Datei, Suche mit den aktiven Filtern. Eine
// Befehlspalette gibt es nicht mehr; Strg K holt die Suche, Export und Druck
// stehen im Logo-Menü (docs/decisions/0038-keine-befehlspalette.md).
// Seit dem neuen Hauptscreen eine schmale Zeile (docs/decisions/0034-graph-als-
// hauptscreen.md): kein Ansichtsumschalter mehr, die Filter wählt man in der
// Filterleiste darunter („+ Filter", Issue #154), hier stehen sie nur als
// entfernbare Chips — auch die eigenen Marker.
// Der Schalter „Nicht-Treffer" sitzt in der Suche, weil er für Suche und alle
// Filter gilt — in Graph und Tabelle (docs/decisions/0058-nicht-treffer-in-der-suche.md).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReportDialog } from '../report/ReportDialog';
import { AdminDialog } from './AdminDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { NotesImportDialog } from './NotesImportDialog';
import { AboutMenu } from './AboutMenu';
import { useMitnehmen } from '../common/useMitnehmen';
import { WorkspaceBar } from '../shell/WorkspaceBar';
import { PROGRESS_INFO } from '../../lib/annotations';
import { FACETS, facetOptionLabel } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import { NotesFileError, notesCount, readNotesFile, type NotesFile } from '../../lib/notesFile';
import { useAdmin } from '../../state/admin';
import { useSurvey } from '../../state/survey';
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
  'inline-flex h-[32px] shrink-0 cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[10px] font-mono text-[12px] text-dim hover:bg-sunken hover:text-ink';

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

export function TopBar() {
  const {
    lv,
    filter: { filters, search, notes },
    annotations,
    view,
    active,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const survey = useSurvey();
  const notizAnzahl = useMemo(() => notesCount(annotations), [annotations]);
  const mitnehmen = useMitnehmen();
  const inputRef = useRef<HTMLInputElement>(null);
  /** „Fehler melden" — das Fenster gehört hierher, nicht ins Menü (WP-P, Schritt 6). */
  const [melden, setMelden] = useState(false);
  /** „Tastenkürzel" aus dem Logo-Menü oder per „?". */
  const [kuerzel, setKuerzel] = useState(false);
  /** „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053). */
  const [adminOffen, setAdminOffen] = useState(false);
  const adminFrei = useAdmin().unlocked;
  /** „Notizen laden…": versteckter Dateidialog, danach das Ergebnisfenster (0061). */
  const notizDateiRef = useRef<HTMLInputElement>(null);
  const [notizDatei, setNotizDatei] = useState<{ file: NotesFile; name: string } | null>(null);
  const notizenLesen = async (datei: File | undefined): Promise<void> => {
    if (datei === undefined) return;
    try {
      setNotizDatei({ file: await readNotesFile(datei), name: datei.name });
    } catch (fehler) {
      dispatch({
        type: 'notice',
        message:
          fehler instanceof NotesFileError
            ? fehler.message
            : 'Die Notiz-Datei konnte nicht gelesen werden.',
      });
    }
  };

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
  const filterOpen = view.filterBar;

  return (
    <>
      <div className="relative z-[5] flex h-[54px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pr-[12px]">
        {/* Das Logo öffnet „Über diese App": Version, Änderungen, Export, Druck,
            Fehler melden, Design (Issue #71). */}
        <AboutMenu
          onFehlerMelden={() => setMelden(true)}
          onTastenkuerzel={() => setKuerzel(true)}
          onTour={loaded ? () => dispatch({ type: 'tour', step: 0 }) : undefined}
          onFeedback={loaded ? survey.show : undefined}
          onAnderesLv={loaded ? () => dispatch({ type: 'clear' }) : undefined}
          mitnehmen={loaded ? mitnehmen : undefined}
          onNotizenLaden={loaded ? () => notizDateiRef.current?.click() : undefined}
          notizen={notizAnzahl}
          onAdmin={() => setAdminOffen(true)}
        />
        <input
          ref={notizDateiRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Notiz-Datei auswählen"
          onChange={(event) => {
            void notizenLesen(event.target.files?.[0]);
            // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
            event.target.value = '';
          }}
        />
        {adminFrei && (
          <button
            type="button"
            onClick={() => setAdminOffen(true)}
            title="Admin-Werkzeuge"
            className="-ml-[8px] inline-flex h-[20px] shrink-0 cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-[var(--violetS)] px-[8px] font-mono text-[11px] text-[var(--violetD)]"
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
                className="truncate font-display text-[14px] font-semibold text-ink"
                title={lv.projectName ?? lv.fileName}
              >
                {lv.projectName ?? lv.fileName}
              </b>
              <span className="truncate font-mono text-[11px] text-mute" title={lv.fileName}>
                {lv.fileName}
                {lv.client !== null && ` · ${lv.client}`}
              </span>
            </div>

            <div
              data-tour="search"
              className="mx-auto flex h-[36px] min-w-0 max-w-[620px] flex-1 items-center gap-[6px] overflow-hidden rounded-[var(--r-pill)] border border-line bg-surface pl-[12px] pr-[6px] shadow-[var(--shadow-sm)] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]"
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
                  onClick={() => dispatch({ type: 'filterBar', open: true })}
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
              <span className="rounded-[5px] border border-line bg-sunken px-[5px] py-[1px] font-mono text-[11px] text-mute">
                /
              </span>
              {active.filtering && <HideModeToggle />}
              <button
                type="button"
                aria-expanded={filterOpen}
                data-tour="filter"
                onClick={() => dispatch({ type: 'filterBar', open: !filterOpen })}
                className={`inline-flex h-[26px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[var(--r-pill)] border px-[10px] font-mono text-[10.5px] ${
                  filterOpen
                    ? 'border-solid border-accent bg-accent-soft text-accent-ink'
                    : 'border-dashed border-line2 bg-transparent text-dim hover:border-solid hover:border-accent hover:bg-accent-soft hover:text-accent-ink'
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
            <WorkspaceBar />
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
      {notizDatei !== null && (
        <NotesImportDialog
          file={notizDatei.file}
          fileName={notizDatei.name}
          onClose={() => setNotizDatei(null)}
        />
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
