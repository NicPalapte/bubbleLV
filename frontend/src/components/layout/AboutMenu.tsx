// „Über diese App" hinter dem Logo (Issue #71, Punkt aus Issue #80).
//
// **Warum hinter dem Logo:** Version, Änderungen, Impressum und Datenschutz
// braucht man selten, aber man muss sie finden. In der Kopfleiste kosten sie
// dauerhaft Platz, den Ansichten und Filter dringender brauchen — bei 1440 px
// passt dort schon heute keine Filterzeile mehr hin. Das Logo ist der Ort, an
// dem Nutzer so etwas suchen.
//
// „Fehler melden" sitzt ebenfalls hier und nicht mehr im Menü „Mitnehmen":
// eine Meldung ist kein Export.

//
// Seit dem neuen Hauptscreen auch hier: „Anderes LV öffnen" und Hell/Dunkel —
// beides braucht man selten, und die Kopfleiste soll schmal bleiben.

import { useCallback, useRef, useState } from 'react';
import { BubbleLogo } from '../ui/BubbleLogo';
import { Popover, PopoverRow } from '../ui/Popover';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useDismiss } from '../common/useDismiss';
import { useTheme } from '../common/useTheme';
import { APP_VERSION, BUILD_ID, buildDate } from '../../lib/version';
import type { Theme } from '../../lib/theme';

const CHANGELOG_URL = 'https://github.com/NicPalapte/bubbleLV/blob/main/CHANGELOG.md';

export interface AboutMenuProps {
  /**
   * „Fehler melden" gewählt. Das Fenster hängt in der Kopfleiste, nicht hier:
   * solange es offen ist, darf die Kommandopalette nicht dazwischenfunken.
   */
  onFehlerMelden: () => void;
  /** „Anderes LV öffnen" — zurück zur Startseite. Fehlt, solange kein LV geladen ist. */
  onAnderesLv?: () => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const;

function Trenner() {
  return <hr className="mx-[4px] my-[4px] border-0 border-t border-line" />;
}

/** Zeile ohne Schaltflächen-Verhalten — reine Angabe, nichts zum Anklicken. */
function Angabe({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="flex items-center justify-between gap-[8px] px-[10px] py-[6px] font-mono text-[10.5px]">
      <span className="text-mute">{label}</span>
      <span className="text-ink">{wert}</span>
    </div>
  );
}

export function AboutMenu({ onFehlerMelden, onAnderesLv }: AboutMenuProps) {
  const [open, setOpen] = useState(false);
  const [theme, chooseTheme] = useTheme();
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

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
        // Ohne eigenen Namen hieße die Schaltfläche „bubble ▾" — das sagt
        // niemandem, was sie tut, weder am Bildschirmleser noch im Test.
        aria-label="Über diese App"
        title="Über diese App: Version, Änderungen, Fehler melden"
        className="mx-[8px] flex cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] py-[5px] hover:bg-sunken aria-expanded:bg-sunken"
      >
        <BubbleLogo size={22} />
        <span className="font-mono text-[9px] text-mute">▾</span>
      </button>
      <Popover ref={popoverRef} open={open} width={272} anchorRef={anchorRef}>
        <div className="flex flex-col gap-[2px] px-[10px] pb-[8px] pt-[8px]">
          <span className="font-sans text-[15px] font-bold text-ink">bubble</span>
          <span className="font-mono text-[10px] text-mute">
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
        <PopoverRow
          onClick={() => {
            // Öffnet GitHub in einem neuen Tab — erst auf Klick, und ohne
            // etwas aus der geladenen Datei mitzugeben.
            window.open(CHANGELOG_URL, '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
          title="Was sich in dieser Version geändert hat (öffnet GitHub)"
        >
          Was ist neu ↗
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
          Impressum und Datenschutz stehen als Angabe da, nicht als Link ins
          Leere: die Texte brauchen Angaben des Betreibers (Issues #75, #76).
          Ein Link, der auf eine leere Seite führt, wäre schlechter als der
          ehrliche Hinweis.
        */}
        <Angabe label="Impressum" wert="folgt" />
        <Angabe label="Datenschutz" wert="folgt" />
      </Popover>
    </div>
  );
}
