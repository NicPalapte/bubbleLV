// Zahlenbereich-Filter (Menge) mit zwei Reglern. Portiert aus `RangeButton` in
// design/claude-design/lv-main.jsx.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../common/Chip';
import { useOutsideClose } from '../common/useOutsideClose';
import { formatCount } from '../../lib/format';
import type { Range } from '../../lib/matchPos';
import type { PositionSummary } from '../../types/lvNode';

interface RangeButtonProps {
  label: string;
  positions: readonly PositionSummary[];
  getValue: (position: PositionSummary) => number | null;
  active: Range | null;
  onChange: (range: Range | null) => void;
}

export function RangeButton({ label, positions, getValue, active, onChange }: RangeButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, open, useCallback(() => setOpen(false), []));

  const [min, max] = useMemo(() => {
    let low = Infinity;
    let high = -Infinity;
    for (const position of positions) {
      const value = getValue(position);
      if (value === null || !Number.isFinite(value)) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (!Number.isFinite(low)) return [0, 100];
    const flooredLow = Math.floor(low);
    const ceiledHigh = Math.ceil(high);
    return [flooredLow, ceiledHigh === flooredLow ? flooredLow + 1 : ceiledHigh];
  }, [positions, getValue]);

  const [low, high] = active ?? [min, max];
  const isActive = active !== null && (active[0] > min || active[1] < max);
  const span = Math.max(1, max - min);

  return (
    <div ref={ref} className="relative">
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
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] border border-line2 bg-white p-[14px] font-mono text-[10px] shadow-[0_8px_24px_rgba(26,37,51,0.10)]">
          <div className="mb-[10px] flex items-center justify-between uppercase tracking-[0.5px] text-mute">
            <span>{label}</span>
            {isActive && (
              <span className="cursor-pointer text-blue" onClick={() => onChange(null)}>
                zurücksetzen
              </span>
            )}
          </div>
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
              className="absolute inset-0 w-full appearance-none bg-transparent"
            />
            <input
              type="range"
              aria-label={`${label} Maximum`}
              min={min}
              max={max}
              value={high}
              onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
              className="absolute inset-0 w-full appearance-none bg-transparent"
            />
          </div>
          <div className="mt-[6px] flex justify-between text-[9px] text-mute">
            <span>min {formatCount(min)}</span>
            <span>max {formatCount(max)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
