// Knopf „⋯“ für die Kopfleiste im Bereich „Dokument“: Ist der Bereich schmal, wandern
// seltene Knöpfe (Zoom, Treffer blättern, Vorschläge) hierher, statt die Leiste umbrechen
// zu lassen (Nico, 06.11.2026).

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { DOC_TOOL } from './PdfInput';
import { useDismiss } from '../common/useDismiss';
import { Popover } from '../ui/Popover';

export function MoreMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hide = useCallback(() => setOpen(false), []);
  useDismiss([anchorRef, popoverRef], open, hide);
  return (
    <div ref={anchorRef} className="flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Weitere Knöpfe"
        title="Weitere Knöpfe"
        onClick={() => setOpen((current) => !current)}
        className={`${DOC_TOOL} aria-expanded:border-accent aria-expanded:bg-accent-soft`}
      >
        ⋯
      </button>
      <Popover ref={popoverRef} open={open} width={200} align="right" anchorRef={anchorRef}>
        <div
          role="dialog"
          aria-label="Weitere Knöpfe"
          className="flex max-w-[260px] flex-wrap items-center gap-[6px] p-[4px]"
        >
          {children}
        </div>
      </Popover>
    </div>
  );
}
