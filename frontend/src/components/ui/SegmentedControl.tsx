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
  /** Bezeichnung der Gruppe für Screenreader, z. B. "Nicht-Treffer". */
  label?: string;
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: 'flex',
        gap: 2,
        padding: 2,
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
        background: 'var(--sunken)',
        flexShrink: 0,
      }}
    >
      {options.map((option) => {
        const disabled = option.disabled === true;
        const on = option.value === value && !disabled;
        return (
          // Echte Schaltfläche statt <span>: die Gruppe ist sonst weder mit der
          // Tastatur erreichbar noch für Screenreader als Auswahl erkennbar.
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
            title={option.title}
            disabled={disabled}
            style={{
              padding: '3px 9px',
              border: 'none',
              borderRadius: 5,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              background: on ? 'var(--surface)' : 'transparent',
              boxShadow: on ? 'var(--shadow-sm)' : 'none',
              color: on
                ? 'var(--ink)'
                : disabled || option.muted === true
                  ? 'var(--mute)'
                  : 'var(--dim)',
              fontWeight: on ? 500 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
