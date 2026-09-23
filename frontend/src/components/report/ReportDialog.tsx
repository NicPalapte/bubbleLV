// „Fehler melden" (WP-P, Schritt 6) — drei Wege zur selben Meldung.
//
// **Warum nicht nur GitHub:** der Knopf führte bisher direkt auf ein
// vorbefülltes GitHub-Formular. Wer kein Konto hat, landet dort auf der
// Anmeldeseite und kommt nicht weiter — GitHub kennt keine anonymen Meldungen.
// Für ein Werkzeug, das Kalkulatoren und AVA-Fachkräfte benutzen, ist das die
// Mehrheit. Also: Text kopieren, per Mail schicken oder — wer ein Konto hat —
// direkt als Issue öffnen. Alle drei tragen denselben Text
// (docs/decisions/0024-fehler-melden-ohne-konto.md).
//
// **Kein Request.** Die Zwischenablage ist lokal, `mailto:` übergibt an das
// Mailprogramm, der GitHub-Link öffnet einen neuen Tab. Nichts wird von selbst
// verschickt, und aus der geladenen Datei steht nichts im Text.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Chip } from '../ui/Chip';
import { issueBody, issueUrl, mailtoUrl, type IssueContext } from '../../lib/export/issueLink';

export interface ReportDialogProps {
  context: IssueContext;
  onClose: () => void;
}

type Kopierstand = 'bereit' | 'kopiert' | 'fehlgeschlagen';

export function ReportDialog({ context, onClose }: ReportDialogProps) {
  const [beschreibung, setBeschreibung] = useState('');
  const [kopiert, setKopiert] = useState<Kopierstand>('bereit');
  const feldRef = useRef<HTMLTextAreaElement>(null);
  const text = issueBody(context, beschreibung);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fokussiere = useCallback((element: HTMLTextAreaElement | null): void => {
    element?.focus();
  }, []);

  const kopieren = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert('kopiert');
    } catch {
      // Die Zwischenablage braucht eine sichere Verbindung und die Erlaubnis
      // des Browsers. Fehlt eine von beiden, bleibt der Text markiert stehen —
      // Strg+C tut es dann auch.
      setKopiert('fehlgeschlagen');
      const feld = feldRef.current;
      if (feld !== null) {
        feld.focus();
        feld.select();
      }
    }
  };

  return createPortal(
    <div
      className="nur-bildschirm"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '8vh',
        background: 'rgba(26,37,51,0.12)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Fehler melden"
        style={{
          width: 'min(640px, calc(100vw - 32px))',
          maxHeight: '84vh',
          overflow: 'auto',
          background: 'var(--white)',
          border: '1px solid var(--line2)',
          boxShadow: 'var(--shadow-popover)',
          fontFamily: 'var(--mono)',
          fontSize: 'var(--fs-meta)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid var(--line)',
            color: 'var(--mute)',
            letterSpacing: 'var(--ls-caps)',
            fontSize: 'var(--fs-label)',
            textTransform: 'uppercase',
          }}
        >
          <span>Fehler melden</span>
          <span>ESC</span>
        </div>

        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--dim)' }}>Was ist passiert?</span>
            <textarea
              ref={fokussiere}
              value={beschreibung}
              onChange={(event) => {
                setBeschreibung(event.target.value);
                setKopiert('bereit');
              }}
              rows={4}
              placeholder="Kurz beschreiben — was war zu sehen, was wurde erwartet?"
              style={{
                border: '1px solid var(--line2)',
                padding: '8px',
                font: 'inherit',
                color: 'var(--ink)',
                resize: 'vertical',
              }}
            />
          </label>

          <p style={{ color: 'var(--mute)', lineHeight: 1.6 }}>
            Aus der geladenen Datei steht nichts in der Meldung: kein Dateiname, keine Positionen,
            keine Mengen oder Preise. Nur Browser, Fenstergröße, Bubble-Stand und die Ansicht.
            Vertrauliches aus dem LV gehört auch nicht in das Feld oben.
          </p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--dim)' }}>Das wird weitergegeben</span>
            <textarea
              ref={feldRef}
              readOnly
              value={text}
              rows={10}
              aria-label="Meldetext"
              style={{
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                padding: '8px',
                font: 'inherit',
                color: 'var(--dim)',
                resize: 'vertical',
              }}
            />
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Chip on onClick={() => void kopieren()}>
              ⧉ Text kopieren
            </Chip>
            <Chip
              onClick={() => {
                window.location.href = mailtoUrl(context, beschreibung);
              }}
              title="Öffnet eine neue Mail; die Adresse trägst du selbst ein"
            >
              ✉ Als E-Mail öffnen
            </Chip>
            <Chip
              onClick={() =>
                window.open(issueUrl(context, beschreibung), '_blank', 'noopener,noreferrer')
              }
              title="Öffnet ein vorbefülltes Formular auf GitHub"
            >
              ↗ Als GitHub-Issue (Konto nötig)
            </Chip>
            {kopiert !== 'bereit' && (
              <span style={{ color: kopiert === 'kopiert' ? 'var(--greenD)' : 'var(--redD)' }}>
                {kopiert === 'kopiert'
                  ? 'kopiert'
                  : 'Kopieren nicht möglich — Text ist markiert, Strg+C'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
