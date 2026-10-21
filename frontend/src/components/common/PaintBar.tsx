// Leiste nach einer Auswahl im Langtext (Entscheidung 0063): drei Farben zum
// Anstreichen, mit Admin-Zugang dazu „Begriff lernen" (Entscheidung 0053).
// Darunter im Langtext-Abschnitt die Liste „Meine Anstreichungen".

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PAINT_INFO, PAINTS, type Highlight, type Paint } from '../../lib/annotations';
import { Section } from './CardParts';
import { locate, PAINT_SECTION, type PaintTarget } from './paint';

export function PaintBar({
  target,
  onPaint,
  onLearn,
  onClose,
}: {
  target: PaintTarget;
  onPaint: (paint: Paint) => void;
  /** Nur mit Admin-Zugang und kurzer Auswahl. */
  onLearn: (() => void) | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const width = onLearn === null ? 132 : 250;
  const left = Math.max(8, Math.min(target.left, window.innerWidth - width - 8));

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Textmarkierung"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex items-center gap-[2px] p-[4px]"
      style={{ left, top: target.top }}
    >
      {PAINTS.map((paint) => (
        <button
          key={paint}
          type="button"
          aria-label={`${PAINT_INFO[paint].label} markieren`}
          title={`${PAINT_INFO[paint].label} markieren`}
          // Vor dem Klick nicht fokussieren: sonst verschwindet die Auswahl im Text.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPaint(paint)}
          className="inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-[8px] border-none bg-transparent hover:bg-sunken"
        >
          <span
            aria-hidden="true"
            className="h-[18px] w-[18px] rounded-full border border-line2"
            style={{ background: PAINT_INFO[paint].fill }}
          />
        </button>
      ))}
      {onLearn !== null && (
        <>
          <span aria-hidden="true" className="mx-[4px] h-[22px] w-px bg-line" />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onLearn}
            className="inline-flex h-[36px] cursor-pointer items-center rounded-[8px] border-none bg-transparent px-[10px] font-mono text-[11px] text-ink hover:bg-sunken"
          >
            Begriff lernen…
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

/** Abschnitt „Meine Textmarkierungen": Farbe | Text, ✕ entfernt eine. */
export function PaintList({
  marks,
  text,
  onRemove,
}: {
  marks: readonly Highlight[];
  /** Angezeigter Langtext, um nicht mehr auffindbare Stellen zu kennzeichnen. */
  text: string;
  onRemove: (position: number) => void;
}) {
  if (marks.length === 0) return null;
  return (
    <Section
      title={PAINT_SECTION}
      right={<span className="font-mono text-[10px] text-mute">{marks.length}</span>}
    >
      <ul
        aria-label={PAINT_SECTION}
        className="m-0 flex list-none flex-col overflow-hidden rounded-[var(--r-md)] border border-line bg-surface p-0"
      >
        {marks.map((mark, i) => (
          <li
            key={`${mark.start}-${mark.text}`}
            className={`group grid grid-cols-[88px_1fr_auto] items-center ${
              i > 0 ? 'border-t border-line' : ''
            }`}
          >
            <span className="flex h-full items-center gap-[6px] bg-sunken px-[12px] py-[7px] font-mono text-[10.5px] text-mute">
              <span
                aria-hidden="true"
                className="h-[10px] w-[10px] shrink-0 rounded-full border border-line2"
                style={{ background: PAINT_INFO[mark.paint].fill }}
              />
              {PAINT_INFO[mark.paint].label}
            </span>
            <span
              className="min-w-0 truncate px-[12px] py-[7px] font-sans text-[12px] text-ink"
              title={mark.text}
            >
              „{mark.text}“
              {locate(text, mark) < 0 && (
                <span className="ml-[6px] font-mono text-[10px] text-mute">nicht mehr im Text</span>
              )}
            </span>
            <button
              type="button"
              aria-label="Textmarkierung entfernen"
              title="Textmarkierung entfernen"
              onClick={() => onRemove(i)}
              className="cursor-pointer border-none bg-transparent px-[12px] py-[7px] font-mono text-[11px] text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
