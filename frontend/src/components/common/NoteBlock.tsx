// Eigene Marker und Kommentar-Verlauf zu einer Position (Entscheidungen 0047, 0053).
// Der Marker-Knopf mit Pfeil steht unten in der Karte bei „Vergleichen", der Verlauf
// als letzter Block im Inhalt. „Senden" hängt einen Kommentar mit Zeitpunkt an;
// Marker-Wechsel stehen grau dazwischen. useSaveAnnotations schreibt kurz danach
// in den Speicher der letzten Datei.

import { useRef, useState } from 'react';
import { CARD_BUTTON, Section } from './CardParts';
import { useDismiss } from './useDismiss';
import { formatAt, MARKER_INFO, MARKERS, type LogEntry, type Marker } from '../../lib/annotations';
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
 * Zuletzt gewählter Marker — reiner UI-Zustand dieser Sitzung, damit die
 * nächste Karte gleich mit ihm startet. Überlebt keinen Reload (CLAUDE.md).
 */
let lastChoice: Marker = 'markiert';

function setTo(dispatch: ReturnType<typeof useViewerDispatch>, id: string, marker: Marker | null) {
  dispatch({ type: 'setMarker', id, marker, at: Date.now() });
}

/**
 * Marker-Knopf mit Pfeil für die Fußleiste der Positionskarte.
 * - Ohne Marker: der Knopf setzt den zuletzt gewählten; der Pfeil bietet alle drei.
 * - Mit Marker: der Knopf nimmt ihn weg; der Pfeil bietet die anderen und „Aufheben".
 */
export function MarkerButtons({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const current = annotations.markers.get(positionId) ?? null;
  const [last, setLast] = useState<Marker>(lastChoice);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapRef, open, () => setOpen(false));

  const shown = current ?? last;
  const info = MARKER_INFO[shown];
  const choose = (marker: Marker | null): void => {
    if (marker !== null) {
      lastChoice = marker;
      setLast(marker);
    }
    setTo(dispatch, positionId, marker);
    setOpen(false);
  };
  const options = MARKERS.filter((marker) => marker !== current);
  const filled =
    current !== null ? { background: info.fill, borderColor: info.fill, color: info.text } : {};

  return (
    <div ref={wrapRef} role="group" aria-label="Marker" className="relative inline-flex">
      <button
        type="button"
        aria-pressed={current !== null}
        aria-label={info.label}
        title={current !== null ? `${info.label} aufheben` : `Als „${info.label}" markieren`}
        onClick={() => choose(current !== null ? null : shown)}
        className={`${CARD_BUTTON} gap-[6px] rounded-r-none px-[10px]`}
        style={filled}
      >
        <span aria-hidden="true">{info.glyph}</span>
        {info.label}
      </button>
      <button
        type="button"
        aria-label="Marker wählen"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`${CARD_BUTTON} -ml-px w-[22px] justify-center rounded-l-none px-0 text-[9px]`}
        style={filled}
      >
        ▾
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Marker"
          className="ov-window absolute bottom-[calc(100%+4px)] left-0 z-[5] flex min-w-[150px] flex-col gap-[2px] p-[4px]"
        >
          {options.map((marker) => (
            <button
              key={marker}
              type="button"
              role="menuitem"
              onClick={() => choose(marker)}
              className="flex cursor-pointer items-center gap-[8px] rounded-[6px] border-none bg-transparent px-[8px] py-[6px] text-left font-mono text-[11px] text-ink hover:bg-sunken"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-[4px] text-[10px]"
                style={{ background: MARKER_INFO[marker].fill, color: MARKER_INFO[marker].text }}
              >
                {MARKER_INFO[marker].glyph}
              </span>
              {MARKER_INFO[marker].label}
            </button>
          ))}
          {current !== null && (
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(null)}
              className="flex cursor-pointer items-center gap-[8px] rounded-[6px] border-none bg-transparent px-[8px] py-[6px] text-left font-mono text-[11px] text-dim hover:bg-sunken"
            >
              <span aria-hidden="true" className="w-[16px] text-center">
                ✕
              </span>
              Marker aufheben
            </button>
          )}
        </div>
      )}
    </div>
  );
}
