// Bubble — Chip: eckiger Filter-/Tag-Toggle mit optionalem Zähler-Badge.
// Portiert aus .claude/skills/bubble-design/components/core/Chip.jsx.

import type { ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  /** Aktiv/ausgewählt — blauer Rahmen, blaue Fläche. */
  on?: boolean;
  /** Gestrichelt: „zurücksetzen"/„hinzufügen"-Affordanz. */
  dashed?: boolean;
  /** Zähler-Badge; bei 0/undefined ausgeblendet. */
  count?: number;
  onClick?: () => void;
  title?: string;
}

export function Chip({ children, on = false, dashed = false, count, onClick, title }: ChipProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: 'var(--pad-chip)',
        border: dashed
          ? '1px dashed var(--line2)'
          : `1px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
        background: on ? 'var(--blueS)' : 'var(--white)',
        color: on ? 'var(--blueD)' : 'var(--dim)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-meta)',
        lineHeight: '14px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        borderRadius: 0,
        transition: 'all var(--dur-base) var(--ease)',
      }}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          style={{
            marginLeft: 2,
            padding: '0 5px',
            minWidth: 14,
            height: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: on ? 'var(--blue)' : 'var(--line)',
            color: on ? '#fff' : 'var(--dim)',
            fontSize: 'var(--fs-label)',
            lineHeight: '14px',
            borderRadius: 7,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
