// Bubble — SegmentedControl: hard-edged toggle group (Hervorheben/Ausblenden, size modes).
export function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', border:'1px solid var(--line)', flexShrink:0 }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <span key={o.value} onClick={() => onChange(o.value)} style={{
            padding:'4px 10px', cursor:'pointer', fontFamily:'var(--mono)', fontSize:9.5,
            background: on ? 'var(--blueS)' : 'var(--white)', color: on ? 'var(--blueD)' : 'var(--dim)',
            borderLeft: i > 0 ? '1px solid var(--line)' : 'none', fontWeight: on ? 500 : 400,
            whiteSpace:'nowrap' }}>{o.label}</span>
        );
      })}
    </div>
  );
}
