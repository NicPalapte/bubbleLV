// lv-vergabe.jsx — Vergabe analytics: Pro Vergabepaket · Pro Nachunternehmer
// Reads VERGABEPAKETE / NACHUNTERNEHMER / ANFRAGEN / Pflichtdokumente from window.
// Local header/button/CSV helpers (cross-file non-window symbols aren't shared).

const { useState: useStateV, useMemo: useMemoV } = React;

// ─────────────────────────────────────────────────────────────
// Local primitives
// ─────────────────────────────────────────────────────────────
function VHeader({ icon, title, subtitle, counts, actions }) {
  return (
    <div style={{ padding:'14px 22px 12px', borderBottom:'1px solid var(--line)',
      background:'var(--white)', display:'flex', alignItems:'flex-end', gap:18 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center',
            border:'1px solid var(--line2)', background:'var(--panel)', fontFamily:'var(--mono)', fontSize:11, color:'var(--blue)' }}>{icon}</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:.7, color:'var(--mute)', textTransform:'uppercase' }}>Vergabe</span>
        </div>
        <div style={{ marginTop:6, fontFamily:'var(--sans)', fontSize:20, fontWeight:600, color:'var(--ink)' }}>{title}</div>
        {subtitle && <div style={{ marginTop:2, fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>{subtitle}</div>}
      </div>
      {counts && (
        <div style={{ display:'flex', gap:14 }}>
          {counts.map((c,i)=>(
            <div key={i} style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>{c.label}</div>
              <div style={{ marginTop:2, fontFamily:'var(--sans)', fontSize:18, fontWeight:600, color:c.color||'var(--ink)' }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}
      {actions && <div style={{ display:'flex', alignItems:'center', gap:6 }}>{actions}</div>}
    </div>
  );
}

function VBtn({ icon, label, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px',
      border: primary ? '1px solid var(--blue)' : '1px solid var(--line2)',
      background: primary ? 'var(--blue)' : 'var(--white)', color: primary ? '#fff' : 'var(--ink)',
      fontFamily:'var(--mono)', fontSize:10, cursor:'pointer', letterSpacing:.2 }}>
      <span style={{ fontSize:11 }}>{icon}</span>{label}
    </button>
  );
}

function vDownloadCSV(filename, headers, rows) {
  const esc = (v) => { const s = v==null?'':String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const csv = [headers.map(esc).join(';'), ...rows.map(r=>r.map(esc).join(';'))].join('\r\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

const euro = (n) => (n==null ? '—' : n.toLocaleString('de-DE',{ maximumFractionDigits:0 }) + ' €');
const euro2 = (n) => (n==null ? '—' : n.toLocaleString('de-DE',{ minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €');

function VpSwatch({ vp, size=11 }) {
  return <span style={{ width:size, height:size, borderRadius:3, background:vp.color,
    border:`1px solid ${vp.border}`, flexShrink:0, display:'inline-block' }}/>;
}
function VpChip({ vp, onClick }) {
  return (
    <span onClick={onClick} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px',
      background:vp.soft, border:`1px solid ${vp.border}`, color:vp.ink,
      fontFamily:'var(--mono)', fontSize:9.5, cursor:onClick?'pointer':'default', whiteSpace:'nowrap' }}>
      <VpSwatch vp={vp} size={8}/>{vp.code}
    </span>
  );
}

function NuAvatar({ name, size=22 }) {
  const initials = name.replace(/[^A-Za-zÄÖÜ ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <span style={{ width:size, height:size, borderRadius:4, flexShrink:0,
      background:'var(--paper)', border:'1px solid var(--line2)', color:'var(--dim)',
      fontFamily:'var(--mono)', fontSize:size<22?8.5:9.5, fontWeight:500,
      display:'inline-flex', alignItems:'center', justifyContent:'center', letterSpacing:.2 }}>{initials}</span>
  );
}

function AnfrageBadge({ status }) {
  const c = (window.ANFRAGE_STATUS||{})[status] || { label:status, bg:'#eef2f7', fg:'var(--dim)', dot:'var(--mute)' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'1px 7px',
      border:`1px solid ${c.fg}33`, background:c.bg, color:c.fg,
      fontFamily:'var(--mono)', fontSize:9, lineHeight:'14px', letterSpacing:.3, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }}/>{c.label}
    </span>
  );
}

// Compliance badge — "7/9 gültig" + red warning when expired/missing
function DocBadge({ nuId, expandable, onClick, open }) {
  const st = window.nuDocStatus(nuId);
  const warn = st.expired + st.missing;
  return (
    <span onClick={onClick} title={warn? `${st.expired} abgelaufen · ${st.missing} fehlt` : 'alle Nachweise gültig'}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px',
        border:`1px solid ${warn ? '#fca5a5' : 'var(--greenD)33'}`,
        background: warn ? '#fee2e2' : 'var(--greenS)', color: warn ? '#b91c1c' : 'var(--greenD)',
        fontFamily:'var(--mono)', fontSize:9.5, cursor:expandable?'pointer':'default', whiteSpace:'nowrap' }}>
      {warn>0 && <span style={{ fontSize:10, lineHeight:1 }}>⚠</span>}
      <strong style={{ fontWeight:600 }}>{st.gueltig}/{st.total}</strong> gültig
      {warn>0 && <span style={{ opacity:.85 }}>· {st.expired? st.expired+' abgel.':''}{st.expired&&st.missing?' · ':''}{st.missing? st.missing+' fehlt':''}</span>}
      {expandable && <span style={{ marginLeft:1 }}>{open?'▾':'▸'}</span>}
    </span>
  );
}

function DocStatusDot({ status }) {
  const m = { vorhanden:{ c:'var(--greenD)', t:'vorhanden' }, abgelaufen:{ c:'#dc2626', t:'abgelaufen' }, fehlt:{ c:'var(--mute)', t:'fehlt' } };
  const x = m[status] || m.fehlt;
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:x.c, fontFamily:'var(--mono)', fontSize:9.5 }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:x.c }}/>{x.t}
  </span>;
}

// ═════════════════════════════════════════════════════════════
// 1) PRO VERGABEPAKET
// ═════════════════════════════════════════════════════════════
function VergabepaketeView({ onPick }) {
  const VP = window.VERGABEPAKETE;
  const [open, setOpen] = useStateV(() => new Set(VP.map(v=>v.id)));
  const toggle = (id) => setOpen(o => { const n=new Set(o); n.has(id)?n.delete(id):n.add(id); return n; });
  const allOpen = open.size === VP.length;

  const totals = useMemoV(() => {
    const posSet = new Set(); let vergeben = 0; let summe = 0;
    VP.forEach(vp => { vp.positionCodes.forEach(c=>posSet.add(c)); summe += window.paketLVSumme(vp.id); });
    window.ANFRAGEN.forEach(a => { if (a.status==='vergeben') vergeben++; });
    return { pakete:VP.length, positionen:posSet.size, vergeben, summe };
  }, []);

  const exportCSV = () => {
    const headers = ['Vergabepaket','Code','OZ','Bezeichnung','Menge','Einheit','EP €','GP €'];
    const rows = [];
    VP.forEach(vp => window.paketPositions(vp.id).forEach(({p}) => rows.push([
      vp.name, vp.code, p.code, p.label, p.menge, p.einheit, p.ep, ((p.menge||0)*(p.ep||0)).toFixed(2)
    ])));
    vDownloadCSV(`Vergabepakete_${window.LV.project}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--paper)', display:'flex', flexDirection:'column' }}>
      <VHeader icon="▣" title="Vergabepakete"
        subtitle={`Pakete mit Positionen, Gesamtsumme und zugeordneten Nachunternehmern · ${window.LV.project}`}
        counts={[
          { label:'Pakete', value:totals.pakete },
          { label:'Positionen', value:totals.positionen },
          { label:'Vergeben', value:totals.vergeben, color:'var(--greenD)' },
          { label:'LV-Summe', value:euro(totals.summe), color:'var(--blueD)' },
        ]}
        actions={<>
          <VBtn icon={allOpen?'▾':'▸'} label={allOpen?'Alle einklappen':'Alle ausklappen'}
            onClick={()=>setOpen(allOpen? new Set() : new Set(VP.map(v=>v.id)))}/>
          <VBtn icon="↓" label="Excel / CSV" onClick={exportCSV}/>
        </>}/>

      <div style={{ flex:1, overflow:'auto', padding:'16px 22px' }}>
        {VP.map(vp => {
          const positions = window.paketPositions(vp.id);
          const summe = window.paketLVSumme(vp.id);
          const anfragen = window.anfragenFor(vp.id);
          const isOpen = open.has(vp.id);
          const angebote = anfragen.filter(a => a.status==='angebot' || a.status==='vergeben');
          return (
            <div key={vp.id} style={{ background:'var(--white)', border:'1px solid var(--line)',
              borderLeft:`3px solid ${vp.color}`, marginBottom:14 }}>
              {/* Card header */}
              <div onClick={()=>toggle(vp.id)} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'12px 16px', cursor:'pointer', borderBottom: isOpen?'1px solid var(--line)':'none' }}>
                <span style={{ width:10, color:'var(--mute)', fontFamily:'var(--mono)', fontSize:10 }}>{isOpen?'▾':'▸'}</span>
                <VpSwatch vp={vp} size={16}/>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:vp.ink, fontWeight:600 }}>{vp.code}</span>
                <span style={{ fontFamily:'var(--sans)', fontSize:15, fontWeight:600, color:'var(--ink)' }}>{vp.name}</span>
                <span style={{ flex:1 }}/>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>{positions.length} Pos.</span>
                <span style={{ color:'var(--line2)' }}>·</span>
                <span style={{ display:'inline-flex', gap:4 }}>
                  {anfragen.slice(0,5).map((a,i)=>(
                    <span key={i} title={window.NU_BY_ID[a.nuId]?.name+' — '+(window.ANFRAGE_STATUS[a.status]?.label||a.status)}
                      style={{ width:7, height:7, borderRadius:'50%', background:window.ANFRAGE_STATUS[a.status]?.dot||'var(--mute)' }}/>
                  ))}
                </span>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mute)' }}>{anfragen.length} NU</span>
                <span style={{ color:'var(--line2)' }}>·</span>
                <span style={{ fontFamily:'var(--sans)', fontSize:14, fontWeight:600, color:vp.ink, minWidth:110, textAlign:'right' }}>{euro(summe)}</span>
              </div>

              {isOpen && (
                <div style={{ display:'flex', gap:0, flexWrap:'wrap' }}>
                  {/* Positions */}
                  <div style={{ flex:'1 1 460px', minWidth:0, borderRight:'1px solid var(--grid)' }}>
                    <div style={{ padding:'8px 16px 4px', fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:.6,
                      color:'var(--mute)', textTransform:'uppercase' }}>Positionen</div>
                    <div style={{ display:'flex', borderBottom:'1px solid var(--grid)', fontFamily:'var(--mono)', fontSize:8.5,
                      letterSpacing:.5, color:'var(--mute)', textTransform:'uppercase' }}>
                      {[['OZ','14%'],['Bezeichnung','42%'],['Menge','14%'],['EP €','14%'],['GP €','16%']].map(([l,w])=>(
                        <div key={l} style={{ flex:`0 0 ${w}`, padding:'6px 12px', textAlign: l==='Bezeichnung'||l==='OZ'?'left':'right' }}>{l}</div>
                      ))}
                    </div>
                    {positions.map(({p,sec},i)=>(
                      <div key={p.code} onClick={()=>onPick&&onPick(sec.code,p.code)}
                        style={{ display:'flex', borderBottom:'1px solid var(--grid)', cursor:'pointer',
                          background:i%2?'var(--panel)':'var(--white)', fontFamily:'var(--mono)', fontSize:10.5 }}>
                        <div style={{ flex:'0 0 14%', padding:'7px 12px', color:'var(--blueD)' }}>{p.code}</div>
                        <div style={{ flex:'0 0 42%', padding:'7px 12px', color:'var(--ink)', fontFamily:'var(--sans)', fontSize:11,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</div>
                        <div style={{ flex:'0 0 14%', padding:'7px 12px', textAlign:'right', color:'var(--dim)' }}>{p.menge?.toLocaleString('de-DE')} <span style={{ color:'var(--mute)', fontSize:9 }}>{p.einheit}</span></div>
                        <div style={{ flex:'0 0 14%', padding:'7px 12px', textAlign:'right', color:'var(--dim)' }}>{p.ep!=null?p.ep.toLocaleString('de-DE',{minimumFractionDigits:2}):'—'}</div>
                        <div style={{ flex:'0 0 16%', padding:'7px 12px', textAlign:'right', color:'var(--ink)', fontWeight:500 }}>{((p.menge||0)*(p.ep||0)).toLocaleString('de-DE',{maximumFractionDigits:0})}</div>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'8px 12px',
                      background:vp.soft, fontFamily:'var(--mono)', fontSize:11, color:vp.ink }}>
                      <span style={{ letterSpacing:.5, color:'var(--mute)' }}>GESAMTSUMME (LV-Schätzung)</span>
                      <strong style={{ fontFamily:'var(--sans)', fontSize:13 }}>{euro(summe)}</strong>
                    </div>
                  </div>

                  {/* Nachunternehmer */}
                  <div style={{ flex:'1 1 360px', minWidth:0 }}>
                    <div style={{ padding:'8px 16px 4px', fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:.6,
                      color:'var(--mute)', textTransform:'uppercase' }}>Nachunternehmer · {anfragen.length} angefragt · {angebote.length} Angebote</div>
                    {anfragen.length===0 && <div style={{ padding:'12px 16px', color:'var(--mute)', fontFamily:'var(--mono)', fontSize:10 }}>Noch keine Anfragen.</div>}
                    {anfragen.map((a,i)=>{
                      const nu = window.NU_BY_ID[a.nuId];
                      const sum = window.angebotSumme(a);
                      const delta = sum!=null ? sum - summe : null;
                      const ds = window.nuDocStatus(a.nuId);
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px',
                          borderBottom:'1px solid var(--grid)' }}>
                          <NuAvatar name={nu.name} size={22}/>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ fontFamily:'var(--sans)', fontSize:11.5, fontWeight:500, color:'var(--ink)',
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nu.name}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>{nu.gewerk}</div>
                          </div>
                          {(ds.expired+ds.missing)>0 && <span title={`${ds.expired} abgelaufen · ${ds.missing} fehlt`}
                            style={{ color:'#dc2626', fontSize:11 }}>⚠</span>}
                          <div style={{ textAlign:'right' }}>
                            <AnfrageBadge status={a.status}/>
                            {sum!=null && (
                              <div style={{ marginTop:3, fontFamily:'var(--mono)', fontSize:10.5, color:'var(--ink)' }}>
                                {euro(sum)}
                                <span style={{ marginLeft:5, color: delta>0?'#b91c1c':'var(--greenD)', fontSize:9 }}>
                                  {delta>0?'+':''}{(delta/summe*100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 2) PRO NACHUNTERNEHMER
// ═════════════════════════════════════════════════════════════
function NachunternehmerView({ onPick }) {
  const NU = window.NACHUNTERNEHMER;
  const [open, setOpen] = useStateV(null); // nuId expanded

  const totals = useMemoV(() => {
    let anfragen = window.ANFRAGEN.length;
    let angebote = window.ANFRAGEN.filter(a=>a.status==='angebot'||a.status==='vergeben').length;
    let warn = NU.filter(n => { const s=window.nuDocStatus(n.id); return (s.expired+s.missing)>0; }).length;
    return { nu:NU.length, anfragen, angebote, warn };
  }, []);

  const exportCSV = () => {
    const headers = ['Nachunternehmer','Gewerk','Ort','Pakete angefragt','Angebote erhalten','Angebotssumme €','Dokumente gültig','Abgelaufen','Fehlt'];
    const rows = NU.map(nu => {
      const an = window.anfragenOfNu(nu.id);
      const off = an.filter(a=>a.status==='angebot'||a.status==='vergeben');
      const sum = off.reduce((a,x)=>a+(window.angebotSumme(x)||0),0);
      const ds = window.nuDocStatus(nu.id);
      return [nu.name, nu.gewerk, nu.ort, an.length, off.length, sum.toFixed(2), `${ds.gueltig}/${ds.total}`, ds.expired, ds.missing];
    });
    vDownloadCSV(`Nachunternehmer_${window.LV.project}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };

  const cols = [['Nachunternehmer','20%'],['Vergabepakete','26%'],['Anfrage-Status','18%'],['Preis geliefert','16%'],['Dokumente','20%']];

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--white)', display:'flex', flexDirection:'column' }}>
      <VHeader icon="⊞" title="Nachunternehmer"
        subtitle={`Pakete, Angebotseingang und Nachweis-Compliance je Nachunternehmer · ${window.LV.project}`}
        counts={[
          { label:'Firmen', value:totals.nu },
          { label:'Anfragen', value:totals.anfragen },
          { label:'Angebote', value:totals.angebote, color:'var(--blueD)' },
          { label:'Doku-Warnungen', value:totals.warn, color: totals.warn?'#b91c1c':'var(--greenD)' },
        ]}
        actions={<VBtn icon="↓" label="Excel / CSV" onClick={exportCSV}/>}/>

      <div style={{ display:'flex', borderBottom:'1px solid var(--line2)', background:'var(--panel)',
        fontFamily:'var(--mono)', fontSize:9, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>
        {cols.map(([l,w])=>(<div key={l} style={{ flex:`0 0 ${w}`, padding:'9px 14px', borderRight:'1px solid var(--grid)' }}>{l}</div>))}
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {NU.map((nu,i) => {
          const an = window.anfragenOfNu(nu.id);
          const off = an.filter(a=>a.status==='angebot'||a.status==='vergeben');
          const totalOffer = off.reduce((a,x)=>a+(window.angebotSumme(x)||0),0);
          const ds = window.nuDocStatus(nu.id);
          const isOpen = open === nu.id;
          return (
            <React.Fragment key={nu.id}>
              <div style={{ display:'flex', borderBottom:'1px solid var(--grid)',
                background: isOpen ? 'var(--blueS)' : (i%2?'var(--panel)':'var(--white)'), alignItems:'center' }}>
                {/* NU */}
                <div style={{ flex:'0 0 20%', padding:'10px 14px', borderRight:'1px solid var(--grid)',
                  display:'flex', alignItems:'center', gap:9 }}>
                  <NuAvatar name={nu.name} size={24}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:'var(--ink)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nu.name}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>{nu.gewerk} · {nu.ort}</div>
                  </div>
                </div>
                {/* Pakete */}
                <div style={{ flex:'0 0 26%', padding:'10px 14px', borderRight:'1px solid var(--grid)',
                  display:'flex', flexWrap:'wrap', gap:4 }}>
                  {window.nuPakete(nu.id).map(vp => <VpChip key={vp.id} vp={vp}/>)}
                </div>
                {/* Status */}
                <div style={{ flex:'0 0 18%', padding:'10px 14px', borderRight:'1px solid var(--grid)' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>
                    <strong style={{ color:'var(--ink)' }}>{off.length}</strong>/{an.length} Angebote
                  </span>
                  <div style={{ marginTop:4, display:'flex', gap:3 }}>
                    {an.map((a,k)=>(<span key={k} title={window.ANFRAGE_STATUS[a.status]?.label}
                      style={{ width:7, height:7, borderRadius:'50%', background:window.ANFRAGE_STATUS[a.status]?.dot||'var(--mute)' }}/>))}
                  </div>
                </div>
                {/* Preis */}
                <div style={{ flex:'0 0 16%', padding:'10px 14px', borderRight:'1px solid var(--grid)' }}>
                  {off.length>0 ? (
                    <span style={{ display:'inline-flex', flexDirection:'column' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--greenD)' }}>✓ geliefert</span>
                      <span style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:'var(--ink)' }}>{euro(totalOffer)}</span>
                    </span>
                  ) : (
                    <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mute)' }}>— ausstehend</span>
                  )}
                </div>
                {/* Dokumente */}
                <div style={{ flex:'0 0 20%', padding:'10px 14px' }}>
                  <DocBadge nuId={nu.id} expandable open={isOpen} onClick={()=>setOpen(isOpen?null:nu.id)}/>
                </div>
              </div>

              {isOpen && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:0, borderBottom:'2px solid var(--line2)', background:'var(--paper)' }}>
                  {/* Pakete detail */}
                  <div style={{ flex:'1 1 420px', minWidth:0, borderRight:'1px solid var(--grid)', padding:'12px 16px' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase', marginBottom:8 }}>Pakete & Angebote</div>
                    {an.map((a,k)=>{
                      const vp = window.VP_BY_ID[a.paketId];
                      const sum = window.angebotSumme(a);
                      const lv = window.paketLVSumme(a.paketId);
                      const delta = sum!=null ? sum-lv : null;
                      return (
                        <div key={k} onClick={()=>{ const pp=window.paketPositions(a.paketId)[0]; if(pp) onPick&&onPick(pp.sec.code, pp.p.code); }}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--grid)', cursor:'pointer' }}>
                          <VpSwatch vp={vp} size={12}/>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ fontFamily:'var(--sans)', fontSize:11.5, fontWeight:500, color:'var(--ink)' }}>{vp.code} · {vp.name}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>LV-Schätzung {euro(lv)}</div>
                          </div>
                          <AnfrageBadge status={a.status}/>
                          <div style={{ minWidth:110, textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--ink)' }}>
                            {sum!=null ? (<>{euro(sum)} <span style={{ color: delta>0?'#b91c1c':'var(--greenD)', fontSize:9 }}>{delta>0?'+':''}{(delta/lv*100).toFixed(1)}%</span></>) : <span style={{ color:'var(--mute)' }}>—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Dokumente detail */}
                  <div style={{ flex:'1 1 340px', minWidth:0, padding:'12px 16px' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase', marginBottom:8 }}>
                      Pflichtnachweise · {ds.gueltig}/{ds.total} gültig
                    </div>
                    {ds.docs.map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid var(--grid)' }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', border:'1px solid var(--line)',
                          padding:'0 4px', background:'var(--white)' }}>{d.scope==='firma'?'FIRMA':'PAKET'}</span>
                        <span style={{ flex:1, minWidth:0, fontFamily:'var(--sans)', fontSize:11, color:'var(--ink)',
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</span>
                        {d.status==='abgelaufen' && d.gueltigBis &&
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'#b91c1c' }}>bis {d.gueltigBis}</span>}
                        {d.status==='vorhanden' && d.gueltigBis &&
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>gültig {d.gueltigBis}</span>}
                        <DocStatusDot status={d.status}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { VergabepaketeView, NachunternehmerView, VpSwatch, VpChip, DocBadge, AnfrageBadge, NuAvatar });
