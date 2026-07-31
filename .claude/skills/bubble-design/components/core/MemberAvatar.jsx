// Bubble — MemberAvatar: initials in a role-colored ring, optional name + role.
export function MemberAvatar({ member, size = 22, showName = false, onClick }) {
  const initials = member.name.replace(/\.\s?/g, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span onClick={onClick} style={{ display:'inline-flex', alignItems:'center', gap:7, cursor:onClick?'pointer':'default' }}>
      <span style={{ width:size, height:size, borderRadius:'50%',
        background:member.color + '1c', border:`1px solid ${member.color}`, color:member.color,
        fontFamily:'var(--mono)', fontSize:size < 22 ? 8.5 : 9.5, fontWeight:500,
        display:'inline-flex', alignItems:'center', justifyContent:'center', letterSpacing:'.2px' }}>{initials}</span>
      {showName && (
        <span style={{ fontFamily:'var(--mono)', fontSize:'var(--fs-body)', color:'var(--ink)' }}>
          {member.name} <span style={{ color:'var(--mute)' }}>· {member.role}</span>
        </span>
      )}
    </span>
  );
}
