// Beschriftetes Eigenschaftsfeld im rechten Panel. Portiert aus `PF` in
// design/claude-design/lv-main.jsx.

import type { ReactNode } from 'react';

interface PropFieldProps {
  label: string;
  value: ReactNode;
}

export function PropField({ label, value }: PropFieldProps) {
  return (
    <div className="py-[5px]">
      <div className="text-[8px] uppercase tracking-[0.5px] text-mute">{label}</div>
      <div className="mt-[2px] font-mono text-[11px] text-ink">{value === null ? '—' : value}</div>
    </div>
  );
}
