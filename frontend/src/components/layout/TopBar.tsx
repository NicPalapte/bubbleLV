// Kopfleiste: Logo-Menü, Datei, Suche mit den aktiven Filtern. Eine
// Befehlspalette gibt es nicht mehr; Strg K holt die Suche, Export und Druck
// stehen im Logo-Menü (docs/decisions/0038-keine-befehlspalette.md).
// Seit dem neuen Hauptscreen eine schmale Zeile (docs/decisions/0034-graph-als-
// hauptscreen.md): kein Ansichtsumschalter mehr, die Filter wählt man in der
// Filterleiste darunter („+ Filter", Issue #154), hier stehen sie nur als
// entfernbare Chips — auch die eigenen Marker.
// Die Suchleiste selbst ist `SearchPill` — sie steht auch in Graph und Tabelle im
// eigenen Browserfenster.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ReportDialog } from '../report/ReportDialog';
import { AdminDialog } from './AdminDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { NotesImportDialog } from './NotesImportDialog';
import { AboutMenu } from './AboutMenu';
import { useMitnehmen } from '../common/useMitnehmen';
import { WorkspaceBar } from '../shell/WorkspaceBar';
import { SearchPill } from './SearchPill';
import { useOptionalDocuments } from '../docs/DocumentsProvider';
import { NotesFileError, notesCount, readNotesFile, type NotesFile } from '../../lib/notesFile';
import { useAdmin } from '../../state/admin';
import { useSurvey } from '../../state/survey';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const GHOST =
  'inline-flex h-[32px] shrink-0 cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[10px] font-mono text-[12px] text-dim hover:bg-sunken hover:text-ink';

export function TopBar() {
  const { lv, annotations, view } = useViewer();
  const dispatch = useViewerDispatch();
  const survey = useSurvey();
  const notizAnzahl = useMemo(() => notesCount(annotations), [annotations]);
  const mitnehmen = useMitnehmen();
  /** „Fehler melden" — das Fenster gehört hierher, nicht ins Menü (WP-P, Schritt 6). */
  const [melden, setMelden] = useState(false);
  /** „Tastenkürzel" aus dem Logo-Menü oder per „?". */
  const [kuerzel, setKuerzel] = useState(false);
  /** „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053). */
  const [adminOffen, setAdminOffen] = useState(false);
  const { unlocked: adminFrei, ruleRequest, requestRule } = useAdmin();
  // „Als Regel…" im Langtext öffnet den Regeleditor (Entscheidung 0081).
  if (ruleRequest !== null && !adminOffen) setAdminOffen(true);
  /** „Notizen laden…": versteckter Dateidialog, danach das Ergebnisfenster (0061). */
  const notizDateiRef = useRef<HTMLInputElement>(null);
  const pdfDateiRef = useRef<HTMLInputElement>(null);
  const documents = useOptionalDocuments();
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

  // "?" holt die Tastenkürzel; "/" und Strg K hält `SearchPill` selbst.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const imFeld =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key !== '?' || imFeld) return;
      event.preventDefault();
      setKuerzel(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loaded = lv !== null;

  const filterOpen = view.filterBar;

  return (
    <>
      <div className="relative z-[5] flex h-[54px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pr-[12px]">
        {/* Das Logo öffnet „Über diese App": Öffnen, Export, Notizen, Hilfe, Design
            (Issue #71, Entscheidung 0079). */}
        <AboutMenu
          onFehlerMelden={() => setMelden(true)}
          onTastenkuerzel={() => setKuerzel(true)}
          onTour={loaded ? () => dispatch({ type: 'tour', step: 0 }) : undefined}
          onFeedback={loaded ? survey.show : undefined}
          onAnderesLv={loaded ? () => dispatch({ type: 'clear' }) : undefined}
          mitnehmen={loaded ? mitnehmen : undefined}
          onPdfHinzufuegen={
            loaded && documents !== null ? () => pdfDateiRef.current?.click() : undefined
          }
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
        <input
          ref={pdfDateiRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          aria-label="PDF auswählen"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            void documents?.openFiles(files);
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
            <div className="hidden min-w-0 max-w-[300px] shrink flex-col border-l border-line pl-[12px] leading-tight lg:flex">
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

            <SearchPill
              tour
              filterOpen={filterOpen}
              onFilterOpen={(open) => dispatch({ type: 'filterBar', open })}
              className="mx-auto max-w-[620px] flex-1"
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
      {adminOffen && (
        <AdminDialog
          onClose={() => {
            setAdminOffen(false);
            requestRule(null);
          }}
          onTrefferProtokoll={loaded ? mitnehmen.trefferAlsCsv : undefined}
        />
      )}
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
