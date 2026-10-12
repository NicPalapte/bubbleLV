// Datei laden → lokale Pipeline anstoßen. Drag & Drop + Datei-Dialog, dazu die
// mitgelieferten Demo-LVs zum Ausprobieren ohne eigene Datei — eines mit und
// eines ohne Preise, weil beides in der Praxis vorkommt und die App beides
// unterschiedlich zeigt (lib/pipeline/loadDemoLv.ts).
// Die Datei verlässt den Browser nie: kein Upload. Die zuletzt geöffnete eigene
// Datei bleibt in der IndexedDB dieses Browsers (Entscheidung 0046, lib/persist).

import { useCallback, useEffect, useRef, useState } from 'react';
import { BubbleLogo } from '../ui/BubbleLogo';
import { DEMO_LVS, loadDemoLv, type DemoLv } from '../../lib/pipeline/loadDemoLv';
import { GAEB_ENDUNGEN } from '../../lib/gaeb';
import { formatPositions, formatWhen } from '../../lib/format';
import {
  clearLastLv,
  readLastLv,
  readLastLvMeta,
  saveLastLv,
  type LastLvMeta,
} from '../../lib/persist/lastLv';
import { loadLv, loadLvFromBytes, LVLoadError, MAX_FILE_BYTES } from '../../lib/pipeline/loadLv';
import { UNEXPECTED_FAILURE } from '../../lib/pipeline/messages';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LoadedLV } from '../../lib/pipeline/runPipeline';

// Der Dateidialog unterscheidet Groß- und Kleinschreibung der Endung je nach System.
const ACCEPT = GAEB_ENDUNGEN.flatMap((endung) => [`.${endung}`, `.${endung.toUpperCase()}`]).join(
  ',',
);
const MAX_MB = MAX_FILE_BYTES / (1024 * 1024);
const DATEI_BLEIBT =
  'Kein Server, kein Upload, kein Konto. Die zuletzt geöffnete Datei bleibt in diesem ' +
  'Browser gespeichert, bis du sie löschst.';

export function FileDropzone() {
  const { loading, error } = useViewer();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Beim Überfahren von Kindelementen feuert dragleave, obwohl der Zeiger die
  // Ablage nie verlassen hat — deshalb wird gezählt statt geschaltet.
  const dragDepth = useRef(0);
  const [letzte, setLetzte] = useState<LastLvMeta | null>(null);

  useEffect(() => {
    let aktiv = true;
    void readLastLvMeta().then((meta) => {
      if (aktiv) setLetzte(meta);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  /**
   * Ein Ladeweg, eine Fehlerbehandlung — Datei wie Demo-LV. `load` bekommt eine
   * Funktion, mit der es Hinweise melden kann; sie erscheinen nach dem Laden in
   * der Hinweisleiste, weil die Startseite dann verschwunden ist.
   */
  const run = useCallback(
    async (
      load: (onNotice: (message: string) => void) => Promise<LoadedLV>,
      vorab: readonly string[] = [],
    ): Promise<LoadedLV | null> => {
      dispatch({ type: 'loading' });
      const notices = [...vorab];
      try {
        const lv = await load((message) => notices.push(message));
        dispatch({ type: 'loaded', lv, notices });
        return lv;
      } catch (cause) {
        // Ein erwarteter Fehler (leere Datei, falsches Format …) erklärt sich selbst.
        // Ein unerwarteter ist ein Bug: seine Ursache steht am Fehler und gehört in
        // die Konsole, genau wie bei einem Absturz (ErrorBoundary). Die UI zeigt
        // trotzdem nur den deutschen Satz; der Systemtext wäre Englisch.
        if (!(cause instanceof LVLoadError) || cause.code === 'unknown') {
          console.error('Unerwarteter Fehler beim Laden:', cause);
        }
        dispatch({
          type: 'error',
          message: cause instanceof LVLoadError ? cause.message : UNEXPECTED_FAILURE,
        });
        return null;
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
      const lv = await run((onNotice) => loadLv(file, { onNotice }), vorab);
      // Erst nach erfolgreichem Laden merken: eine kaputte Datei soll nicht die
      // letzte gute ersetzen. Demo-LVs werden nie gespeichert.
      if (lv !== null) await merke(lv, await file.arrayBuffer());
    },
    [run],
  );

  const openLetzte = (): void => {
    if (loading) return;
    void (async () => {
      const lv = await run(async (onNotice) => {
        const gespeichert = await readLastLv();
        if (gespeichert === null) {
          setLetzte(null);
          throw new LVLoadError(
            'gespeichert',
            'Die zuletzt geöffnete Datei ist in diesem Browser nicht mehr gespeichert.',
          );
        }
        letzteBytes.current = gespeichert.bytes;
        return loadLvFromBytes(gespeichert.bytes, gespeichert.meta.fileName, { onNotice });
      });
      // Zeitpunkt auffrischen, damit „gestern 16:42" das letzte Öffnen meint.
      if (lv !== null && letzteBytes.current !== null) await merke(lv, letzteBytes.current);
      letzteBytes.current = null;
    })();
  };

  const vergiss = (): void => {
    setLetzte(null);
    void clearLastLv();
  };

  const letzteBytes = useRef<ArrayBuffer | null>(null);

  const openDemo = (demo: DemoLv): void => {
    if (loading) return;
    void run((onNotice) => loadDemoLv(demo, { onNotice }));
  };

  const openDialog = (): void => {
    if (loading) return;
    inputRef.current?.click();
  };

  const ohnePreise = DEMO_LVS.find((demo) => demo.id === 'muster') ?? DEMO_LVS[0];
  const weitere = DEMO_LVS.filter((demo) => demo !== ohnePreise);

  return (
    <div className="start">
      <div className="start-in">
        <div className="start-brand">
          <BubbleLogo size={40} />
          <h1 className="sr-only">bubble – LV-Viewer</h1>
          <p className="start-tag">Erlebe dein Leistungsverzeichnis wie nie zuvor.</p>
        </div>

        <div className="start-grid">
          <div className="start-col">
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
              className={`start-card start-drop${dragging ? ' over' : ''}`}
              style={{ cursor: loading ? 'progress' : 'pointer' }}
            >
              <span className="start-ring" aria-hidden="true">
                ⇪
              </span>
              <h2 className="start-title">Eigenes LV öffnen</h2>
              <span className="start-sub">GAEB-Datei hierher ziehen</span>
              {/*
              Der Klick auf die Fläche ist eine Mausbequemlichkeit; die bedienbare
              Schaltfläche ist dieser Knopf (fokussierbar, Enter/Leertaste). Sein
              Klick darf nicht zusätzlich auf der Fläche landen, sonst öffnet sich
              der Dateidialog zweimal.
            */}
              <button
                type="button"
                className="start-btn primary"
                onClick={(event) => {
                  event.stopPropagation();
                  openDialog();
                }}
              >
                {loading ? 'Wird gelesen…' : 'Datei auswählen'}
              </button>
              <span className="start-meta">x81 – x86 · xml · bis {MAX_MB} MB</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                aria-label="GAEB-Datei auswählen"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  void handleFiles(event.target.files);
                  // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
                  event.target.value = '';
                }}
              />
            </div>
            {letzte !== null && (
              <LetzteDatei meta={letzte} loading={loading} onOpen={openLetzte} onForget={vergiss} />
            )}
          </div>

          {/*
            Erste Nutzer sind Bauunternehmer — ihre LVs kommen meist ohne
            Preise. Deshalb ist die Demo ohne Preise der Hauptknopf.
          */}
          <div className="start-card start-demo">
            <DemoArt />
            <h2 className="start-title">Demo-LV ansehen</h2>
            <span className="start-sub">{ohnePreise.title}</span>
            <span className="start-meta">{ohnePreise.hint}</span>
            <span className="flex flex-wrap justify-center gap-[8px]">
              <button
                type="button"
                className="start-btn primary"
                onClick={() => openDemo(ohnePreise)}
                title={ohnePreise.hint}
              >
                {ohnePreise.label}
              </button>
              {weitere.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  className="start-btn"
                  onClick={() => openDemo(demo)}
                  title={`${demo.title} — ${demo.hint}`}
                >
                  {demo.label}
                </button>
              ))}
            </span>
          </div>
        </div>

        {error !== null && (
          <div
            role="alert"
            className="w-full rounded-[var(--r-md)] border px-[12px] py-[10px] text-left font-mono text-[10.5px] leading-[1.6]"
            style={{ borderColor: 'var(--red)', background: 'var(--redS)', color: 'var(--redD)' }}
          >
            {error}
          </div>
        )}

        {/*
          Drei Sätze statt einer Anleitung: der Rest erschließt sich in der App.
          Die Frage „wo landet meine Datei" bleibt beantwortet (Issue #72).
        */}
        <ul className="start-tips">
          <li>
            <span className="start-tip-dot" aria-hidden="true" />
            Bubble anklicken öffnet die Details
          </li>
          <li>
            <span className="start-tip-ring" aria-hidden="true" />
            Hinweise stehen direkt im Graphen
          </li>
          <li title={DATEI_BLEIBT}>
            <span className="start-tip-lock" aria-hidden="true">
              ●
            </span>
            Die Datei bleibt im Browser
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Speichert das geladene LV als „letzte Datei"; Fehler beim Speichern bleiben still. */
async function merke(lv: LoadedLV, bytes: ArrayBuffer): Promise<void> {
  await saveLastLv(
    { fileName: lv.fileName, positionCount: lv.summary.positionCount, savedAt: Date.now() },
    bytes,
  );
}

interface LetzteDateiProps {
  meta: LastLvMeta;
  loading: boolean;
  onOpen: () => void;
  onForget: () => void;
}

/** Feld unter der Ablage: zuletzt geöffnete Datei öffnen oder löschen. */
function LetzteDatei({ meta, loading, onOpen, onForget }: LetzteDateiProps) {
  // Löschen fragt im Feld selbst nach; ein Browser-Dialog passt nicht zur Startseite.
  const [fragen, setFragen] = useState(false);

  if (fragen) {
    return (
      <div className="start-recent ask" role="group" aria-label="Gespeichertes Projekt löschen">
        <span className="start-recent-q">Gespeicherte Datei löschen?</span>
        <button type="button" className="start-btn danger" onClick={onForget}>
          Löschen
        </button>
        <button type="button" className="start-btn" onClick={() => setFragen(false)}>
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div
      className="start-recent"
      onClick={onOpen}
      aria-busy={loading}
      style={{ cursor: loading ? 'progress' : 'pointer' }}
    >
      <span className="start-recent-ic" aria-hidden="true">
        ↺
      </span>
      <span className="start-recent-txt">
        <span className="start-recent-name" title={meta.fileName}>
          {meta.fileName}
        </span>
        <span className="start-recent-meta">
          <span>{formatPositions(meta.positionCount)}</span>
          <span>{formatWhen(meta.savedAt)}</span>
        </span>
      </span>
      {/* Wie bei der Ablage: der Knopf ist das bedienbare Element, die Fläche Bequemlichkeit. */}
      <button
        type="button"
        className="start-btn primary"
        aria-label={`Letzte Datei öffnen: ${meta.fileName}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        {loading ? 'Wird gelesen…' : 'Öffnen'}
      </button>
      <button
        type="button"
        className="start-recent-x"
        aria-label="Gespeicherte Datei löschen"
        title="Gespeicherte Datei löschen"
        onClick={(event) => {
          event.stopPropagation();
          setFragen(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}

/** Kleines Bild auf der Demo-Karte: drei Gruppen mit Positionen, eine mit Hinweis. */
function DemoArt() {
  return (
    <svg className="start-art" viewBox="0 0 220 120" aria-hidden="true">
      <circle cx="70" cy="62" r="44" className="g g1" />
      <circle cx="150" cy="48" r="30" className="g g2" />
      <circle cx="168" cy="98" r="18" className="g g3" />
      <g className="p1">
        <circle cx="58" cy="50" r="6" />
        <circle cx="76" cy="46" r="4" />
        <circle cx="84" cy="64" r="7" />
        <circle cx="62" cy="72" r="5" />
        <circle cx="72" cy="88" r="4" />
        <circle cx="46" cy="66" r="3.5" />
        <circle cx="95" cy="80" r="3" />
      </g>
      <g className="p2">
        <circle cx="142" cy="42" r="5" />
        <circle cx="158" cy="52" r="4" />
        <circle cx="146" cy="60" r="3" />
        <circle cx="160" cy="36" r="3" />
      </g>
      <g className="p3">
        <circle cx="164" cy="96" r="3.5" />
        <circle cx="174" cy="100" r="2.5" />
      </g>
      <circle cx="84" cy="64" r="11" fill="none" stroke="var(--amber)" strokeWidth="2" />
    </svg>
  );
}
