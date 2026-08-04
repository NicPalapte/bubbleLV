// Chip — Filter-Button und Attribut-Marker. Portiert aus `Chip` in
// design/claude-design/lv-main.jsx (eckige Ecken, Hairline-Rahmen, ein Blau).

import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  on?: boolean;
  dashed?: boolean;
  count?: number;
  title?: string;
  onClick?: () => void;
}

export function Chip({ children, on = false, dashed = false, count, title, onClick }: ChipProps) {
  const border = dashed ? '1px dashed var(--line2)' : `1px solid ${on ? 'var(--blue)' : 'var(--line)'}`;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-[6px] whitespace-nowrap px-[10px] py-[4px] font-mono text-[10px] leading-[14px] transition-colors"
      style={{
        border,
        background: on ? 'var(--blueS)' : 'var(--white)',
        color: on ? 'var(--blueD)' : 'var(--dim)',
      }}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className="ml-[2px] inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-[7px] px-[5px] font-mono text-[9px] leading-[14px]"
          style={{
            background: on ? 'var(--blue)' : 'var(--line)',
            color: on ? '#fff' : 'var(--dim)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
