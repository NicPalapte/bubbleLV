// Leiste zu einem Vorschlag im Begleitdokument (Entscheidung 0080): welche Position
// passt und warum (OZ, Menge, gemeinsame Wörter mit dem Kurztext), dazu „Verknüpfen“,
// „Nein“ und „Position zeigen“. Erst der Klick legt die Verknüpfung an; „Nein“ merkt
// sich die Ablehnung in den Notizen.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHostWindow } from '../common/hostWindow';
import type { DocSuggestion } from '../../lib/docs/docSuggest';

const WIDTH = 290;
/** Grobe Höhe, damit die Leiste unten am Fenster nicht abgeschnitten wird. */
const HEIGHT = 150;

const BUTTON =
  'h-[30px] cursor-pointer rounded-[var(--r-sm)] px-[12px] font-mono text-[12px] [@media(pointer:coarse)]:h-[40px] [@media(pointer:coarse)]:text-[14px]';

export function SuggestBar({
  suggestion,
  oz,
  shortText,
  left,
  top,
  onLink,
  onReject,
  onShow,
  onClose,
}: {
  suggestion: DocSuggestion;
  oz: string;
  shortText: string;
  left: number;
  top: number;
  onLink: () => void;
  onReject: () => void;
  /** Wählt die Position und zeigt sie; die Leiste bleibt offen zum Entscheiden. */
  onShow: () => void;
  onClose: () => void;
}) {
  const host = useHostWindow();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    host.document.addEventListener('mousedown', onDown);
    host.document.addEventListener('keydown', onKey);
    return () => {
      host.document.removeEventListener('mousedown', onDown);
      host.document.removeEventListener('keydown', onKey);
    };
  }, [host, onClose]);

  const { amount } = suggestion;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Vorschlag verknüpfen"
      className="ov-window fixed z-[70] flex flex-col gap-[8px] p-[10px]"
      style={{
        left: Math.max(8, Math.min(left, host.innerWidth - WIDTH - 8)),
        top: Math.min(top, host.innerHeight - HEIGHT),
        width: WIDTH,
      }}
    >
      <span className="font-mono text-[11px] text-mute">
        {suggestion.source === 'oz' ? 'OZ im Text' : 'Menge passt zu'}
      </span>
      <span className="min-w-0 font-sans text-[13px] text-ink">
        <span className="font-mono font-semibold">{oz}</span>
        {shortText !== '' && <span className="block truncate">{shortText}</span>}
      </span>
      {suggestion.words !== undefined && (
        <span className="truncate font-mono text-[11.5px] text-mute">
          Auch im Kurztext: {suggestion.words.join(', ')}
        </span>
      )}
      {amount !== undefined && (
        <span className={`font-mono text-[11.5px] ${amount.same ? 'text-mute' : 'text-amber'}`}>
          PDF {amount.pdf} · LV {amount.lv ?? '-'}
        </span>
      )}
      <span className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={onLink}
          className={`${BUTTON} border-none bg-accent-fill font-semibold text-white hover:bg-accent-fill-hover`}
        >
          Verknüpfen
        </button>
        <button
          type="button"
          onClick={onReject}
          title="Diesen Vorschlag nicht mehr zeigen"
          className={`${BUTTON} border border-line bg-surface text-ink hover:border-line2`}
        >
          Nein
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onShow}
          title="Position in Graph und Positionskarte zeigen"
          className={`${BUTTON} border-none bg-transparent px-[6px] text-accent-ink hover:underline`}
        >
          Position zeigen ›
        </button>
      </span>
    </div>,
    host.document.body,
  );
}
