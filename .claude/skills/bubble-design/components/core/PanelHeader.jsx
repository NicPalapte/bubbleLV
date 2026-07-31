// Bubble — PanelHeader: object header at the top of a side panel (§ code + title + status).
export function PanelHeader({ eyebrow, title, right, size = 18 }) {
  return (
    <div style={{ padding:'var(--pad-panel-head)', borderBottom:'1px solid var(--line)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-label)', color:'var(--mute)',
          letterSpacing:'var(--ls-label)', textTransform:'uppercase' }}>{eyebrow}</span>
        {right}
      </div>
      <div style={{ fontFamily:'var(--sans)', fontSize:size, fontWeight:600, color:'var(--ink)', lineHeight:'var(--lh-tight)' }}>{title}</div>
    </div>
  );
}
// Small uppercase label that opens every block inside a panel.
export function BlockLabel({ children, right }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-label)', letterSpacing:'var(--ls-label)',
        color:'var(--mute)', textTransform:'uppercase' }}>{children}</span>
      {right && <span style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-label)', color:'var(--mute)' }}>{right}</span>}
    </div>
  );
}
