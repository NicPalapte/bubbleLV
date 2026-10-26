// Menü beim Rechtsklick auf eine Auswahl im Langtext (Entscheidung 0063, Issue #155):
// In Suche übernehmen, Kopieren, sechs Farben zum Markieren, je mit eigenem Namen, Anstreichung entfernen,
// dazu „Farben benennen" und mit Admin-Zugang „Begriff lernen" (Entscheidung 0053).
// Eine Auswahl allein öffnet es nicht mehr. Unter den Eigenschaften der Abschnitt
// „Meine Textmarkierungen".

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PAINT_INFO, PAINTS, type Highlight, type Paint } from '../../lib/annotations';
import { MAX_PAINT_NAME_LENGTH, paintName } from '../../lib/paintNames';
import { usePaintNames } from '../../state/paintNames';
import { Section } from './CardParts';
import { useHostWindow } from './hostWindow';
import { locate, PAINT_SECTION, type PaintTarget } from './paint';

/** Schließt bei Klick daneben und mit Escape. */
function useCloseOutside(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  // Im zweiten Fenster (Dokument, Entscheidung 0072) lauscht es dort.
  const { document } = useHostWindow();
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
  }, [ref, onClose, document]);
}

const MENU_WIDTH = 230;
/** Grobe Höhe des Menüs, damit es unten am Fenster nicht abgeschnitten wird. */
const MENU_HEIGHT = 380;

// Am Tablet größere Zeilen: ein Finger trifft 12 px hohe Einträge schlecht.
const ROW =
  'flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border-none bg-transparent px-[8px] py-[6px] text-left font-mono text-[12px] text-ink hover:bg-sunken [@media(pointer:coarse)]:py-[10px] [@media(pointer:coarse)]:text-[14px]';

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
  onSearch,
  onCopy,
  onPaint,
  onUnpaint,
  onRename,
  onLearn,
  onLink,
  onClose,
}: {
  target: PaintTarget;
  /** Auswahl als Suchbegriff in die Suchleiste oben. */
  onSearch: () => void;
  onCopy: () => void;
  onPaint: (paint: Paint) => void;
  /** Nur, wenn die Auswahl eine eigene Anstreichung berührt. */
  onUnpaint: (() => void) | null;
  /** Öffnet „Farben benennen". */
  onRename: () => void;
  /** Nur mit Admin-Zugang und kurzer Auswahl. */
  onLearn: (() => void) | null;
  /** Nur im Begleitdokument (Entscheidung 0072): Stelle mit Positionen verknüpfen. */
  onLink?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const host = useHostWindow();
  const { names } = usePaintNames();
  useCloseOutside(ref, onClose);
  const left = Math.max(8, Math.min(target.left, host.innerWidth - MENU_WIDTH - 8));

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Textmarkierung"
      aria-orientation="vertical"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col gap-[1px] p-[6px]"
      style={{
        left,
        top: Math.min(target.top, host.innerHeight - MENU_HEIGHT),
        width: MENU_WIDTH,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {onLink !== undefined && (
        <>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onLink}
            className={`${ROW} font-semibold text-accent-ink`}
          >
            Mit Position verknüpfen…
          </button>
          <span aria-hidden="true" className="mx-[8px] my-[4px] h-px bg-line" />
        </>
      )}
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onSearch}
        className={`${ROW} font-semibold`}
      >
        <span aria-hidden="true" className="w-[12px] shrink-0 text-center text-mute">
          ⌕
        </span>
        In Suche übernehmen
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCopy}
        className={ROW}
      >
        Kopieren
      </button>
      <span aria-hidden="true" className="mx-[8px] my-[4px] h-px bg-line" />
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
              <span className="shrink-0 text-[11px] text-mute">{PAINT_INFO[paint].label}</span>
            )}
          </button>
        );
      })}
      {onUnpaint !== null && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onUnpaint}
          className={ROW}
        >
          Anstreichung entfernen
        </button>
      )}
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
    host.document.body,
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
  const host = useHostWindow();
  const left = Math.max(8, Math.min(wantedLeft, host.innerWidth - MENU_WIDTH - 8));

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
            className="h-[28px] min-w-0 flex-1 rounded-[6px] border border-line bg-surface px-[8px] font-mono text-[12px] text-ink focus:border-accent focus:outline-none"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={close}
        className="mt-[4px] h-[28px] cursor-pointer self-end rounded-[6px] border border-line bg-surface px-[12px] font-mono text-[12px] text-ink hover:border-line2"
      >
        Übernehmen
      </button>
    </div>,
    host.document.body,
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
      right={<span className="font-mono text-[11px] text-mute">{marks.length}</span>}
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
            <span className="flex h-full items-center gap-[6px] bg-sunken px-[12px] py-[7px] font-mono text-[11.5px] text-mute">
              <span
                aria-hidden="true"
                className="h-[10px] w-[10px] shrink-0 rounded-full border border-line2"
                style={{ background: PAINT_INFO[mark.paint].fill }}
              />
              <span className="min-w-0 truncate">{paintName(names, mark.paint)}</span>
            </span>
            <span
              className="min-w-0 truncate px-[12px] py-[7px] font-sans text-[13px] text-ink"
              title={mark.text}
            >
              „{mark.text}“
              {locate(text, mark) < 0 && (
                <span className="ml-[6px] font-mono text-[11px] text-mute">nicht mehr im Text</span>
              )}
            </span>
            <button
              type="button"
              aria-label="Textmarkierung entfernen"
              title="Textmarkierung entfernen"
              onClick={() => onRemove(i)}
              className="cursor-pointer border-none bg-transparent px-[12px] py-[7px] font-mono text-[12px] text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
