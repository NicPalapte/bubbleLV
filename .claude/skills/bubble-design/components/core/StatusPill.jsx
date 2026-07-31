// Bubble — StatusPill: LV workflow status (geprüft / offen / entwurf).
const STATUS = {
  'geprüft': { bg:'var(--greenS)', fg:'var(--greenD)', dot:'var(--greenD)' },
  'offen':   { bg:'var(--amberS)', fg:'var(--amber)',  dot:'var(--amber)' },
  'entwurf': { bg:'#eef2f7',       fg:'var(--dim)',    dot:'var(--mute)' },
};
export function StatusPill({ status, dotOnly = false }) {
  const c = STATUS[status] || STATUS['entwurf'];
  if (dotOnly) return <span style={{ width:7, height:7, borderRadius:'50%', background:c.dot, display:'inline-block' }} />;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'1px 7px 1px 6px',
      border:`1px solid ${c.fg}33`, background:c.bg, color:c.fg, borderRadius:'var(--r-hair)',
      fontFamily:'var(--mono)', fontSize:'var(--fs-label)', lineHeight:'14px', letterSpacing:'.3px' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }} />
      {status}
    </span>
  );
}
