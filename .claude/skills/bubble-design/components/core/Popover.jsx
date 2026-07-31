// Bubble — Popover: the only elevated surface in the system. Anchor it in a relative parent.
export function Popover({ open, children, width = 244, align = 'left' }) {
  if (!open) return null;
  return (
    <div style={{ position:'absolute', top:'calc(100% + 6px)', [align]:0, zIndex:50,
      minWidth:width, background:'var(--white)', border:'1px solid var(--line2)',
      boxShadow:'var(--shadow-popover)', fontFamily:'var(--mono)', fontSize:'var(--fs-meta)' }}>
      {children}
    </div>
  );
}
export function PopoverHead({ children, onReset }) {
  return (
    <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--line)', display:'flex',
      alignItems:'center', justifyContent:'space-between', color:'var(--mute)',
      letterSpacing:'var(--ls-caps)', fontSize:'var(--fs-label)', textTransform:'uppercase' }}>
      <span>{children}</span>
      {onReset && <span onClick={onReset} style={{ cursor:'pointer', color:'var(--blue)' }}>zurücksetzen</span>}
    </div>
  );
}
export function PopoverRow({ children, on = false, onClick, checkbox = false, trailing }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8,
      padding:'var(--pad-popover-row)', cursor:'pointer',
      background: on ? 'var(--blueS)' : 'transparent', color: on ? 'var(--blueD)' : 'var(--ink)' }}>
      {checkbox && (
        <span style={{ width:12, height:12, flexShrink:0,
          border:`1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`,
          background: on ? 'var(--blue)' : 'var(--white)', color:'#fff', fontSize:9, lineHeight:1,
          display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{on ? '✓' : ''}</span>
      )}
      <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{children}</span>
      {trailing != null && <span style={{ color:'var(--mute)', flexShrink:0 }}>{trailing}</span>}
    </div>
  );
}
