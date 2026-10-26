// Marke am Seitenrand für eine verknüpfte Stelle im PDF (Entscheidung 0072): zeigt die
// erste OZ, bei mehreren Positionen „+N“. Ein Klick klappt dann alle verknüpften
// Positionen auf; jede springt zu ihrer Position. Bei nur einer springt der Klick direkt.

import { useEffect, useRef, useState } from 'react';
import { useHostWindow } from '../common/hostWindow';

// Das Blatt ist immer weiß (wie gedruckt), darum feste Farben passend zum Akzent.
const CHIP =
  'cursor-pointer rounded-[6px] border border-accent bg-white px-[5px] py-[1px] font-mono text-[10.5px] text-[#a52a21] shadow-[var(--shadow-sm)] hover:bg-[#fbebe9] [@media(pointer:coarse)]:px-[8px] [@media(pointer:coarse)]:py-[5px]';

export function LinkBadge({
  links,
  ozOf,
  onPick,
}: {
  links: readonly string[];
  ozOf: (id: string) => string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { document } = useHostWindow();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, document]);

  const first = links[0];
  if (links.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onPick(first)}
        title="Verknüpfte Position wählen"
        className={CHIP}
      >
        {ozOf(first)}
      </button>
    );
  }
  return (
    <div ref={ref} className="flex flex-col items-end gap-[3px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={`${links.length} verknüpfte Positionen`}
        className={CHIP}
      >
        {ozOf(first)} +{links.length - 1}
      </button>
      {open && (
        <ul
          aria-label="Verknüpfte Positionen"
          className="m-0 flex list-none flex-col items-end gap-[3px] p-0"
        >
          {links.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  onPick(id);
                  setOpen(false);
                }}
                className={CHIP}
              >
                {ozOf(id)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
