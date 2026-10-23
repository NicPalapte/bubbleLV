// Eigene Marker und Kommentar-Verlauf zu einer Position (Entscheidungen 0047, 0053, 0062).
// Fortschritt und „Wichtig" stehen in der Titelzeile der Karte (Issue #153), der Verlauf
// als letzter Block im Inhalt. „Senden" hängt einen Kommentar mit Zeitpunkt an;
// Marker-Wechsel stehen grau dazwischen. useSaveAnnotations schreibt kurz danach
// in den Speicher der letzten Datei.

import { useRef, useState } from 'react';
import { Section } from './CardParts';
import { PROGRESS_CHOICES, setImportantNow, setProgressNow } from './markers';
import { useDismiss } from './useDismiss';
import { formatAt, IMPORTANT_INFO, PROGRESS_INFO, type LogEntry } from '../../lib/annotations';
import { useViewer, useViewerDispatch } from '../../state/viewer';

function entryLine(entry: Exclude<LogEntry, { kind: 'comment' }>): string {
  if (entry.kind === 'important') return entry.on ? 'Wichtig' : 'Nicht mehr wichtig';
  return entry.progress === null ? 'Wieder offen' : PROGRESS_INFO[entry.progress].label;
}

export function NoteBlock({ positionId }: { positionId: string }) {
  const { annotations, persistId } = useViewer();
  const dispatch = useViewerDispatch();
  const [draft, setDraft] = useState('');
  const entries = annotations.log.get(positionId) ?? [];

  const send = (): void => {
    if (draft.trim() === '') return;
    dispatch({ type: 'addComment', id: positionId, text: draft, at: Date.now() });
    setDraft('');
  };

  return (
    <Section title="Verlauf">
      {entries.length > 0 && (
        <ol aria-label="Verlauf" className="m-0 flex list-none flex-col gap-[6px] p-0">
          {entries.map((entry, i) =>
            entry.kind !== 'comment' ? (
              <li
                key={`${entry.at}-${i}`}
                className="flex gap-[8px] px-[2px] font-mono text-[11px] text-mute"
              >
                <span>{formatAt(entry.at)}</span>
                <span>{entryLine(entry)}</span>
              </li>
            ) : (
              <li
                key={`${entry.at}-${i}`}
                className="group flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[7px]"
              >
                <div className="flex items-center gap-[8px] font-mono text-[11px] text-mute">
                  <span>{formatAt(entry.at)}</span>
                  <button
                    type="button"
                    aria-label="Kommentar löschen"
                    title="Kommentar löschen"
                    onClick={() => dispatch({ type: 'removeComment', id: positionId, position: i })}
                    className="ml-auto cursor-pointer border-none bg-transparent p-0 text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <p className="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5] text-ink">
                  {entry.text}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
      <div className="flex items-end gap-[8px]">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Kommentar schreiben"
          aria-label="Kommentar zur Position"
          rows={2}
          className="min-w-0 flex-1 resize-y rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[8px] font-mono text-[13px] leading-[1.5] text-ink outline-none placeholder:text-mute focus:border-blue"
        />
        <button
          type="button"
          onClick={send}
          disabled={draft.trim() === ''}
          title="Senden (Strg+Enter)"
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-blueF px-[14px] font-mono text-[12px] text-white disabled:cursor-default disabled:opacity-40"
        >
          Senden
        </button>
      </div>
      {persistId === null && (
        <span className="font-mono text-[11px] text-mute">
          Nur für diese Sitzung, wird nicht gespeichert.
        </span>
      )}
    </Section>
  );
}

const HEAD_BUTTON =
  'inline-flex h-[28px] shrink-0 cursor-pointer items-center rounded-[var(--r-sm)] border font-mono text-[11.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue';

/** Fortschritt als Knopf mit Auswahlliste (Issue #153): ein Klick auf, ein Klick setzt. */
function ProgressMenu({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const current = annotations.progress.get(positionId) ?? null;
  const info = current === null ? null : PROGRESS_INFO[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Fortschritt"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`${HEAD_BUTTON} gap-[6px] border-line bg-surface px-[10px] text-ink hover:border-line2`}
        style={
          info === null
            ? undefined
            : { background: info.fill, borderColor: info.fill, color: info.text }
        }
      >
        {info === null ? 'Offen' : info.label}
        <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
          <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Fortschritt"
          className="ov-window absolute right-0 top-[34px] z-[20] flex min-w-[170px] flex-col gap-[2px] p-[5px]"
        >
          {PROGRESS_CHOICES.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              role="menuitemradio"
              aria-checked={value === current}
              onClick={() => {
                if (value !== current) setProgressNow(dispatch, positionId, value);
                setOpen(false);
              }}
              className="flex h-[30px] cursor-pointer items-center justify-between gap-[12px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] text-left font-mono text-[12px] text-ink hover:bg-sunken"
            >
              {label}
              {value === current && (
                <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-blue" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fortschritt und „Wichtig" in der Titelzeile der Positionskarte (Entscheidung 0062,
 * Issue #153). Beides unabhängig: „Erledigt" kann wichtig bleiben.
 */
export function MarkerHead({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const important = annotations.important.has(positionId);
  return (
    <div className="flex shrink-0 items-center gap-[6px]">
      <ProgressMenu positionId={positionId} />
      <button
        type="button"
        aria-label={IMPORTANT_INFO.label}
        aria-pressed={important}
        onClick={() => setImportantNow(dispatch, positionId, !important)}
        title={important ? '„Wichtig" aufheben' : 'Als wichtig markieren'}
        className={`${HEAD_BUTTON} w-[28px] justify-center font-display text-[14px] font-bold`}
        style={
          important
            ? {
                background: IMPORTANT_INFO.fill,
                borderColor: IMPORTANT_INFO.fill,
                color: IMPORTANT_INFO.text,
              }
            : {
                background: 'var(--surface)',
                borderColor: 'var(--line)',
                color: IMPORTANT_INFO.fill,
              }
        }
      >
        {IMPORTANT_INFO.glyph}
      </button>
    </div>
  );
}
