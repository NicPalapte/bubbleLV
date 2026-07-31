// Bubble — Checkbox: square, 12–14px, blue when checked. No native input.
export function Checkbox({ checked, onChange, size = 14 }) {
  return (
    <span onClick={onChange} style={{ width:size, height:size, flexShrink:0, cursor:'pointer',
      border:`1px solid ${checked ? 'var(--blue)' : 'var(--line2)'}`,
      background: checked ? 'var(--blue)' : 'var(--white)',
      color:'#fff', fontSize:9, lineHeight:1,
      display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{checked ? '✓' : ''}</span>
  );
}
