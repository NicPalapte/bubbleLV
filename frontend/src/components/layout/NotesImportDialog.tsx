// „Notizen laden…" aus dem Logo-Menü (Entscheidung 0061): zeigt, welche Einträge der
// Notiz-Datei zu welchen Positionen passen, und übernimmt sie erst auf Klick.

import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { formatAt } from '../../lib/annotations';
import { matchNotes, mergeNotes, type NotesFile, type NotesMatch } from '../../lib/notesFile';
import { countEvent } from '../../lib/usage/count';
import { useViewer, useViewerDispatch } from '../../state/viewer';

interface Props {
  file: NotesFile;
  fileName: string;
  onClose: () => void;
}

interface Row {
  key: string;
  oz: string;
  text: string;
  label: string;
  tone: 'blue' | 'amber' | 'red';
}

const TONE = {
  blue: 'bg-blueS text-blueD',
  amber: 'bg-[var(--amberS)] text-[var(--amber)]',
  red: 'bg-[var(--redS)] text-[var(--redD)]',
} as const;

function Kachel({ zahl, label, farbe }: { zahl: number; label: string; farbe: string }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line px-[12px] py-[8px]">
      <span className="font-mono text-[18px] font-semibold" style={{ color: farbe }}>
        {zahl}
      </span>
      <span className="font-mono text-[10px] text-dim">{label}</span>
    </div>
  );
}

function Haken({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-[8px] font-mono text-[11px] text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function NotesImportDialog({ file, fileName, onClose }: Props) {
  const { index, annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDismiss(dialogRef, true, onClose);
  const matching = useMemo(() => matchNotes(file, index.nodes), [file, index]);
  const [mitUmnummerierten, setMitUmnummerierten] = useState(true);
  // Passt keine Position inhaltlich, stammt die Datei wohl aus einem anderen LV: dann
  // wären Treffer nur über die OZ zufällig. Geänderte dann nur auf ausdrücklichen Haken.
  const fremd = matching.same.length + matching.moved.length === 0;
  const [mitGeaenderten, setMitGeaenderten] = useState(!fremd);

  const auswahl: NotesMatch[] = [
    ...matching.same,
    ...(mitUmnummerierten ? matching.moved : []),
    ...(mitGeaenderten ? matching.changed : []),
  ];

  const rows: Row[] = [
    ...matching.moved.map((m) => ({
      key: `u${m.entry.hash}`,
      oz: m.entry.oz,
      text: m.entry.kurztext,
      label: `jetzt ${m.node.position?.oz ?? m.node.code}`,
      tone: 'blue' as const,
    })),
    ...matching.changed.map((m) => ({
      key: `g${m.entry.hash}`,
      oz: m.entry.oz,
      text: m.entry.kurztext,
      label: 'geändert',
      tone: 'amber' as const,
    })),
    ...matching.missing.map((entry) => ({
      key: `f${entry.hash}`,
      oz: entry.oz,
      text: entry.kurztext,
      label: 'fehlt',
      tone: 'red' as const,
    })),
  ];

  const uebernehmen = (): void => {
    dispatch({ type: 'setAnnotations', annotations: mergeNotes(annotations, auswahl) });
    countEvent('notizen-geladen');
    dispatch({
      type: 'notice',
      message: `Notizen zu ${auswahl.length} ${auswahl.length === 1 ? 'Position' : 'Positionen'} übernommen.`,
    });
    onClose();
  };

  const herkunft = [
    file.gesichert > 0 ? `gesichert ${formatAt(file.gesichert)}` : '',
    file.datei !== '' ? `aus ${file.datei}` : '',
  ]
    .filter((teil) => teil !== '')
    .join(' · ');

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
        aria-label="Notizen laden"
        className="ov-window flex max-h-[84vh] w-[min(560px,calc(100vw-32px))] flex-col"
      >
        <div className="flex h-[44px] shrink-0 items-center border-b border-line pl-[16px] pr-[6px]">
          <b className="flex-1 font-sans text-[14px] font-semibold text-ink">Notizen laden</b>
          <button
            type="button"
            onClick={onClose}
            aria-label="Notizen laden schließen"
            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-[14px] overflow-auto p-[16px]">
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono text-[12px] font-semibold text-ink">{fileName}</span>
            {herkunft !== '' && <span className="font-mono text-[10px] text-dim">{herkunft}</span>}
          </div>
          <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
            <Kachel zahl={matching.same.length} label="gleich" farbe="var(--greenD)" />
            <Kachel zahl={matching.moved.length} label="umnummeriert" farbe="var(--blueD)" />
            <Kachel zahl={matching.changed.length} label="geändert" farbe="var(--amber)" />
            <Kachel zahl={matching.missing.length} label="nicht gefunden" farbe="var(--redD)" />
          </div>
          {fremd && (
            <p role="note" className="m-0 font-mono text-[11px] text-[var(--amber)]">
              ⚠ Keine Position stimmt inhaltlich überein. Stammt die Datei aus einem anderen LV?
            </p>
          )}
          {rows.length > 0 && (
            <ul aria-label="Prüfen" className="m-0 flex list-none flex-col p-0">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-[10px] border-t border-line py-[6px] font-mono text-[11px]"
                >
                  <span className="text-ink">{row.oz || '–'}</span>
                  <span className="truncate font-sans font-semibold text-ink" title={row.text}>
                    {row.text || '–'}
                  </span>
                  <span
                    className={`rounded-[var(--r-pill)] px-[8px] py-[1px] text-[10px] ${TONE[row.tone]}`}
                  >
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {matching.moved.length > 0 && (
            <Haken
              label="Umnummerierte übernehmen"
              checked={mitUmnummerierten}
              onChange={setMitUmnummerierten}
            />
          )}
          {matching.changed.length > 0 && (
            <Haken
              label="Geänderte übernehmen"
              checked={mitGeaenderten}
              onChange={setMitGeaenderten}
            />
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-[8px] border-t border-line px-[16px] py-[10px]">
          <button type="button" className="start-btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="start-btn primary"
            disabled={auswahl.length === 0}
            onClick={uebernehmen}
          >
            {auswahl.length} übernehmen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
