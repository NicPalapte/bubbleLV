// Runder Wert-Chip im Filterfenster (Mockup `.val`): Filterwerte mit Zähler
// und die Merkmale für Zeilen/Spalten. Chips brechen um, statt wie eine
// Umschaltgruppe über den Fensterrand zu laufen.

import type { ReactNode } from 'react';
import { formatCount } from '../../lib/format';

interface ValueChipProps {
  children: ReactNode;
  on: boolean;
  onClick: () => void;
  /** Zahl rechts im Chip, z. B. Positionen mit diesem Wert. */
  count?: number;
  /** Vor dem Text, z. B. der Status-Punkt. */
  leading?: ReactNode;
  title?: string;
  /** `radio` in einer Einfachauswahl (Zeilen/Spalten), sonst Mehrfachauswahl. */
  kind?: 'toggle' | 'radio';
}

export function ValueChip({
  children,
  on,
  onClick,
  count,
  leading,
  title,
  kind = 'toggle',
}: ValueChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      role={kind === 'radio' ? 'radio' : undefined}
      aria-checked={kind === 'radio' ? on : undefined}
      aria-pressed={kind === 'toggle' ? on : undefined}
      className={`inline-flex h-[26px] max-w-full cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border px-[10px] font-mono text-[10.5px] ${
        on
          ? 'border-blue bg-blueS text-blueD'
          : 'border-line bg-surface text-ink hover:border-line2'
      }`}
    >
      {leading}
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className={`text-[10px] ${on ? 'text-blueD' : 'text-mute'}`}>
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}

/** Umbrechende Gruppe aus Chips; als Einfachauswahl mit `radio`-Chips. */
export function ChipGroup({
  label,
  radio = false,
  children,
}: {
  label: string;
  radio?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role={radio ? 'radiogroup' : 'group'}
      aria-label={label}
      className="flex flex-wrap gap-[6px]"
    >
      {children}
    </div>
  );
}
