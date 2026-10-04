// Datei laden → lokale Pipeline anstoßen. Drag & Drop + Datei-Dialog, dazu die
// mitgelieferten Demo-LVs zum Ausprobieren ohne eigene Datei — eines mit und
// eines ohne Preise, weil beides in der Praxis vorkommt und die App beides
// unterschiedlich zeigt (lib/pipeline/loadDemoLv.ts).
// Die Datei verlässt den Browser nie: kein Upload, keine Persistenz.

import { useCallback, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { BubbleLogo } from '../ui/BubbleLogo';
import { DEMO_LVS, loadDemoLv, type DemoLv } from '../../lib/pipeline/loadDemoLv';
import { GAEB_ENDUNGEN } from '../../lib/gaeb';
import { loadLv, LVLoadError, MAX_FILE_BYTES } from '../../lib/pipeline/loadLv';
import { UNEXPECTED_FAILURE } from '../../lib/pipeline/messages';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LoadedLV } from '../../lib/pipeline/runPipeline';

// Der Dateidialog unterscheidet Groß- und Kleinschreibung der Endung je nach System.
const ACCEPT = GAEB_ENDUNGEN.flatMap((endung) => [`.${endung}`, `.${endung.toUpperCase()}`]).join(
  ',',
);
const MAX_MB = MAX_FILE_BYTES / (1024 * 1024);

export function FileDropzone() {
  const { loading, error } = useViewer();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Beim Überfahren von Kindelementen feuert dragleave, obwohl der Zeiger die
  // Ablage nie verlassen hat — deshalb wird gezählt statt geschaltet.
  const dragDepth = useRef(0);

  /**
   * Ein Ladeweg, eine Fehlerbehandlung — Datei wie Demo-LV. `load` bekommt eine
   * Funktion, mit der es Hinweise melden kann; sie erscheinen nach dem Laden in
   * der Hinweisleiste, weil die Startseite dann verschwunden ist.
   */
  const run = useCallback(
    async (
      load: (onNotice: (message: string) => void) => Promise<LoadedLV>,
      vorab: readonly string[] = [],
    ): Promise<void> => {
      dispatch({ type: 'loading' });
      const notices = [...vorab];
      try {
        const lv = await load((message) => notices.push(message));
        dispatch({ type: 'loaded', lv, notices });
      } catch (cause) {
        // Nur die eigenen, deutschen Meldungen zeigen: der Text eines
        // unerwarteten Fehlers wäre Englisch und hilft niemandem.
        dispatch({
          type: 'error',
          message: cause instanceof LVLoadError ? cause.message : UNEXPECTED_FAILURE,
        });
      }
    },
    [dispatch],
  );

  const handleFiles = useCallback(
    async (files: FileList | null | undefined): Promise<void> => {
      const file = files?.[0];
      if (file === undefined) return;
      // Mehr als eine Datei: die erste wird gelesen, und es wird gesagt (Issue #94).
      // Ein Versionsvergleich oder Merge ist laut docs/scope.md bewusst draußen.
      const vorab =
        files !== undefined && files !== null && files.length > 1
          ? [
              `Es wurden ${files.length} Dateien abgelegt. Gelesen wird nur „${file.name}". ` +
                'Es wird immer nur eine Datei gelesen.',
            ]
          : [];
      await run((onNotice) => loadLv(file, { onNotice }), vorab);
    },
    [run],
  );

  const openDemo = (demo: DemoLv): void => {
    if (loading) return;
    void run((onNotice) => loadDemoLv(demo, { onNotice }));
  };

  const openDialog = (): void => {
    if (loading) return;
    inputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[18px] overflow-auto bg-paper p-[24px]">
      {/*
        Einstiegstext für den ersten Besuch (Issue #72). Er steht bewusst
        **außerhalb** der Ablagefläche: die ist als Ganzes anklickbar, und wer
        einen Text liest, will dabei keinen Dateidialog öffnen.

        Die entscheidende Frage beim ersten Mal ist nicht „was kann das", sondern
        „wo landet meine Datei" — deshalb steht die Antwort hier und nicht in
        einer Datenschutzerklärung, die niemand aufschlägt.
      */}
      <div className="w-full max-w-[540px]">
        <div className="font-sans text-[15px] font-semibold text-ink">
          Bubble macht ein Leistungsverzeichnis lesbar.
        </div>
        <dl className="mt-[10px] font-mono text-[10.5px] leading-[1.7] text-mute">
          <div className="flex gap-[8px]">
            <dt className="w-[132px] shrink-0 text-dim">Was Bubble tut</dt>
            <dd>
              GAEB-Datei lesen, klassifizieren, auf VOB-Punkte hinweisen — acht Ansichten auf einem
              Filterzustand, dazu Export und Druck.
            </dd>
          </div>
          <div className="mt-[6px] flex gap-[8px]">
            <dt className="w-[132px] shrink-0 text-dim">Wo die Datei bleibt</dt>
            <dd>
              Im Browser. Kein Server, kein Upload, kein Konto. Ein Reload verwirft den Stand.
            </dd>
          </div>
          <div className="mt-[6px] flex gap-[8px]">
            <dt className="w-[132px] shrink-0 text-dim">Was es nicht ist</dt>
            <dd>
              Kein Ersatz für AVA oder Kalkulation. Die Prüfregeln geben Hinweise mit Norm-Verweis,
              keine Rechtsberatung.
            </dd>
          </div>
          <div className="mt-[6px] flex gap-[8px]">
            <dt className="w-[132px] shrink-0 text-dim">Tastatur</dt>
            <dd>
              Sobald ein LV geladen ist, öffnet <span className="text-ink">Strg/Cmd + K</span> die
              Befehle: Ansicht wechseln, filtern, zu einer OZ springen, exportieren, drucken,
              melden.
            </dd>
          </div>
        </dl>
      </div>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          if (!loading) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          // Während ein Import läuft, würde eine zweite Datei den ersten Lauf
          // überholen und das Ergebnis wäre nicht mehr vorhersagbar.
          if (loading) return;
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={openDialog}
        aria-busy={loading}
        className="flex w-full max-w-[540px] flex-col items-center gap-[14px] bg-white px-[32px] py-[44px] text-center"
        style={{
          border: `1px dashed ${dragging ? 'var(--blue)' : 'var(--line2)'}`,
          background: dragging ? 'var(--blueS)' : 'var(--white)',
          cursor: loading ? 'progress' : 'pointer',
        }}
      >
        <BubbleLogo size={26} />
        <div className="font-sans text-[15px] font-semibold text-ink">
          GAEB-Datei hierher ziehen
        </div>
        <div className="max-w-[420px] font-mono text-[10.5px] leading-[1.6] text-mute">
          GAEB DA XML (X81–X86), Versionen 3.0 bis 3.3, bis {MAX_MB} MB. Die Datei wird
          ausschließlich im Browser verarbeitet — nichts wird hochgeladen, nichts gespeichert.
        </div>
        {/*
          Der Klick auf die Fläche ist eine Mausbequemlichkeit; die bedienbare
          Schaltfläche ist dieser Chip (fokussierbar, Enter/Leertaste). Sein
          Klick darf nicht zusätzlich auf der Fläche landen, sonst öffnet sich
          der Dateidialog zweimal.
        */}
        <span
          className="flex flex-wrap items-center justify-center gap-[8px]"
          onClick={(event) => event.stopPropagation()}
        >
          <Chip on onClick={openDialog}>
            {loading ? 'Wird gelesen…' : 'Datei auswählen'}
          </Chip>
          {DEMO_LVS.map((demo) => (
            <Chip
              key={demo.id}
              onClick={() => openDemo(demo)}
              title={`${demo.title} — ${demo.hint}`}
            >
              {demo.label}
            </Chip>
          ))}
        </span>
        <div className="max-w-[460px] font-mono text-[10px] leading-[1.6] text-mute">
          Keine eigene Datei zur Hand? Zwei Demo-LVs stehen bereit:
          {DEMO_LVS.map((demo) => (
            <span key={demo.id} className="block">
              <span className="text-dim">{demo.label}</span> — {demo.hint}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label="GAEB-Datei auswählen"
          onChange={(event) => {
            void handleFiles(event.target.files);
            // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
            event.target.value = '';
          }}
        />
        {error !== null && (
          <div
            role="alert"
            className="mt-[6px] w-full border px-[12px] py-[10px] text-left font-mono text-[10.5px] leading-[1.6]"
            style={{ borderColor: 'var(--red)', background: '#fef2f2', color: 'var(--redD)' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
