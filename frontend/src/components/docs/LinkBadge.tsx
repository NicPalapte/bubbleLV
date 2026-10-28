// Marke am Seitenrand für verknüpfte Stellen im PDF (Entscheidung 0072). Stellen in
// Nachbarzeilen teilen sich eine Marke (`bundleSpots`): sie zeigt die erste OZ und
// „+N“ für alle weiteren Positionen. Ein Klick klappt eine Liste je Stelle auf; jede
// OZ springt zu ihrer Position. Bei nur einer Position springt der Klick direkt.

import { useEffect, useRef, useState } from 'react';
import { useHostWindow } from '../common/hostWindow';

// Das Blatt ist immer weiß (wie gedruckt), darum feste Farben passend zum Akzent.
const CHIP =
  'cursor-pointer rounded-[6px] border border-accent bg-white px-[5px] py-[1px] font-mono text-[10.5px] text-[#a52a21] shadow-[var(--shadow-sm)] hover:bg-[#fbebe9] [@media(pointer:coarse)]:px-[8px] [@media(pointer:coarse)]:py-[5px]';
// Mehrere Stellen: gefüllt, damit man das Bündel vom Einzelfall unterscheidet.
const CHIP_MANY =
  'cursor-pointer rounded-[6px] border border-accent bg-accent-fill px-[5px] py-[1px] font-mono text-[10.5px] text-white shadow-[var(--shadow-sm)] hover:bg-accent-fill-hover [@media(pointer:coarse)]:px-[8px] [@media(pointer:coarse)]:py-[5px]';
const ROW =
  'flex w-full min-w-0 cursor-pointer items-baseline gap-[8px] rounded-[var(--r-sm)] border-none bg-transparent px-[6px] py-[3px] text-left hover:bg-sunken [@media(pointer:coarse)]:py-[7px]';

/** Eine verknüpfte Stelle, wie die Marke sie braucht. */
export interface BadgeSpot {
  readonly text: string;
  readonly links: readonly string[];
}

export function LinkBadge({
  spots,
  ozOf,
  titleOf,
  onPick,
}: {
  spots: readonly BadgeSpot[];
  ozOf: (id: string) => string;
  /** Kurztext der Position für die aufgeklappte Liste. */
  titleOf: (id: string) => string;
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

  const ids = [...new Set(spots.flatMap((spot) => spot.links))];
  const first = ids[0];
  if (first === undefined) return null;
  if (ids.length === 1) {
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
  const where = spots.length === 1 ? '1 Stelle' : `${spots.length} Stellen`;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={`${where}, ${ids.length} Positionen`}
        className={spots.length > 1 ? CHIP_MANY : CHIP}
      >
        {ozOf(first)} +{ids.length - 1}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Verknüpfte Positionen"
          className="absolute right-0 top-full mt-[4px] flex max-h-[300px] w-[260px] flex-col overflow-auto rounded-[var(--r-md)] border border-line bg-surface font-sans text-[12px] text-ink shadow-[var(--shadow-popover)]"
        >
          <div className="sticky top-0 border-b border-line bg-surface px-[10px] py-[6px] font-semibold">
            {where} · {ids.length} Positionen
          </div>
          {spots.map((spot, at) => (
            <section
              key={`${at}-${spot.text}`}
              className="flex flex-col gap-[2px] border-b border-line px-[4px] py-[6px] last:border-b-0"
            >
              {spots.length > 1 && (
                <q className="truncate px-[6px] text-[11.5px] italic text-mute">{spot.text}</q>
              )}
              {spot.links.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onPick(id);
                    setOpen(false);
                  }}
                  className={ROW}
                >
                  <span className="shrink-0 font-mono text-[11px] text-accent">{ozOf(id)}</span>
                  <span className="truncate text-mute">{titleOf(id)}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
