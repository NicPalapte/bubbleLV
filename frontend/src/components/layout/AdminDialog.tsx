// „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053): erst Passwort, dann
// die gelernten Begriffe. Gelernt wird im Langtext der Positionskarte — Text
// markieren, Kategorie wählen. Hier stehen Liste, Löschen und der CSV-Download,
// mit dem die Begriffe in docs/domain/reference/hervorhebungen.csv wandern. Dazu das
// Treffer-Protokoll der Materialtabellen — ein Prüfwerkzeug, kein Export für
// Kalkulatoren, deshalb nicht mehr im Logo-Menü (Entscheidung 0079). Reiter „Regeln":
// visueller Regeleditor (Entscheidung 0081, components/admin/RulesTab.tsx).

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { SegmentedControl } from '@conocto/design';
import { downloadText } from '../../lib/export/download';
import {
  sameTerm,
  TABLE_TERMS,
  TERM_LABELS,
  termsCsv,
  type LearnedTerm,
} from '../../lib/highlight/terms';
import { categoryOf } from '../../lib/spanCategories';
import { useAdmin } from '../../state/admin';
import { RulesTab } from '../admin/RulesTab';

type Tab = 'begriffe' | 'regeln';

const TABS = [
  { value: 'begriffe', label: 'Begriffe' },
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

function Zeile({ term, eigen }: { term: LearnedTerm; eigen: boolean }) {
  const { forget } = useAdmin();
  const color = term.kategorie === 'aus' ? 'var(--mute)' : categoryOf(term.kategorie).color;
  return (
    <tr className="border-b border-line">
      <td className="px-[16px] py-[6px] font-mono text-[12.5px] text-ink">{term.begriff}</td>
      <td className="px-[8px] py-[6px] font-mono text-[12px]" style={{ color }}>
        {TERM_LABELS[term.kategorie]}
      </td>
      <td className="px-[8px] py-[6px] font-mono text-[11.5px] text-mute">
        {eigen ? 'von dir' : 'Tabelle'}
      </td>
      <td className="w-[36px] pr-[10px] text-right">
        {eigen && (
          <button
            type="button"
            onClick={() => forget(term.begriff)}
            aria-label={`${term.begriff} vergessen`}
            title="Vergessen"
            className="cursor-pointer border-none bg-transparent text-mute hover:text-ink"
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}

function Begriffe({ onTrefferProtokoll }: { onTrefferProtokoll?: () => void }) {
  const { learned } = useAdmin();
  // Tabelle zuerst; ein gleicher Begriff von dir ersetzt den Tabelleneintrag.
  const table = TABLE_TERMS.filter(
    (term) => !learned.some((own) => sameTerm(own.begriff, term.begriff)),
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-[8px] px-[16px] py-[10px]">
        <button
          type="button"
          disabled={table.length + learned.length === 0}
          onClick={() =>
            downloadText('hervorhebungen.csv', termsCsv([...table, ...learned]), 'csv')
          }
          title="Tabelle samt deinen Begriffen — ersetzt docs/domain/reference/hervorhebungen.csv"
          className="inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40"
        >
          Als CSV herunterladen
        </button>
        {onTrefferProtokoll !== undefined && (
          <button
            type="button"
            onClick={onTrefferProtokoll}
            title="Welche Stichworte der Materialtabellen was getroffen haben — gefilterte Positionen"
            className="inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2"
          >
            Treffer-Protokoll (CSV)
          </button>
        )}
      </div>
      {table.length + learned.length === 0 ? (
        <p className="m-0 px-[16px] pb-[16px] font-mono text-[12px] text-mute">
          Im Langtext einer Position Text markieren, dann Kategorie wählen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {table.map((term) => (
                <Zeile key={`t-${term.begriff}`} term={term} eigen={false} />
              ))}
              {learned.map((term) => (
                <Zeile key={`e-${term.begriff}`} term={term} eigen />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export interface AdminDialogProps {
  onClose: () => void;
  /** Treffer-Protokoll der Materialtabellen laden. Fehlt, solange kein LV geladen ist. */
  onTrefferProtokoll?: () => void;
}

export function AdminDialog({ onClose, onTrefferProtokoll }: AdminDialogProps) {
  const { unlocked, lock, ruleRequest } = useAdmin();
  const [tab, setTab] = useState<Tab>(ruleRequest === null ? 'begriffe' : 'regeln');
  // „Als Regel…" im Langtext bei offenem Fenster: auf den Reiter „Regeln" wechseln.
  if (ruleRequest !== null && tab !== 'regeln') setTab('regeln');
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
          unlocked && tab === 'regeln'
            ? 'w-[min(1000px,calc(100vw-32px))]'
            : 'w-[min(560px,calc(100vw-32px))]'
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
                value={tab}
                onChange={(value) => setTab(value === 'regeln' ? 'regeln' : 'begriffe')}
              />
              <span className="flex-1" />
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
            {tab === 'regeln' ? <RulesTab /> : <Begriffe onTrefferProtokoll={onTrefferProtokoll} />}
          </>
        ) : (
          <Passwort onDone={onClose} />
        )}
      </div>
    </div>,
    document.body,
  );
}
