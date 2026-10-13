// Eigene Markierung und Kommentar zu einer Position (Entscheidung 0047).
// Der Knopf „Markieren“ steht unten in der Karte bei „Vergleichen“, das Feld
// „Kommentar“ als letzter Block im Inhalt.
// Gespeichert wird beim Tippen, ohne Knopf — useSaveAnnotations schreibt kurz
// danach in den Speicher der letzten Datei.

import { CARD_BUTTON, Section } from './CardParts';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function NoteBlock({ positionId }: { positionId: string }) {
  const { annotations, persistId } = useViewer();
  const dispatch = useViewerDispatch();
  const note = annotations.notes.get(positionId) ?? '';

  return (
    <Section title="Kommentar">
      <textarea
        value={note}
        onChange={(event) =>
          dispatch({ type: 'setNote', id: positionId, text: event.target.value })
        }
        placeholder="Eigene Notiz zu dieser Position"
        aria-label="Kommentar zur Position"
        rows={3}
        className="w-full resize-y rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[8px] font-mono text-[12px] leading-[1.5] text-ink outline-none placeholder:text-mute focus:border-blue"
      />
      {persistId === null && (
        <span className="font-mono text-[10px] text-mute">
          Nur für diese Sitzung, wird nicht gespeichert.
        </span>
      )}
    </Section>
  );
}

// Wie CARD_BUTTON, aber dunkel gefüllt. Eigene Klassenliste statt Anhängen:
// bei zwei bg-Klassen entscheidet die Reihenfolge im CSS, nicht im Attribut.
const MARKED_BUTTON =
  'inline-flex h-[30px] cursor-pointer items-center rounded-[var(--r-sm)] border border-ink ' +
  'bg-ink px-[12px] font-mono text-[10.5px] text-surface focus-visible:border-blue';

/**
 * Knopf „⚑“ für die Fußleiste der Positionskarte. Nur das Zeichen, wie das
 * Schild am Punkt: so passt er neben „Vergleichen“ und „In der Tabelle zeigen“.
 */
export function MarkButton({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const marked = annotations.marked.has(positionId);
  return (
    <button
      type="button"
      aria-pressed={marked}
      aria-label="Markieren"
      onClick={() => dispatch({ type: 'toggleMark', id: positionId })}
      title={marked ? 'Markierung aufheben' : 'Position markieren'}
      className={marked ? MARKED_BUTTON : CARD_BUTTON}
    >
      ⚑
    </button>
  );
}
