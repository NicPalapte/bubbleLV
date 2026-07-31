// Bubble — EmptyState: dashed-rule placeholder / add affordance.
export function EmptyState({ children, action = false, onClick }) {
  return action
    ? <div onClick={onClick} style={{ marginTop:8, padding:'5px 8px', border:'1px dashed var(--line2)',
        color:'var(--dim)', fontFamily:'var(--mono)', fontSize:'var(--fs-meta)', cursor:'pointer', textAlign:'center' }}>{children}</div>
    : <div style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-meta)', color:'var(--mute)', padding:'8px 0',
        borderTop:'1px dashed var(--grid2)', borderBottom:'1px dashed var(--grid2)', textAlign:'center' }}>{children}</div>;
}
