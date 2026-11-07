// Begleit-PDFs als Karten am rechten Rand des Graphen (Entscheidung 0097). Von jeder
// Karte laufen Linien zu ihren Positionen; die zeichnet der Graph, er findet den
// Ankerpunkt über `data-doc-anchor` am Kopf der Karte.
//
// Kopf antippen hebt das PDF hervor und klappt seine Stellen auf, nochmal antippen hebt
// es wieder auf. Ist eine Position gewählt, zeigt jede Karte deren Stellen. Eine Stelle
// antippen wählt ihre Position (bei genau einer) und zeigt die Stelle im Bereich
// „Dokument“, wenn das PDF offen ist.

import { useOptionalDocuments } from '../docs/DocumentsProvider';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { marksForPosition, type DocCard } from '../../lib/docs/docGraph';
import { isWholeDoc, type DocMark } from '../../lib/docs/docNotes';
import { formatCount } from '../../lib/format';
import type { PositionIndex } from '../../lib/index/positionIndex';

interface DocCardsProps {
  cards: readonly DocCard[];
  /** Hervorgehobenes PDF. */
  focus: string | null;
  /** Gewählte Position (Knoten-ID). */
  picked: string | null;
  index: PositionIndex;
  onFocus: (doc: string | null) => void;
  onPick: (id: string) => void;
  /** Breite der Spalte in px. */
  width: number;
  /** Die Spalte scrollt: der Graph misst die Anker der Linien neu. */
  onScroll: () => void;
}

const ROW =
  'flex w-full min-h-[40px] cursor-pointer flex-col gap-[1px] border-0 border-t border-solid border-line px-[12px] py-[6px] text-left [@media(pointer:coarse)]:min-h-[48px]';

function Row({
  mark,
  index,
  open,
  strong,
  onTap,
}: {
  mark: DocMark;
  index: PositionIndex;
  open: boolean;
  strong: boolean;
  onTap: () => void;
}) {
  const oz = mark.links
    .map((id) => index.slotOf.get(id))
    .filter((slot): slot is number => slot !== undefined)
    .map((slot) => index.positions[slot].oz);
  return (
    <button
      type="button"
      onClick={onTap}
      title={open ? 'Stelle im Dokument zeigen' : 'PDF ist nicht geöffnet'}
      className={`${ROW} ${strong ? 'bg-cyanS' : 'bg-transparent hover:bg-sunken'}`}
    >
      <span className="truncate font-mono text-[11px] font-semibold text-cyan">
        {isWholeDoc(mark) ? 'Ganzes Dokument' : `S. ${mark.page}`}
        {oz.length > 0 && ` → ${oz.slice(0, 3).join(', ')}${oz.length > 3 ? ' …' : ''}`}
      </span>
      {!isWholeDoc(mark) && (
        <span className="truncate text-[12px] text-dim" title={mark.text}>
          „{mark.text}“
        </span>
      )}
    </button>
  );
}

export function DocCards({
  cards,
  focus,
  picked,
  index,
  onFocus,
  onPick,
  width,
  onScroll,
}: DocCardsProps) {
  const documents = useOptionalDocuments();
  if (cards.length === 0) return null;
  const isOpen = (doc: string): boolean =>
    documents?.docs.some((entry) => entry.id === doc) ?? false;
  const tap = (mark: DocMark): void => {
    const known = mark.links.filter((id) => index.slotOf.has(id));
    if (known.length === 1) onPick(known[0]);
    if (isOpen(mark.doc)) documents?.jumpTo(mark);
  };

  return (
    <div
      {...graphOverlayProps}
      aria-label="Begleit-PDFs"
      onScroll={onScroll}
      className="pointer-events-auto absolute right-[16px] top-[16px] z-[10] flex max-h-[calc(100%-100px)] flex-col gap-[8px] overflow-y-auto"
      style={{ width }}
    >
      {cards.map((card) => {
        const focused = card.doc === focus;
        const shown = focused ? card.marks : picked === null ? [] : marksForPosition(card, picked);
        const open = isOpen(card.doc);
        return (
          <section
            key={card.doc}
            data-doc-card={card.doc}
            className="ov-window shrink-0 overflow-hidden"
            style={focused ? { borderColor: 'var(--cyan)' } : undefined}
          >
            <button
              type="button"
              data-doc-anchor={card.doc}
              aria-pressed={focused}
              aria-label={`${card.name} im Graphen hervorheben`}
              onClick={() => onFocus(focused ? null : card.doc)}
              className={`flex min-h-[48px] w-full cursor-pointer items-center gap-[10px] border-none px-[12px] py-[6px] text-left ${
                focused ? 'bg-cyanS' : 'bg-transparent hover:bg-sunken'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-[24px] w-[19px] shrink-0 rounded-[3px] border-[1.5px] border-solid bg-surface"
                style={{ borderColor: focused ? 'var(--cyan)' : 'var(--mute)' }}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`truncate text-[13px] font-semibold ${focused ? 'text-cyan' : 'text-ink'}`}
                  title={card.name}
                >
                  {card.name}
                </span>
                <span className="truncate font-mono text-[11px] text-mute">
                  {formatCount(card.positions.length)} Pos
                  {card.pages > 0 && ` · ${formatCount(card.pages)} S.`}
                  {!open && <span className="text-amber"> · nicht geöffnet</span>}
                </span>
              </span>
              <span aria-hidden="true" className="text-[12px] text-mute">
                {focused ? '▴' : '▾'}
              </span>
            </button>
            {shown.length > 0 && (
              <div className={focused ? 'max-h-[320px] overflow-y-auto' : undefined}>
                {shown.map((mark) => (
                  <Row
                    key={`${mark.page}-${mark.start}-${mark.text}`}
                    mark={mark}
                    index={index}
                    open={open}
                    strong={picked !== null && mark.links.includes(picked)}
                    onTap={() => tap(mark)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
