// Bubble — StatusPill: LV-Workflow-Status (geprüft / offen / entwurf).
// Portiert aus .claude/skills/bubble-design/components/core/StatusPill.jsx.
// Im MVP entsteht aus dem Import nur „offen"; der Wert ist reine Anzeige/Filter-
// Facette und nicht editierbar (docs/mvp-scope.md#out-of-scope).

export type StatusValue = 'geprüft' | 'offen' | 'entwurf';

const STATUS: Record<StatusValue, { bg: string; fg: string; dot: string }> = {
  geprüft: { bg: 'var(--greenS)', fg: 'var(--greenD)', dot: 'var(--greenD)' },
  offen: { bg: 'var(--amberS)', fg: 'var(--amber)', dot: 'var(--amber)' },
  entwurf: { bg: '#eef2f7', fg: 'var(--dim)', dot: 'var(--mute)' },
};

export interface StatusPillProps {
  status: string;
  /** Nur der farbige Punkt — für dichte Tree-Zeilen. */
  dotOnly?: boolean;
}

export function StatusPill({ status, dotOnly = false }: StatusPillProps) {
  const colors = STATUS[status as StatusValue] ?? STATUS.entwurf;

  if (dotOnly) {
    return (
      <span
        title={status}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: colors.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '1px 7px 1px 6px',
        border: `1px solid ${colors.fg}33`,
        background: colors.bg,
        color: colors.fg,
        borderRadius: 'var(--r-hair)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-label)',
        lineHeight: '14px',
        letterSpacing: '.3px',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.dot }} />
      {status}
    </span>
  );
}
