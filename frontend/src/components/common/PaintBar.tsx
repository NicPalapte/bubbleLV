// Leiste nach einer Auswahl im Langtext (Entscheidung 0063): sechs Farben zum
// Markieren, je mit eigenem Namen, dazu „Farben benennen" und mit Admin-Zugang
// „Begriff lernen" (Entscheidung 0053). Unter den Eigenschaften der Abschnitt
// „Meine Textmarkierungen".

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PAINT_INFO, PAINTS, type Highlight, type Paint } from '../../lib/annotations';
import { MAX_PAINT_NAME_LENGTH, paintName } from '../../lib/paintNames';
import { usePaintNames } from '../../state/paintNames';
import { Section } from './CardParts';
import { locate, PAINT_SECTION, type PaintTarget } from './paint';

/** Schließt bei Klick daneben und mit Escape. */
function useCloseOutside(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
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
  }, [ref, onClose]);
}

const MENU_WIDTH = 230;

const ROW =
  'flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border-none bg-transparent px-[8px] py-[6px] text-left font-mono text-[11px] text-ink hover:bg-sunken';

function Swatch({ paint }: { paint: Paint }) {
  return (
    <span
      aria-hidden="true"
      className="h-[12px] w-[12px] shrink-0 rounded-full border border-line2"
      style={{ background: PAINT_INFO[paint].fill }}
    />
  );
}

export function PaintBar({
  target,
  onPaint,
  onRename,
  onLearn,
  onClose,
}: {
  target: PaintTarget;
  onPaint: (paint: Paint) => void;
  /** Öffnet „Farben benennen". */
  onRename: () => void;
  /** Nur mit Admin-Zugang und kurzer Auswahl. */
  onLearn: (() => void) | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { names } = usePaintNames();
  useCloseOutside(ref, onClose);
  const left = Math.max(8, Math.min(target.left, window.innerWidth - MENU_WIDTH - 8));

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Textmarkierung"
      aria-orientation="vertical"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col gap-[1px] p-[6px]"
      style={{ left, top: target.top, width: MENU_WIDTH }}
    >
      {PAINTS.map((paint) => {
        const own = names[paint];
        return (
          <button
            key={paint}
            type="button"
            aria-label={
              own === undefined
                ? `${PAINT_INFO[paint].label} markieren`
                : `${PAINT_INFO[paint].label} (${own}) markieren`
            }
            // Vor dem Klick nicht fokussieren: sonst verschwindet die Auswahl im Text.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPaint(paint)}
            className={ROW}
          >
            <Swatch paint={paint} />
            <span className="min-w-0 flex-1 truncate">{own ?? PAINT_INFO[paint].label}</span>
            {own !== undefined && (
              <span className="shrink-0 text-[10px] text-mute">{PAINT_INFO[paint].label}</span>
            )}
          </button>
        );
      })}
      <span aria-hidden="true" className="mx-[8px] my-[4px] h-px bg-line" />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onRename}
        className={`${ROW} text-dim`}
      >
        Farben benennen…
      </button>
      {onLearn !== null && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onLearn}
          className={`${ROW} text-dim`}
        >
          Begriff lernen…
        </button>
      )}
    </div>,
    document.body,
  );
}

/**
 * „Farben benennen": je Farbe ein Name (z. B. Gelb = wichtig). Übernommen wird beim
 * Schließen, damit Leerzeichen beim Tippen nicht sofort weggekürzt werden.
 */
export function PaintNamesDialog({
  left: wantedLeft,
  top,
  onClose,
}: {
  left: number;
  top: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { names, rename } = usePaintNames();
  const [drafts, setDrafts] = useState<Record<Paint, string>>(() => {
    const out = {} as Record<Paint, string>;
    for (const paint of PAINTS) out[paint] = names[paint] ?? '';
    return out;
  });
  const close = useCallback((): void => {
    for (const paint of PAINTS) rename(paint, drafts[paint]);
    onClose();
  }, [drafts, rename, onClose]);
  useCloseOutside(ref, close);
  const left = Math.max(8, Math.min(wantedLeft, window.innerWidth - MENU_WIDTH - 8));

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Farben benennen"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col gap-[4px] p-[8px]"
      style={{ left, top, width: MENU_WIDTH }}
    >
      {PAINTS.map((paint) => (
        <label key={paint} className="flex items-center gap-[8px]">
          <Swatch paint={paint} />
          <input
            type="text"
            value={drafts[paint]}
            maxLength={MAX_PAINT_NAME_LENGTH}
            placeholder={PAINT_INFO[paint].label}
            aria-label={`Name für ${PAINT_INFO[paint].label}`}
            onChange={(event) => setDrafts({ ...drafts, [paint]: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') close();
            }}
            className="h-[28px] min-w-0 flex-1 rounded-[6px] border border-line bg-surface px-[8px] font-mono text-[11px] text-ink focus:border-blue focus:outline-none"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={close}
        className="mt-[4px] h-[28px] cursor-pointer self-end rounded-[6px] border border-line bg-surface px-[12px] font-mono text-[11px] text-ink hover:border-line2"
      >
        Übernehmen
      </button>
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
  const { names } = usePaintNames();
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
            className={`group grid grid-cols-[110px_1fr_auto] items-center ${
              i > 0 ? 'border-t border-line' : ''
            }`}
          >
            <span className="flex h-full items-center gap-[6px] bg-sunken px-[12px] py-[7px] font-mono text-[10.5px] text-mute">
              <span
                aria-hidden="true"
                className="h-[10px] w-[10px] shrink-0 rounded-full border border-line2"
                style={{ background: PAINT_INFO[mark.paint].fill }}
              />
              <span className="min-w-0 truncate">{paintName(names, mark.paint)}</span>
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
