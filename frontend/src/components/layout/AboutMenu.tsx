// „Über diese App" hinter dem Logo (Issue #71, Punkt aus Issue #80).
//
// **Warum hinter dem Logo:** Version, Änderungen, Impressum und Datenschutz
// braucht man selten, aber man muss sie finden. In der Kopfleiste kosten sie
// dauerhaft Platz, den Ansichten und Filter dringender brauchen — bei 1440 px
// passt dort schon heute keine Filterzeile mehr hin. Das Logo ist der Ort, an
// dem Nutzer so etwas suchen.
//
// Seit Entscheidung 0079 gruppiert: oben Öffnen, dann aufklappbare Gruppen „Exportieren“,
// „Meine Notizen“, „Hilfe & Feedback“, unten Design und eine Fußzeile.
//
// „Fehler melden" sitzt ebenfalls hier und nicht mehr im Menü „Mitnehmen":
// eine Meldung ist kein Export.

//
// Seit dem neuen Hauptscreen auch hier: „Anderes LV öffnen" und Hell/Dunkel —
// beides braucht man selten, und die Kopfleiste soll schmal bleiben. Seit es
// keine Befehlspalette mehr gibt, auch Export und Druck (Entscheidung 0038).

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ConoctoLogo } from '@conocto/design';
import { Popover, PopoverRow } from '../ui/Popover';
import { SegmentedControl } from '@conocto/design';
import { useDismiss } from '../common/useDismiss';
import { useTheme } from '../common/useTheme';
import type { Mitnehmen } from '../common/useMitnehmen';
import { APP_VERSION, BUILD_ID, buildDate } from '../../lib/version';
import type { Theme } from '../../lib/theme';

// Liegt neben der App, erzeugt beim Build (frontend/build/thirdPartyLicenses.ts).
const LIZENZEN_URL = `${import.meta.env.BASE_URL}lizenzen.txt`;

export interface AboutMenuProps {
  /**
   * „Fehler melden" gewählt. Das Fenster hängt in der Kopfleiste, nicht hier —
   * das Menü schließt sich beim Klick.
   */
  onFehlerMelden: () => void;
  /** „Anderes LV öffnen" — zurück zur Startseite. Fehlt, solange kein LV geladen ist. */
  onAnderesLv?: () => void;
  /**
   * „PDF hinzufügen…" gewählt (Entscheidung 0072); der Dateidialog hängt in der
   * Kopfleiste. Fehlt, solange kein LV geladen ist.
   */
  onPdfHinzufuegen?: () => void;
  /** „Tour" gewählt. Fehlt, solange kein LV geladen ist — die Tour zeigt auf den Graphen. */
  onTour?: () => void;
  /** „Feedback geben" gewählt (Entscheidung 0071). Fehlt, solange kein LV geladen ist. */
  onFeedback?: () => void;
  /** „Tastenkürzel" gewählt; das Fenster hängt wie „Fehler melden" in der Kopfleiste. */
  onTastenkuerzel: () => void;
  /** Export und Druck der gefilterten Menge. Fehlt, solange kein LV geladen ist. */
  mitnehmen?: Mitnehmen;
  /**
   * „Notizen laden…" gewählt (Entscheidung 0061); Dateidialog und Fenster hängen in der
   * Kopfleiste. Fehlt, solange kein LV geladen ist.
   */
  onNotizenLaden?: () => void;
  /** Positionen mit eigener Notiz; „Notizen sichern" erscheint nur, wenn es welche gibt. */
  notizen?: number;
  /** „Admin-Werkzeuge" gewählt (Entscheidung 0053); Fenster hängt in der Kopfleiste. */
  onAdmin: () => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const;

function Trenner() {
  return <hr className="mx-[4px] my-[4px] border-0 border-t border-line" />;
}

type GruppenName = 'Exportieren' | 'Meine Notizen' | 'Hilfe & Feedback';

/**
 * Aufklappbare Gruppe im Menü. Klappt an Ort und Stelle auf statt seitlich — ein
 * Seitenmenü auf Hover gibt es am Tablet nicht.
 */
function Gruppe({
  name,
  offen,
  umschalten,
  children,
}: {
  name: GruppenName;
  offen: ReadonlySet<GruppenName>;
  umschalten: (name: GruppenName) => void;
  children: ReactNode;
}) {
  const auf = offen.has(name);
  return (
    <>
      <button
        type="button"
        onClick={() => umschalten(name)}
        aria-expanded={auf}
        className="flex w-full cursor-pointer items-center justify-between gap-[8px] rounded-[var(--r-sm)] border-none bg-transparent text-left text-ink hover:bg-sunken"
        style={{ padding: 'var(--pad-popover-row)', font: 'inherit' }}
      >
        {name}
        <span
          aria-hidden="true"
          className={`font-mono text-[12px] text-mute transition-transform motion-reduce:transition-none ${auf ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>
      {auf && (
        <div
          role="group"
          aria-label={name}
          className="mb-[4px] ml-[10px] flex flex-col border-l border-line pl-[6px]"
        >
          {children}
        </div>
      )}
    </>
  );
}

/** Kleiner Textlink in der Fußzeile. */
function FussLink({
  onClick,
  title,
  label,
  children,
}: {
  onClick: () => void;
  title: string;
  /** Name für Bildschirmleser, wenn der sichtbare Text zu knapp ist. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className="cursor-pointer border-none bg-transparent p-0 py-[6px] text-[12px] text-mute underline underline-offset-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

export function AboutMenu({
  onFehlerMelden,
  onTastenkuerzel,
  onTour,
  onFeedback,
  onAnderesLv,
  onPdfHinzufuegen,
  mitnehmen,
  onNotizenLaden,
  notizen,
  onAdmin,
}: AboutMenuProps) {
  const [open, setOpen] = useState(false);
  const [theme, chooseTheme] = useTheme();
  // Beim Start alle zu. Bleibt zwischen zwei Öffnungen erhalten: wer gerade exportiert,
  // findet die Gruppe offen wieder.
  const [offen, setOffen] = useState<ReadonlySet<GruppenName>>(() => new Set());
  const umschalten = useCallback((name: GruppenName) => {
    setOffen((alt) => {
      const neu = new Set(alt);
      if (!neu.delete(name)) neu.add(name);
      return neu;
    });
  }, []);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  // Erst schließen, dann wirken: `window.print()` blockiert den Aufbau der
  // Druckseite, ein offenes Menü stünde sonst mit auf dem Blatt.
  const nimmMit = (wirkung: () => void): void => {
    flushSync(() => setOpen(false));
    wirkung();
  };

  const datum = buildDate();
  const stand = datum === '' ? BUILD_ID : `${BUILD_ID} · ${datum}`;

  return (
    <div ref={anchorRef} className="flex items-center">
      {/*
        Das Logo ist die Schaltfläche. Das „▾" deutet an, dass sich dahinter
        etwas öffnet — ohne den Hinweis probiert es niemand aus.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        // Ohne eigenen Namen hieße die Schaltfläche „conocto ▾" — das sagt
        // niemandem, was sie tut, weder am Bildschirmleser noch im Test.
        aria-label="Über diese App"
        data-tour="menu"
        title="Über diese App: Export, Notizen, Hilfe"
        className="mx-[8px] flex cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] py-[5px] hover:bg-sunken aria-expanded:bg-sunken"
      >
        <ConoctoLogo size={22} />
        <span className="font-mono text-[11px] text-mute">▾</span>
      </button>
      <Popover ref={popoverRef} open={open} width={272} anchorRef={anchorRef}>
        <div className="flex flex-col gap-[2px] px-[10px] pb-[8px] pt-[8px]">
          <span className="font-display text-[15px] font-bold text-ink">conocto</span>
          <span className="font-mono text-[11px] text-mute">
            <span>v{APP_VERSION}</span> · <span>{stand}</span>
          </span>
        </div>
        {onAnderesLv !== undefined && (
          <PopoverRow
            onClick={() => {
              setOpen(false);
              onAnderesLv();
            }}
            title="Dieses LV schließen und ein anderes öffnen"
          >
            Anderes LV öffnen
          </PopoverRow>
        )}
        {onPdfHinzufuegen !== undefined && (
          <PopoverRow
            onClick={() => {
              setOpen(false);
              onPdfHinzufuegen();
            }}
            title="Baubeschreibung, Gutachten o. Ä. neben dem LV lesen — oder PDF auf die App ziehen"
          >
            PDF hinzufügen…
          </PopoverRow>
        )}
        {mitnehmen !== undefined && (
          <>
            <Trenner />
            <Gruppe name="Exportieren" offen={offen} umschalten={umschalten}>
              <PopoverRow
                onClick={() => nimmMit(mitnehmen.positionenAlsCsv)}
                title="Die gefilterten Positionen als Tabelle für Excel"
              >
                Positionen als Tabelle (CSV)
              </PopoverRow>
              <PopoverRow
                onClick={() => nimmMit(mitnehmen.hinweiseAlsMarkdown)}
                title="Die Hinweise der Prüfung im aktuellen Filter als Textdatei"
              >
                Prüfhinweise als Text
              </PopoverRow>
              <PopoverRow
                onClick={() => nimmMit(mitnehmen.drucken)}
                title="Die gefilterten Positionen drucken oder als PDF sichern"
              >
                Drucken / als PDF
              </PopoverRow>
            </Gruppe>
            <Gruppe name="Meine Notizen" offen={offen} umschalten={umschalten}>
              {notizen !== undefined && notizen > 0 && (
                <PopoverRow
                  onClick={() => nimmMit(mitnehmen.notizenSichern)}
                  title="Alle eigenen Marker und Kommentare als Datei — zum Aufheben oder Weitergeben"
                  trailing={<span className="font-mono text-[11px] text-mute">{notizen}</span>}
                >
                  Notizen sichern
                </PopoverRow>
              )}
              {onNotizenLaden !== undefined && (
                <PopoverRow
                  onClick={() => {
                    setOpen(false);
                    onNotizenLaden();
                  }}
                  title="Gesicherte Notizen zu diesem LV übernehmen"
                >
                  Notizen laden…
                </PopoverRow>
              )}
            </Gruppe>
          </>
        )}
        <Gruppe name="Hilfe & Feedback" offen={offen} umschalten={umschalten}>
          {onTour !== undefined && (
            <PopoverRow
              onClick={() => {
                setOpen(false);
                onTour();
              }}
              title="Die wichtigsten Bedienelemente Schritt für Schritt"
            >
              Tour
            </PopoverRow>
          )}
          <PopoverRow
            onClick={() => {
              setOpen(false);
              onTastenkuerzel();
            }}
            title="Alle Tasten auf einen Blick (auch mit „?“)"
          >
            Tastenkürzel
          </PopoverRow>
          <PopoverRow
            onClick={() => {
              setOpen(false);
              onFehlerMelden();
            }}
            title="Fertige Meldung zum Kopieren, Mailen oder als GitHub-Issue — ohne Inhalte aus deiner Datei"
          >
            Fehler melden
          </PopoverRow>
          {onFeedback !== undefined && (
            <PopoverRow
              onClick={() => {
                setOpen(false);
                onFeedback();
              }}
              title="Drei kurze Fragen zu Conocto"
            >
              Feedback geben
            </PopoverRow>
          )}
        </Gruppe>
        <Trenner />
        <div className="flex items-center justify-between gap-[8px] px-[10px] py-[4px] text-ink">
          <span>Design</span>
          {/* Die Wahl hält bis zum Reload (lib/theme.ts); das Menü bleibt
              dabei offen, damit man beide Sätze vergleichen kann. */}
          <SegmentedControl
            label="Design"
            options={THEME_OPTIONS}
            value={theme}
            onChange={(value) => chooseTheme(value as Theme)}
          />
        </div>
        <Trenner />
        {/*
          Fußzeile: Pflichtangaben und Admin — selten gebraucht, aber auffindbar.
          Impressum und Datenschutz stehen als Angabe da, nicht als Link ins
          Leere: die Texte brauchen Angaben des Betreibers (Issues #75, #76).
        */}
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[2px] px-[10px] pb-[4px] pt-[2px] text-[12px] text-mute">
          <span>Impressum folgt</span>
          <span>Datenschutz folgt</span>
          <FussLink
            onClick={() => {
              window.open(LIZENZEN_URL, '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
            title="Conocto: alle Rechte vorbehalten. Dazu die Lizenzen der verwendeten Bausteine"
          >
            Lizenzen ↗
          </FussLink>
          <FussLink
            onClick={() => {
              setOpen(false);
              onAdmin();
            }}
            title="Admin-Werkzeuge — nur mit Passwort"
            label="Admin-Werkzeuge"
          >
            Admin
          </FussLink>
        </div>
      </Popover>
    </div>
  );
}
