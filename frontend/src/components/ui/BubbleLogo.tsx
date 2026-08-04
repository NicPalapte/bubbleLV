// Bubble — Wortmarke: drei verbundene Knoten + Kleinbuchstaben-Schriftzug.
// Die einzige illustrative Marke im System. Portiert aus
// .claude/skills/bubble-design/components/core/BubbleLogo.jsx.

export function BubbleLogo({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg
        width={size + 10}
        height={size}
        viewBox="0 0 26 18"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <line x1="5" y1="9" x2="14" y2="6" stroke="var(--line2)" strokeWidth="0.8" />
        <line x1="14" y1="6" x2="21" y2="12" stroke="var(--line2)" strokeWidth="0.8" />
        <line x1="5" y1="9" x2="14" y2="14" stroke="var(--line2)" strokeWidth="0.8" />
        <circle cx="14" cy="6" r="2.6" fill="var(--blue)" />
        <circle cx="5" cy="9" r="3.6" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
        <circle cx="21" cy="12" r="2.0" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
      </svg>
      <span
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 700,
          fontSize: size - 4,
          letterSpacing: 'var(--ls-title)',
          color: 'var(--ink)',
        }}
      >
        bubble
      </span>
    </div>
  );
}
