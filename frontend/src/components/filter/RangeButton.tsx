// Zahlenbereich-Filter (Menge) mit zwei Reglern. Portiert aus `RangeButton` in
// design/claude-design/lv-main.jsx.
//
// Der Wertebereich kommt fertig aus dem Aggregat des geladenen LV
// (lib/index/summary.ts); hier bleibt nur das Runden auf ganze Schrittweiten
// für die Regler (WP-I, Schritt 2).

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead } from '../ui/Popover';
import { useDismiss } from '../common/useDismiss';
import { formatCount } from '../../lib/format';
import type { ValueRange } from '../../lib/index/summary';
import type { Range } from '../../lib/matchPos';

interface RangeButtonProps {
  label: string;
  /** Vorkommender Wertebereich; `null`, wenn die Datei keine Werte führt. */
  bounds: ValueRange | null;
  active: Range | null;
  onChange: (range: Range | null) => void;
}

export function RangeButton({ label, bounds, active, onChange }: RangeButtonProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  // Regler laufen in ganzen Schritten; ein Bereich ohne Spanne bekommt einen
  // künstlichen Schritt, sonst stünden beide Griffe aufeinander.
  const [min, max] = useMemo(() => {
    if (bounds === null) return [0, 100];
    const low = Math.floor(bounds.min);
    const high = Math.ceil(bounds.max);
    return [low, high === low ? low + 1 : high];
  }, [bounds]);

  const [low, high] = active ?? [min, max];
  const isActive = active !== null && (active[0] > min || active[1] < max);
  const span = Math.max(1, max - min);

  return (
    <div ref={anchorRef}>
      <Chip on={isActive} onClick={() => setOpen((o) => !o)}>
        {label}
        {isActive && (
          <span className="text-blueD">
            · {formatCount(low)}–{formatCount(high)}
          </span>
        )}
        <span className="-ml-[2px]" style={{ color: isActive ? 'var(--blueD)' : 'var(--mute)' }}>
          ▾
        </span>
      </Chip>
      <Popover ref={popoverRef} open={open} width={260} anchorRef={anchorRef}>
        <PopoverHead onReset={isActive ? () => onChange(null) : undefined}>{label}</PopoverHead>
        <div className="p-[14px]">
          <div className="mb-[6px] flex justify-between text-ink">
            <span>{formatCount(low)}</span>
            <span>{formatCount(high)}</span>
          </div>
          <div className="relative h-[24px]">
            <div className="absolute left-0 right-0 top-[11px] h-[2px] bg-grid" />
            <div
              className="absolute top-[11px] h-[2px] bg-blue"
              style={{
                left: `${((low - min) / span) * 100}%`,
                right: `${((max - high) / span) * 100}%`,
              }}
            />
            <input
              type="range"
              aria-label={`${label} Minimum`}
              min={min}
              max={max}
              value={low}
              onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
              className="range-overlay absolute inset-0 w-full"
            />
            <input
              type="range"
              aria-label={`${label} Maximum`}
              min={min}
              max={max}
              value={high}
              onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
              className="range-overlay absolute inset-0 w-full"
            />
          </div>
          <div className="mt-[6px] flex justify-between text-[9px] text-mute">
            <span>min {formatCount(min)}</span>
            <span>max {formatCount(max)}</span>
          </div>
        </div>
      </Popover>
    </div>
  );
}
