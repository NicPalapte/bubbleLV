// Eigene Marker und Kommentar-Verlauf zu einer Position (Entscheidungen 0047, 0053).
// Die drei Marker-Knöpfe stehen unten in der Karte bei „Vergleichen", der Verlauf
// als letzter Block im Inhalt. „Senden" hängt einen Kommentar mit Zeitpunkt an;
// Marker-Wechsel stehen grau dazwischen. useSaveAnnotations schreibt kurz danach
// in den Speicher der letzten Datei.

import { useState } from 'react';
import { CARD_BUTTON, Section } from './CardParts';
import { formatAt, MARKER_INFO, MARKERS, type LogEntry } from '../../lib/annotations';
import { useViewer, useViewerDispatch } from '../../state/viewer';

function entryLine(entry: Extract<LogEntry, { kind: 'marker' }>): string {
  return entry.marker === null ? 'Marker entfernt' : `Marker: ${MARKER_INFO[entry.marker].label}`;
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
            entry.kind === 'marker' ? (
              <li
                key={`${entry.at}-${i}`}
                className="flex gap-[8px] px-[2px] font-mono text-[10px] text-mute"
              >
                <span>{formatAt(entry.at)}</span>
                <span>{entryLine(entry)}</span>
              </li>
            ) : (
              <li
                key={`${entry.at}-${i}`}
                className="group flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[7px]"
              >
                <div className="flex items-center gap-[8px] font-mono text-[10px] text-mute">
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
                <p className="m-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.5] text-ink">
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
          className="min-w-0 flex-1 resize-y rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[8px] font-mono text-[12px] leading-[1.5] text-ink outline-none placeholder:text-mute focus:border-blue"
        />
        <button
          type="button"
          onClick={send}
          disabled={draft.trim() === ''}
          title="Senden (Strg+Enter)"
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-blue px-[14px] font-mono text-[11px] text-white disabled:cursor-default disabled:opacity-40"
        >
          Senden
        </button>
      </div>
      {persistId === null && (
        <span className="font-mono text-[10px] text-mute">
          Nur für diese Sitzung, wird nicht gespeichert.
        </span>
      )}
    </Section>
  );
}

/**
 * Drei Knöpfe ⚑ ! ✓ für die Fußleiste der Positionskarte. Höchstens einer ist
 * an; der gedrückte noch einmal geklickt nimmt den Marker weg.
 */
export function MarkerButtons({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const current = annotations.markers.get(positionId) ?? null;
  return (
    <div role="group" aria-label="Marker" className="inline-flex gap-[4px]">
      {MARKERS.map((marker) => {
        const info = MARKER_INFO[marker];
        const on = current === marker;
        return (
          <button
            key={marker}
            type="button"
            aria-pressed={on}
            aria-label={info.label}
            title={on ? `${info.label} aufheben` : info.label}
            onClick={() =>
              dispatch({
                type: 'setMarker',
                id: positionId,
                marker: on ? null : marker,
                at: Date.now(),
              })
            }
            className={`${CARD_BUTTON} w-[30px] justify-center px-0`}
            style={on ? { background: info.fill, borderColor: info.fill, color: info.text } : {}}
          >
            {info.glyph}
          </button>
        );
      })}
    </div>
  );
}
