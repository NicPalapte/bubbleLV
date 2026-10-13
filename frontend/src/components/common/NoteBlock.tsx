// Eigene Markierung und Kommentar zu einer Position (Entscheidung 0047).
// Gespeichert wird beim Tippen, ohne Knopf — useSaveAnnotations schreibt kurz
// danach in den Speicher der letzten Datei.

import { Section } from './CardParts';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function NoteBlock({ positionId }: { positionId: string }) {
  const { annotations, persistId } = useViewer();
  const dispatch = useViewerDispatch();
  const marked = annotations.marked.has(positionId);
  const note = annotations.notes.get(positionId) ?? '';

  return (
    <Section
      title="Kommentar"
      right={
        <button
          type="button"
          aria-pressed={marked}
          onClick={() => dispatch({ type: 'toggleMark', id: positionId })}
          className={`inline-flex h-[26px] cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border px-[10px] font-mono text-[10.5px] ${
            marked
              ? 'border-ink bg-ink text-surface'
              : 'border-line bg-surface text-ink hover:border-line2'
          }`}
        >
          ⚑ {marked ? 'Markiert' : 'Markieren'}
        </button>
      }
    >
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
