// Bubble — PanelHeader: Objektkopf oben im Seitenpanel (Eyebrow + Titel + Status).
// Portiert aus .claude/skills/bubble-design/components/core/PanelHeader.jsx.

import type { ReactNode } from 'react';

export interface PanelHeaderProps {
  /** Großgeschriebene Mono-Kontextzeile, z. B. „POSITION · OZ 03.010". */
  eyebrow: string;
  title: string;
  /** Rechter Slot — meist <StatusPill/>. */
  right?: ReactNode;
  /** 15 für Positionen, 18 für Abschnitte/Lose/Projekt. */
  size?: number;
}

export function PanelHeader({ eyebrow, title, right, size = 18 }: PanelHeaderProps) {
  return (
    <div style={{ padding: 'var(--pad-panel-head)', borderBottom: '1px solid var(--line)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--fs-label)',
            color: 'var(--mute)',
            letterSpacing: 'var(--ls-label)',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        {right}
      </div>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: size,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 'var(--lh-tight)',
        }}
      >
        {title}
      </div>
    </div>
  );
}

/** Kleines Großbuchstaben-Label, das jeden Block im Panel eröffnet. */
export function BlockLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 'var(--fs-label)',
          letterSpacing: 'var(--ls-label)',
          color: 'var(--mute)',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
      {right !== undefined && (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--fs-label)',
            color: 'var(--mute)',
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}
