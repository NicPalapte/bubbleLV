// Bubble — PropField: micro-label over value. Use inside a 2-col grid (gap '0 18px').
export function PropField({ label, value }) {
  return (
    <div style={{ padding:'5px 0' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-micro)', letterSpacing:'var(--ls-caps)',
        textTransform:'uppercase', color:'var(--mute)' }}>{label}</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-row)', color:'var(--ink)', marginTop:2 }}>{value}</div>
    </div>
  );
}
export function PropGrid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>{children}</div>;
}
