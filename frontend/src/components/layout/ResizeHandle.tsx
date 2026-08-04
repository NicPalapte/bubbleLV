// Ziehbarer Spaltentrenner. Portiert aus `ResizeHandle` in
// design/claude-design/lv-main.jsx.

import type { MouseEvent as ReactMouseEvent } from 'react';

interface ResizeHandleProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** -1 für Griffe rechts der Spalte (Ziehen nach links vergrößert). */
  sign?: 1 | -1;
}

export function ResizeHandle({ value, onChange, min, max, sign = 1 }: ResizeHandleProps) {
  const start = (event: ReactMouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const x0 = event.clientX;
    const v0 = value;
    const move = (moveEvent: MouseEvent): void => {
      onChange(Math.min(max, Math.max(min, v0 + sign * (moveEvent.clientX - x0))));
    };
    const up = (): void => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div
      onMouseDown={start}
      role="separator"
      aria-orientation="vertical"
      className="relative z-[4] w-[5px] shrink-0 cursor-col-resize border-x border-line bg-transparent transition-colors hover:bg-blueS"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26px] w-px -translate-x-1/2 -translate-y-1/2 bg-line2" />
    </div>
  );
}
