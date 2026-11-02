// „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053): erst Passwort, dann der
// Reiter „Regeln“ mit dem visuellen Regeleditor (Entscheidung 0081,
// components/admin/RulesTab.tsx). Gelernte Begriffe sind dort eigene Regeln (0088);
// gelernt wird im Langtext der Positionskarte — Text markieren, Kategorie wählen. Dazu
// das Treffer-Protokoll der Materialtabellen — ein Prüfwerkzeug, kein Export für
// Kalkulatoren, deshalb nicht im Logo-Menü (Entscheidung 0079).

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { SegmentedControl } from '@conocto/design';
import { useAdmin } from '../../state/admin';
import { RulesTab } from '../admin/RulesTab';

const TABS = [
  { value: 'regeln', label: 'Regeln' },
  { value: 'material', label: 'Material', disabled: true, title: 'Kommt später' },
];

const TOOL_BUTTON =
  'inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';

function Passwort({ onDone }: { onDone: () => void }) {
  const { unlock } = useAdmin();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  return (
    <form
      className="flex flex-col gap-[10px] p-[16px]"
      onSubmit={(event) => {
        event.preventDefault();
        void unlock(value).then((ok) => {
          setWrong(!ok);
          if (ok) onDone();
        });
      }}
    >
      <div className="flex gap-[8px]">
        <input
          type="password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setWrong(false);
          }}
          aria-label="Admin-Passwort"
          placeholder="Passwort"
          autoComplete="off"
          autoFocus
          className="h-[32px] min-w-0 flex-1 rounded-[var(--r-pill)] border border-line bg-panel px-[12px] font-mono text-[13px] text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[14px] font-mono text-[12px] text-white"
        >
          Öffnen
        </button>
      </div>
      {wrong && <span className="font-mono text-[11.5px] text-redD">Passwort falsch</span>}
    </form>
  );
}

export interface AdminDialogProps {
  onClose: () => void;
  /** Treffer-Protokoll der Materialtabellen laden. Fehlt, solange kein LV geladen ist. */
  onTrefferProtokoll?: () => void;
}

export function AdminDialog({ onClose, onTrefferProtokoll }: AdminDialogProps) {
  const { unlocked, lock } = useAdmin();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDismiss(dialogRef, true, onClose);

  return createPortal(
    <div
      className="nur-bildschirm fixed inset-0 z-[60] flex items-start justify-center bg-[var(--backdrop)] pt-[8vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Admin-Werkzeuge"
        className={`ov-window max-h-[84vh] overflow-auto ${
          unlocked ? 'w-[min(1000px,calc(100vw-32px))]' : 'w-[min(560px,calc(100vw-32px))]'
        }`}
      >
        <div className="flex h-[44px] items-center border-b border-line pl-[16px] pr-[6px]">
          <b className="flex-1 font-display text-[14px] font-semibold text-ink">Admin-Werkzeuge</b>
          <button
            type="button"
            onClick={onClose}
            aria-label="Admin-Werkzeuge schließen"
            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>
        {unlocked ? (
          <>
            <div className="flex flex-wrap items-center gap-[8px] border-b border-line px-[16px] py-[10px]">
              <SegmentedControl
                label="Bereich"
                options={TABS}
                value="regeln"
                onChange={() => undefined}
              />
              <span className="flex-1" />
              {onTrefferProtokoll !== undefined && (
                <button
                  type="button"
                  onClick={onTrefferProtokoll}
                  title="Welche Stichworte der Materialtabellen was getroffen haben — gefilterte Positionen"
                  className={TOOL_BUTTON}
                >
                  Treffer-Protokoll (CSV)
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  lock();
                  onClose();
                }}
                className={TOOL_BUTTON}
              >
                Admin beenden
              </button>
            </div>
            <RulesTab />
          </>
        ) : (
          <Passwort onDone={onClose} />
        )}
      </div>
    </div>,
    document.body,
  );
}
