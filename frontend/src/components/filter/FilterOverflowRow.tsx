// Filter-Chip-Reihe der Kopfleiste mit Overflow-Menü: Chips, die bei der
// aktuellen Fensterbreite nicht mehr passen, wandern hinter „Weitere Filter ▾"
// statt abgeschnitten zu werden (Issue #24). Voraussetzung ist, dass `Popover`
// per Portal an <body> hängt (`ui/Popover.tsx`) — sonst würde ein
// überlaufender, geclippter Container auch die Popover-Fläche kappen.
//
// Messprinzip: alle Chips bleiben gemountet. Ein Chip, der laut Messung nicht
// mehr passt, bekommt `position:absolute; visibility:hidden` statt
// `display:none` — dadurch behält er eine reale, messbare Breite (auch wenn
// sein Inhalt sich ändert, z. B. ein Zähler-Badge), ohne im Layout der
// sichtbaren Chips mitzuzählen oder klickbar zu sein.

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead } from '../ui/Popover';
import { useDismiss } from '../common/useDismiss';

export interface OverflowItem {
  key: string;
  node: ReactNode;
  /** Zeigt am Auslöser einen aktiven Zustand, wenn dieses Item verborgen ist. */
  active?: boolean;
}

interface FilterOverflowRowProps {
  items: OverflowItem[];
}

const GAP = 6;
/** Reservierte Breite für den „Weitere Filter"-Auslöser samt Zähler. */
const TRIGGER_WIDTH = 132;

const HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  visibility: 'hidden',
  pointerEvents: 'none',
};

export function FilterOverflowRow({ items }: FilterOverflowRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [visibleCount, setVisibleCount] = useState(items.length);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [triggerRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  // Läuft nach jedem Render (kein Dependency-Array): Chip-Breiten ändern sich
  // auch ohne neue Items, z. B. wenn ein Facetten-Zähler-Badge dazukommt.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const recalc = (): void => {
      const list = items;
      const available = container.clientWidth;
      // Ohne gemessenes Layout (jsdom in Tests, oder ein Container, der noch
      // nicht in den Fluss eingehängt ist) liefert clientWidth 0 — dann würde
      // jedes Item als "passt nicht" gelten. Lieber alles zeigen, wie beim
      // Baum (Tree.tsx, Issue #23).
      if (available <= 0) {
        setVisibleCount(list.length);
        return;
      }
      let used = 0;
      let count = list.length;
      for (let i = 0; i < list.length; i++) {
        const el = itemRefs.current.get(list[i].key);
        const width = el?.offsetWidth ?? 0;
        const gap = i > 0 ? GAP : 0;
        const hasMore = i < list.length - 1;
        const reserve = hasMore ? TRIGGER_WIDTH + GAP : 0;
        if (used + gap + width + reserve > available) {
          count = i;
          break;
        }
        used += gap + width;
      }
      setVisibleCount(count);
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(container);
    return () => observer.disconnect();
  });

  const overflow = items.slice(visibleCount);
  const overflowActive = overflow.some((item) => item.active === true);

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 items-center gap-[6px] overflow-hidden">
      {items.map((item, index) => (
        <div
          key={item.key}
          ref={(el) => {
            if (el !== null) itemRefs.current.set(item.key, el);
            else itemRefs.current.delete(item.key);
          }}
          style={index < visibleCount ? undefined : HIDDEN_STYLE}
        >
          {item.node}
        </div>
      ))}
      {overflow.length > 0 && (
        <div ref={triggerRef}>
          <Chip on={overflowActive} count={overflow.length} onClick={() => setOpen((o) => !o)}>
            Weitere Filter <span className="-ml-[2px] text-mute">▾</span>
          </Chip>
          <Popover ref={popoverRef} open={open} width={244} align="right" anchorRef={triggerRef}>
            <PopoverHead>Weitere Filter</PopoverHead>
            <div className="flex flex-col gap-[6px] p-[8px]">
              {overflow.map((item) => (
                <div key={item.key}>{item.node}</div>
              ))}
            </div>
          </Popover>
        </div>
      )}
    </div>
  );
}
