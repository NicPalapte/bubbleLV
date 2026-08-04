// Bubble — Popover: die einzige erhobene Fläche im System (der einzige Schatten).
// Muss in einem `position: relative`-Elternelement hängen. Portiert aus
// .claude/skills/bubble-design/components/core/Popover.jsx.

import type { CSSProperties, ReactNode } from 'react';

export interface PopoverProps {
  open: boolean;
  children: ReactNode;
  /** min-width in px: 200 Picker, 244 Facetten, 260 Bereichsregler. */
  width?: number;
  align?: 'left' | 'right';
}

export function Popover({ open, children, width = 244, align = 'left' }: PopoverProps) {
  if (!open) return null;
  const anchor: CSSProperties = align === 'right' ? { right: 0 } : { left: 0 };
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        ...anchor,
        zIndex: 50,
        minWidth: width,
        background: 'var(--white)',
        border: '1px solid var(--line2)',
        boxShadow: 'var(--shadow-popover)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-meta)',
      }}
    >
      {children}
    </div>
  );
}

export function PopoverHead({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--mute)',
        letterSpacing: 'var(--ls-caps)',
        fontSize: 'var(--fs-label)',
        textTransform: 'uppercase',
      }}
    >
      <span>{children}</span>
      {onReset !== undefined && (
        <span onClick={onReset} style={{ cursor: 'pointer', color: 'var(--blue)' }}>
          zurücksetzen
        </span>
      )}
    </div>
  );
}

export interface PopoverRowProps {
  children: ReactNode;
  on?: boolean;
  onClick?: () => void;
  /** Mehrfachauswahl-Zeile einer Facette. */
  checkbox?: boolean;
  /** Rechtsbündiger Zähler. */
  trailing?: ReactNode;
  /** Zusätzlicher Inhalt zwischen Checkbox und Text (z. B. Status-Punkt). */
  leading?: ReactNode;
  title?: string;
}

export function PopoverRow({
  children,
  on = false,
  onClick,
  checkbox = false,
  trailing,
  leading,
  title,
}: PopoverRowProps) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 'var(--pad-popover-row)',
        cursor: 'pointer',
        background: on ? 'var(--blueS)' : 'transparent',
        color: on ? 'var(--blueD)' : 'var(--ink)',
      }}
    >
      {checkbox && (
        <span
          style={{
            width: 12,
            height: 12,
            flexShrink: 0,
            border: `1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`,
            background: on ? 'var(--blue)' : 'var(--white)',
            color: '#fff',
            fontSize: 9,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {on ? '✓' : ''}
        </span>
      )}
      {leading}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {children}
      </span>
      {trailing !== undefined && (
        <span style={{ color: 'var(--mute)', flexShrink: 0 }}>{trailing}</span>
      )}
    </div>
  );
}
