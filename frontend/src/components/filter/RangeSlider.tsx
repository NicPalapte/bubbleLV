// Zahlenbereich-Filter (Menge) mit zwei Reglern, direkt im Filterfenster —
// ohne Knopf und Aufklappfeld davor.
//
// Der Wertebereich kommt fertig aus dem Aggregat des geladenen LV
// (lib/index/summary.ts); hier bleibt nur das Runden auf ganze Schrittweiten
// für die Regler (WP-I, Schritt 2).

import { useMemo } from 'react';
import { formatCount } from '../../lib/format';
import type { ValueRange } from '../../lib/index/summary';
import type { Range } from '../../lib/matchPos';

interface RangeSliderProps {
  label: string;
  /** Vorkommender Wertebereich; `null`, wenn die Datei keine Werte führt. */
  bounds: ValueRange | null;
  active: Range | null;
  onChange: (range: Range | null) => void;
  /** Kopfzeile mit Beschriftung und „zurücksetzen" — kommt vom Aufrufer. */
  renderHead: (isActive: boolean) => React.ReactNode;
}

export function RangeSlider({ label, bounds, active, onChange, renderHead }: RangeSliderProps) {
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
    <section aria-label={label} className="flex flex-col gap-[6px]">
      {renderHead(isActive)}
      <div className="px-[2px] font-mono text-[10.5px]">
        <div className="mb-[2px] flex justify-between text-ink">
          <span className={isActive ? 'text-blueD' : undefined}>{formatCount(low)}</span>
          <span className={isActive ? 'text-blueD' : undefined}>{formatCount(high)}</span>
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
      </div>
    </section>
  );
}
