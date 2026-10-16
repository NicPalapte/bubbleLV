// „Admin-Werkzeuge" aus dem Logo-Menü (Entscheidung 0053): erst Passwort, dann
// die gelernten Begriffe. Gelernt wird im Langtext der Positionskarte — Text
// markieren, Kategorie wählen. Hier stehen Liste, Löschen und der CSV-Download,
// mit dem die Begriffe in docs/domain/reference/hervorhebungen.csv wandern.

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { SegmentedControl } from '../ui/SegmentedControl';
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

const TABS = [
  { value: 'begriffe', label: 'Begriffe' },
  { value: 'material', label: 'Material', disabled: true, title: 'Kommt später' },
  { value: 'pruefregeln', label: 'Prüfregeln', disabled: true, title: 'Kommt später' },
];

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
          className="h-[32px] min-w-0 flex-1 rounded-[var(--r-pill)] border border-line bg-panel px-[12px] font-mono text-[12px] text-ink outline-none focus:border-blue"
        />
        <button
          type="submit"
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-blue px-[14px] font-mono text-[11px] text-white"
        >
          Öffnen
        </button>
      </div>
      {wrong && <span className="font-mono text-[10.5px] text-redD">Passwort falsch</span>}
    </form>
  );
}

function Zeile({ term, eigen }: { term: LearnedTerm; eigen: boolean }) {
  const { forget } = useAdmin();
  const color = term.kategorie === 'aus' ? 'var(--mute)' : categoryOf(term.kategorie).color;
  return (
    <tr className="border-b border-line">
      <td className="px-[16px] py-[6px] font-mono text-[11.5px] text-ink">{term.begriff}</td>
      <td className="px-[8px] py-[6px] font-mono text-[11px]" style={{ color }}>
        {TERM_LABELS[term.kategorie]}
      </td>
      <td className="px-[8px] py-[6px] font-mono text-[10.5px] text-mute">
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

function Begriffe({ onClose }: { onClose: () => void }) {
  const { learned, lock } = useAdmin();
  // Tabelle zuerst; ein gleicher Begriff von dir ersetzt den Tabelleneintrag.
  const table = TABLE_TERMS.filter(
    (term) => !learned.some((own) => sameTerm(own.begriff, term.begriff)),
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-[8px] px-[16px] py-[10px]">
        <SegmentedControl label="Bereich" options={TABS} value="begriffe" onChange={() => {}} />
        <span className="flex-1" />
        <button
          type="button"
          disabled={table.length + learned.length === 0}
          onClick={() =>
            downloadText('hervorhebungen.csv', termsCsv([...table, ...learned]), 'csv')
          }
          title="Tabelle samt deinen Begriffen — ersetzt docs/domain/reference/hervorhebungen.csv"
          className="inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[10.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40"
        >
          Als CSV herunterladen
        </button>
        <button
          type="button"
          onClick={() => {
            lock();
            onClose();
          }}
          className="inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[10.5px] text-ink hover:border-line2"
        >
          Admin beenden
        </button>
      </div>
      {table.length + learned.length === 0 ? (
        <p className="m-0 px-[16px] pb-[16px] font-mono text-[11px] text-mute">
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

export function AdminDialog({ onClose }: { onClose: () => void }) {
  const { unlocked } = useAdmin();
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
        className="ov-window max-h-[84vh] w-[min(560px,calc(100vw-32px))] overflow-auto"
      >
        <div className="flex h-[44px] items-center border-b border-line pl-[16px] pr-[6px]">
          <b className="flex-1 font-sans text-[14px] font-semibold text-ink">Admin-Werkzeuge</b>
          <button
            type="button"
            onClick={onClose}
            aria-label="Admin-Werkzeuge schließen"
            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>
        {unlocked ? <Begriffe onClose={onClose} /> : <Passwort onDone={() => undefined} />}
      </div>
    </div>,
    document.body,
  );
}
