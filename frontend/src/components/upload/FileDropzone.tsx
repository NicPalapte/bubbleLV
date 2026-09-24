// Datei laden → lokale Pipeline anstoßen. Drag & Drop + Datei-Dialog, dazu die
// mitgelieferten Demo-LVs zum Ausprobieren ohne eigene Datei — eines mit und
// eines ohne Preise, weil beides in der Praxis vorkommt und die App beides
// unterschiedlich zeigt (lib/pipeline/loadDemoLv.ts).
// Die Datei verlässt den Browser nie: kein Upload, keine Persistenz.

import { useCallback, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { BubbleLogo } from '../ui/BubbleLogo';
import { DEMO_LVS, loadDemoLv, type DemoLv } from '../../lib/pipeline/loadDemoLv';
import { loadLv, LVLoadError } from '../../lib/pipeline/loadLv';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LoadedLV } from '../../lib/pipeline/runPipeline';

const ACCEPT = '.x81,.x82,.x83,.x84,.x85,.x86,.xml,.X81,.X82,.X83,.X84,.X85,.X86,.XML';

export function FileDropzone() {
  const { loading, error } = useViewer();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Beim Überfahren von Kindelementen feuert dragleave, obwohl der Zeiger die
  // Ablage nie verlassen hat — deshalb wird gezählt statt geschaltet.
  const dragDepth = useRef(0);

  /** Ein Ladeweg, eine Fehlerbehandlung — Datei wie Demo-LV. */
  const run = useCallback(
    async (load: () => Promise<LoadedLV>): Promise<void> => {
      dispatch({ type: 'loading' });
      try {
        dispatch({ type: 'loaded', lv: await load() });
      } catch (cause) {
        const message =
          cause instanceof LVLoadError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'Unbekannter Fehler beim Laden der Datei';
        dispatch({ type: 'error', message });
      }
    },
    [dispatch],
  );

  const handleFile = useCallback(
    async (file: File | undefined): Promise<void> => {
      if (file === undefined) return;
      await run(() => loadLv(file));
    },
    [run],
  );

  const openDemo = (demo: DemoLv): void => {
    if (loading) return;
    void run(() => loadDemoLv(demo));
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
          void handleFile(event.dataTransfer.files[0]);
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
          GAEB DA XML (X81–X86), Versionen 3.0 bis 3.3. Die Datei wird ausschließlich im Browser
          verarbeitet — nichts wird hochgeladen, nichts gespeichert.
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
            void handleFile(event.target.files?.[0]);
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
