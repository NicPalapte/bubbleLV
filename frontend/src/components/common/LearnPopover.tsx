// Begriff lernen (Entscheidung 0053, nur mit Admin-Zugang): Text im Langtext
// markieren, dann Kategorie wählen. Enthält der Begriff eine Zahl, lässt er sich
// auch als Muster lernen — „C30/37" wird „C#/#" und trifft jede Festigkeitsklasse.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  patternOf,
  TERM_CATEGORIES,
  TERM_LABELS,
  type TermCategory,
} from '../../lib/highlight/terms';
import { categoryOf } from '../../lib/spanCategories';
import { useAdmin } from '../../state/admin';
import type { LearnTarget } from './learnSelection';

function swatch(category: TermCategory): string {
  return category === 'aus' ? 'transparent' : categoryOf(category).color;
}

export function LearnPopover({ target, onClose }: { target: LearnTarget; onClose: () => void }) {
  const { learn } = useAdmin();
  const ref = useRef<HTMLDivElement>(null);
  const pattern = patternOf(target.text);
  const [asPattern, setAsPattern] = useState(false);

  useEffect(() => {
    const doc = document;
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    doc.addEventListener('mousedown', onDown);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('mousedown', onDown);
      doc.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const begriff = asPattern && pattern !== null ? pattern : target.text;
  const width = 230;
  const left = Math.max(8, Math.min(target.left, window.innerWidth - width - 8));

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Begriff lernen"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col gap-[2px] p-[6px]"
      style={{ left, top: target.top, width }}
    >
      <span className="break-words px-[8px] py-[4px] font-mono text-[10px] text-mute">
        „{begriff}“ immer hervorheben als
      </span>
      {TERM_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => {
            learn({ begriff, kategorie: category });
            window.getSelection()?.removeAllRanges();
            onClose();
          }}
          className="flex cursor-pointer items-center gap-[8px] rounded-[6px] border-none bg-transparent px-[8px] py-[6px] text-left font-mono text-[11px] text-ink hover:bg-sunken"
        >
          <span
            aria-hidden="true"
            className="h-[9px] w-[9px] rounded-[2px] border border-line2"
            style={{ background: swatch(category) }}
          />
          {TERM_LABELS[category]}
        </button>
      ))}
      {pattern !== null && (
        <label className="flex cursor-pointer items-center gap-[8px] border-t border-line px-[8px] pb-[2px] pt-[6px] font-mono text-[10.5px] text-dim">
          <input
            type="checkbox"
            checked={asPattern}
            onChange={(event) => setAsPattern(event.target.checked)}
          />
          als Muster „{pattern}“
        </label>
      )}
    </div>,
    document.body,
  );
}
