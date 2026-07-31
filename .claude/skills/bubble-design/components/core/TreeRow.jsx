// Bubble — TreeRow: one line of the LV structure tree (section or position).
export function TreeRow({ depth = 0, code, label, open, leaf = false, selected = false,
  accent, status, count, dimmed = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6,
      padding: leaf ? '4px 12px 4px 18px' : 'var(--pad-tree-row)',
      paddingLeft: 12 + depth * 6,
      borderLeft: selected ? '2px solid var(--blue)' : `2px solid ${accent || 'transparent'}`,
      background: selected ? 'var(--blueS)' : 'transparent',
      color: selected ? 'var(--blueD)' : 'var(--ink)',
      fontFamily:'var(--mono)', fontSize: leaf ? 'var(--fs-body)' : 'var(--fs-row)',
      opacity: dimmed ? 'var(--dim-nonmatch)' : 1, cursor:'pointer'
    }}>
      {!leaf && <span style={{ width:10, color:'var(--mute)', fontSize:9 }}>{open ? '▾' : '▸'}</span>}
      <span style={{ color:'var(--mute)', fontSize:10, width: leaf ? 42 : 22 }}>{code}</span>
      <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        fontWeight: leaf ? 400 : 500 }}>{label}</span>
      {status}
      {count != null && <span style={{ color:'var(--mute)', fontSize:'var(--fs-label)', minWidth:32, textAlign:'right' }}>{count}</span>}
    </div>
  );
}
