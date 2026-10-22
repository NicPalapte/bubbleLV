// Eigene Marker und Kommentar-Verlauf zu einer Position (Entscheidungen 0047, 0053, 0062).
// Fortschritt und „Wichtig" stehen unten in der Karte bei „Vergleichen", der Verlauf
// als letzter Block im Inhalt. „Senden" hängt einen Kommentar mit Zeitpunkt an;
// Marker-Wechsel stehen grau dazwischen. useSaveAnnotations schreibt kurz danach
// in den Speicher der letzten Datei.

import { useState } from 'react';
import { CARD_BUTTON, Section } from './CardParts';
import {
  formatAt,
  IMPORTANT_INFO,
  PROGRESS,
  PROGRESS_INFO,
  type LogEntry,
  type Progress,
} from '../../lib/annotations';
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
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-blue px-[14px] font-mono text-[12px] text-white disabled:cursor-default disabled:opacity-40"
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

type Dispatch = ReturnType<typeof useViewerDispatch>;

// Außerhalb der Komponente: `Date.now()` ist im Render-Pfad nicht rein.
function setProgressNow(dispatch: Dispatch, id: string, progress: Progress | null): void {
  dispatch({ type: 'setProgress', id, progress, at: Date.now() });
}

function setImportantNow(dispatch: Dispatch, id: string, on: boolean): void {
  dispatch({ type: 'setImportant', id, on, at: Date.now() });
}

const SEGMENT =
  'inline-flex h-[30px] cursor-pointer items-center gap-[5px] border-none bg-surface px-[9px] font-mono text-[11.5px] text-dim hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue';

/**
 * Fortschritt (Offen · In Bearbeitung · Fertig) und „Wichtig" für die Fußleiste der
 * Positionskarte (Entscheidung 0062). Beides unabhängig: „Fertig" kann wichtig bleiben.
 */
export function MarkerButtons({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const current = annotations.progress.get(positionId) ?? null;
  const important = annotations.important.has(positionId);

  const segments: Array<{ value: Progress | null; label: string }> = [
    { value: null, label: 'Offen' },
    ...PROGRESS.map((value) => ({ value, label: PROGRESS_INFO[value].label })),
  ];

  return (
    <>
      <div
        role="group"
        aria-label="Fortschritt"
        className="inline-flex overflow-hidden rounded-[var(--r-sm)] border border-line"
      >
        {segments.map(({ value, label }, i) => {
          const on = value === current;
          const info = value === null ? null : PROGRESS_INFO[value];
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => setProgressNow(dispatch, positionId, value)}
              className={`${SEGMENT} ${i > 0 ? 'border-l border-solid border-line' : ''}`}
              style={
                on && info !== null
                  ? { background: info.fill, color: info.text }
                  : on
                    ? { background: 'var(--sunken)', color: 'var(--ink)' }
                    : undefined
              }
            >
              {info !== null && <span aria-hidden="true">{info.glyph}</span>}
              {label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={important}
        onClick={() => setImportantNow(dispatch, positionId, !important)}
        title={important ? '„Wichtig" aufheben' : 'Als wichtig markieren'}
        className={`${CARD_BUTTON} gap-[6px] px-[10px]`}
        style={
          important
            ? {
                background: IMPORTANT_INFO.fill,
                borderColor: IMPORTANT_INFO.fill,
                color: IMPORTANT_INFO.text,
              }
            : undefined
        }
      >
        <span aria-hidden="true">{IMPORTANT_INFO.glyph}</span>
        {IMPORTANT_INFO.label}
      </button>
    </>
  );
}
