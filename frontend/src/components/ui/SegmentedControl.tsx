// Bubble — SegmentedControl: hartkantige Umschaltgruppe (Hervorheben/Ausblenden,
// Größenmodi). Portiert aus
// .claude/skills/bubble-design/components/core/SegmentedControl.jsx.

export interface SegmentedOption {
  value: string;
  label: string;
  /** Nur Anzeige-Hinweis; die Option bleibt wählbar. */
  title?: string;
  muted?: boolean;
}

export interface SegmentedControlProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--line)', flexShrink: 0 }}>
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <span
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.title}
            style={{
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 9.5,
              background: on ? 'var(--blueS)' : 'var(--white)',
              color: on ? 'var(--blueD)' : option.muted === true ? 'var(--mute)' : 'var(--dim)',
              borderLeft: index > 0 ? '1px solid var(--line)' : 'none',
              fontWeight: on ? 500 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
          </span>
        );
      })}
    </div>
  );
}
