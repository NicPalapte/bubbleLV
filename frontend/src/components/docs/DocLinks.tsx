// Abschnitt „Im Dokument" der Positionskarte (Entscheidung 0072): Stellen in
// Begleitdokumenten, die mit dieser Position verknüpft sind — von Hand oder aus einem
// Vorschlag („über OZ“, „über Menge“, 0080). Klick zeigt die Stelle, wenn das Dokument
// offen ist; ✕ löst die Verknüpfung.

import { useOptionalDocuments } from './DocumentsProvider';
import { Section } from '../common/CardParts';
import { marksOfPosition } from '../../lib/docs/docNotes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export const DOC_LINKS_SECTION = 'Im Dokument';

export function DocLinks({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const documents = useOptionalDocuments();
  const marks = marksOfPosition(annotations.documents, positionId);
  if (marks.length === 0) return null;
  const isOpen = (doc: string): boolean =>
    documents?.docs.some((entry) => entry.id === doc) ?? false;

  return (
    <Section
      title={DOC_LINKS_SECTION}
      right={<span className="font-mono text-[11px] text-mute">{marks.length}</span>}
    >
      <ul
        aria-label={DOC_LINKS_SECTION}
        className="m-0 flex list-none flex-col overflow-hidden rounded-[var(--r-md)] border border-line bg-surface p-0"
      >
        {marks.map((mark, i) => {
          const name = annotations.documents.docs.get(mark.doc)?.name ?? 'Dokument';
          const open = isOpen(mark.doc);
          return (
            <li
              key={`${mark.doc}-${mark.page}-${mark.start}-${mark.text}`}
              className={`group flex items-stretch ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <button
                type="button"
                disabled={!open}
                onClick={() => documents?.jumpTo(mark)}
                title={open ? 'Stelle im Dokument zeigen' : 'Dokument ist nicht offen'}
                className="min-w-0 flex-1 cursor-pointer border-none bg-transparent px-[12px] py-[7px] text-left hover:bg-sunken disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="block truncate font-mono text-[11px] text-mute">
                  {name} · S. {mark.page}
                  {mark.sources?.[positionId] !== undefined && (
                    <span> · über {mark.sources[positionId] === 'oz' ? 'OZ' : 'Menge'}</span>
                  )}
                  {!open && <span className="text-amber"> · nicht geöffnet</span>}
                </span>
                <span className="block truncate font-sans text-[13px] text-ink" title={mark.text}>
                  „{mark.text}“
                </span>
              </button>
              <button
                type="button"
                aria-label="Verknüpfung lösen"
                title="Verknüpfung lösen"
                onClick={() => dispatch({ type: 'docUnlink', spot: mark, id: positionId })}
                className="cursor-pointer border-none bg-transparent px-[12px] font-mono text-[12px] text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
