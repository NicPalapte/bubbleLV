// Bubble — SegmentedControl: hartkantige Umschaltgruppe (Hervorheben/Ausblenden,
// Größenmodi). Portiert aus
// .claude/skills/bubble-design/components/core/SegmentedControl.jsx.

export interface SegmentedOption {
  value: string;
  label: string;
  title?: string;
  /** Gedämpft dargestellt, aber wählbar. */
  muted?: boolean;
  /** Nicht wählbar — die Option trägt für die geladene Datei keine Aussage. */
  disabled?: boolean;
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
        const disabled = option.disabled === true;
        const on = option.value === value && !disabled;
        return (
          <span
            key={option.value}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
            title={option.title}
            aria-disabled={disabled}
            style={{
              padding: '4px 10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 9.5,
              background: on ? 'var(--blueS)' : disabled ? 'var(--paper)' : 'var(--white)',
              color:
                on
                  ? 'var(--blueD)'
                  : disabled || option.muted === true
                    ? 'var(--mute)'
                    : 'var(--dim)',
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
