// Bubble — PackageTag / PackageDots: Vergabepaket identity (oklch hue family).
export function PackageTag({ pkg }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 9px',
      background:pkg.soft, border:`1px solid ${pkg.border}`, color:pkg.ink,
      fontFamily:'var(--mono)', fontSize:'var(--fs-meta)' }}>
      <span style={{ width:8, height:8, borderRadius:'var(--r-hair)', background:pkg.color }} />
      {pkg.code} · {pkg.name}
    </span>
  );
}
export function PackageDots({ pkgs = [], max = 4 }) {
  const list = pkgs.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:2, flexShrink:0 }}>
      {list.map(v => (
        <span key={v.id} title={`${v.code} · ${v.name}`}
          style={{ width:7, height:7, borderRadius:'50%', background:v.color, border:`1px solid ${v.border}` }} />
      ))}
    </span>
  );
}
// Derive a package's five colors from a single hue (0–360).
export function packageColors(h) {
  return {
    color:  `oklch(0.63 0.15 ${h})`,
    soft:   `oklch(0.955 0.028 ${h})`,
    mid:    `oklch(0.90 0.06 ${h})`,
    border: `oklch(0.78 0.11 ${h})`,
    ink:    `oklch(0.45 0.13 ${h})`,
  };
}
