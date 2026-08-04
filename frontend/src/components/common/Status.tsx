// Status-Badge — reine Anzeige/Filter, nicht editierbar (docs/mvp-scope.md).
// Portiert aus `Status` in design/claude-design/lv-main.jsx.

import { STATUS_COLORS, type StatusValue } from '../../lib/status';

interface StatusProps {
  value: string;
  dotOnly?: boolean;
}

function colorsFor(value: string) {
  return STATUS_COLORS[value as StatusValue] ?? STATUS_COLORS.entwurf;
}

export function Status({ value, dotOnly = false }: StatusProps) {
  const colors = colorsFor(value);

  if (dotOnly) {
    return (
      <span
        className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: colors.dot }}
        title={value}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-[5px] py-px pl-[6px] pr-[7px] font-mono text-[9px] leading-[14px] tracking-[0.3px]"
      style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.fg}33` }}
    >
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{ background: colors.dot }}
      />
      {value}
    </span>
  );
}
