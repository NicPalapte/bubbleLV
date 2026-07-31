// Bubble — DataTable: flex-based zebra table with sortable mono header.
export function DataTable({ columns, rows, rowKey, selectedKey, onPick, empty = 'Keine Einträge.', sort, onSort }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, background:'var(--white)' }}>
      <div style={{ display:'flex', borderBottom:'1px solid var(--line2)', background:'var(--white)',
        fontFamily:'var(--mono)', fontSize:'var(--fs-label)', letterSpacing:'var(--ls-label)',
        color:'var(--mute)', textTransform:'uppercase' }}>
        {columns.map(c => (
          <div key={c.key} onClick={() => onSort && onSort(c.key)} style={{
            flex:`0 0 ${c.width}`, padding:'10px 12px', borderRight:'1px solid var(--line)',
            textAlign:c.align || 'left', cursor:onSort?'pointer':'default', userSelect:'none',
            color: sort && sort.key === c.key ? 'var(--blue)' : 'var(--mute)' }}>
            {c.label} {sort && sort.key === c.key ? (sort.dir > 0 ? '↑' : '↓') : ''}
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflow:'auto' }}>
        {rows.length === 0 && (
          <div style={{ padding:'40px 16px', textAlign:'center', color:'var(--mute)', fontSize:'var(--fs-row)' }}>{empty}</div>
        )}
        {rows.map((r, i) => {
          const k = rowKey(r);
          return (
            <div key={k} onClick={() => onPick && onPick(k)} style={{
              display:'flex', borderBottom:'1px solid var(--grid)', cursor:onPick?'pointer':'default',
              background: selectedKey === k ? 'var(--blueS)' : i % 2 ? 'var(--panel)' : 'var(--white)',
              fontFamily:'var(--mono)', fontSize:'var(--fs-row)' }}>
              {columns.map(c => (
                <div key={c.key} style={{ flex:`0 0 ${c.width}`, padding:'var(--pad-row)',
                  borderRight:'1px solid var(--grid)', textAlign:c.align || 'left',
                  color: c.primary ? 'var(--ink)' : 'var(--dim)', fontWeight: c.primary ? 500 : 400,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
