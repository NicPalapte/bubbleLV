// lv-analytics.jsx — Analytics views: Bieterfragen · Aufgaben · Beton-Verzeichnis

const { useState: useStateA, useMemo: useMemoA } = React;

// ─────────────────────────────────────────────────────────────
// Shared header / toolbar for analytics screens
// ─────────────────────────────────────────────────────────────
function AnalyticsHeader({ icon, title, subtitle, counts, actions }) {
  return (
    <div style={{ padding:'14px 22px 12px', borderBottom:'1px solid var(--line)',
      background:'var(--white)', display:'flex', alignItems:'flex-end', gap:18 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center',
            border:'1px solid var(--line2)', background:'var(--panel)',
            fontFamily:'var(--mono)', fontSize:11, color:'var(--blue)'
          }}>{icon}</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:.7,
            color:'var(--mute)', textTransform:'uppercase' }}>Analytik</span>
        </div>
        <div style={{ marginTop:6, fontFamily:'var(--sans)', fontSize:20, fontWeight:600, color:'var(--ink)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop:2, fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>{subtitle}</div>
        )}
      </div>
      {counts && (
        <div style={{ display:'flex', gap:14 }}>
          {counts.map((c,i)=>(
            <div key={i} style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>{c.label}</div>
              <div style={{ marginTop:2, fontFamily:'var(--sans)', fontSize:18, fontWeight:600, color: c.color || 'var(--ink)' }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {actions && <div style={{ display:'flex', alignItems:'center', gap:6 }}>{actions}</div>}
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'6px 12px',
      border: primary ? '1px solid var(--blue)' : '1px solid var(--line2)',
      background: primary ? 'var(--blue)' : 'var(--white)',
      color: primary ? '#fff' : 'var(--ink)',
      fontFamily:'var(--mono)', fontSize:10, cursor:'pointer', letterSpacing:.2
    }}>
      <span style={{ fontSize:11 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers: CSV download + mailto
// ─────────────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
  // BOM so Excel detects UTF-8 with German umlauts
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function sendMail(subject, body) {
  const max = 1800;
  const trimmedBody = body.length > max ? body.slice(0, max) + '\n…(gekürzt — vollständige Liste als CSV-Datei)' : body;
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trimmedBody)}`;
  window.location.href = url;
}

// ─────────────────────────────────────────────────────────────
// Position lookup: given an id (section or position code), find section + (maybe) position
// ─────────────────────────────────────────────────────────────
function findContext(id) {
  for (const sec of window.LV.sections) {
    if (sec.id === id) return { section: sec, position: null };
    const p = sec.positions.find(x => x.code === id);
    if (p) return { section: sec, position: p };
  }
  return { section: null, position: null };
}

// ─────────────────────────────────────────────────────────────
// 1) BIETERFRAGEN — table of all notes typed "bieterfrage"
// ─────────────────────────────────────────────────────────────
function BieterfragenView({ notes, onPick }) {
  const [statusFilter, setStatusFilter] = useStateA('alle'); // alle | offen | beantwortet | erledigt
  const [secFilter,    setSecFilter]    = useStateA('alle');

  const rows = useMemoA(()=>{
    const all = notes.all();
    const out = [];
    Object.entries(all).forEach(([id, arr]) => {
      arr.forEach(n => {
        if (n.type !== 'bieterfrage') return;
        const { section, position } = findContext(id);
        if (!section) return;
        out.push({
          noteId: n.id,
          oz: position ? position.code : section.code,
          isPos: !!position,
          sectionCode: section.code,
          sectionLabel: section.label,
          label: position ? position.label : section.label,
          frage: n.text,
          antwort: n.antwort || '',
          antwortDate: n.antwortDate || '',
          status: n.status,
          who: n.who, date: n.date,
        });
      });
    });
    // sort: offen first, then by date desc
    out.sort((a,b)=>{
      if (a.status !== b.status) {
        const order = { offen:0, beantwortet:1, erledigt:2 };
        return (order[a.status]||9) - (order[b.status]||9);
      }
      return b.date.localeCompare(a.date);
    });
    return out;
  }, [notes]);

  const filtered = rows.filter(r => {
    if (statusFilter !== 'alle' && r.status !== statusFilter) return false;
    if (secFilter !== 'alle' && r.sectionCode !== secFilter) return false;
    return true;
  });

  const counts = {
    total: rows.length,
    offen: rows.filter(r=>r.status==='offen').length,
    beantw: rows.filter(r=>r.status==='beantwortet').length,
    erl:   rows.filter(r=>r.status==='erledigt').length,
  };

  const exportCSV = () => {
    const headers = ['OZ','Abschnitt','Bezeichnung','Frage','Status','Autor','Datum','Antwort','Antwort-Datum'];
    const data = filtered.map(r => {
      const who = (window.TEAM||[]).find(t=>t.id===r.who)?.name || r.who;
      return [r.oz, r.sectionCode + ' ' + r.sectionLabel, r.label, r.frage, r.status, who, r.date, r.antwort, r.antwortDate];
    });
    downloadCSV(`Bieterfragen_${window.LV.project}_${new Date().toISOString().slice(0,10)}.csv`, headers, data);
  };

  const exportMail = () => {
    const lines = filtered.map((r,i) => {
      const who = (window.TEAM||[]).find(t=>t.id===r.who)?.name || r.who;
      return `${i+1}. [${r.oz}] ${r.label}\n   Frage: ${r.frage}\n   Status: ${r.status} · ${who} · ${r.date}` +
        (r.antwort ? `\n   Antwort: ${r.antwort}` : '');
    }).join('\n\n');
    const body =
      `Hallo,\n\nanbei die Bieterfragen zum Projekt ${window.LV.project} (${window.LV.lot}, ${window.LV.version}):\n\n` +
      `Gesamt: ${filtered.length} · Offen: ${counts.offen} · Beantwortet: ${counts.beantw}\n\n` +
      lines + `\n\nMit freundlichen Grüßen`;
    sendMail(`Bieterfragen ${window.LV.project} — ${filtered.length} Fragen`, body);
  };

  const sectionCodes = ['alle', ...window.LV.sections.map(s=>s.code)];

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--white)',
      display:'flex', flexDirection:'column' }}>
      <AnalyticsHeader
        icon="?"
        title="Bieterfragen"
        subtitle={`Alle Bieterfragen aus dem Leistungsverzeichnis · ${window.LV.project} · ${window.LV.lot}`}
        counts={[
          { label:'Gesamt',       value: counts.total },
          { label:'Offen',        value: counts.offen,  color:'var(--amber)' },
          { label:'Beantwortet',  value: counts.beantw, color:'var(--greenD)' },
        ]}
      />

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px',
        borderBottom:'1px solid var(--line)', background:'var(--panel)' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6, marginRight:4 }}>FILTER</span>
        {['alle','offen','beantwortet','erledigt'].map(s => (
          <Chip key={s} on={statusFilter===s} onClick={()=>setStatusFilter(s)}>
            {s === 'alle' ? 'Alle' : s}
            {s !== 'alle' && <span style={{
              marginLeft:6, padding:'0 5px', minWidth:14,
              background: statusFilter===s ? 'var(--blue)' : 'var(--line)',
              color: statusFilter===s ? '#fff' : 'var(--dim)',
              fontSize:9, lineHeight:'14px'
            }}>
              {s==='offen' ? counts.offen : s==='beantwortet' ? counts.beantw : counts.erl}
            </span>}
          </Chip>
        ))}
        <span style={{ width:1, height:18, background:'var(--line)', margin:'0 6px' }}/>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>Abschnitt:</span>
        <select value={secFilter} onChange={e=>setSecFilter(e.target.value)} style={{
          fontFamily:'var(--mono)', fontSize:10, padding:'3px 6px',
          border:'1px solid var(--line)', background:'var(--white)', color:'var(--ink)'
        }}>
          {sectionCodes.map(c => (
            <option key={c} value={c}>
              {c==='alle' ? 'Alle Abschnitte' : `${c} · ${window.LV.sections.find(s=>s.code===c)?.label}`}
            </option>
          ))}
        </select>
        <span style={{ flex:1 }}/>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>
          {filtered.length} von {rows.length}
        </span>
        <ActionButton icon="↓" label="Excel / CSV" onClick={exportCSV}/>
        <ActionButton icon="✉" label="Per Mail senden" onClick={exportMail} primary/>
      </div>

      {/* Header */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--line2)',
        fontFamily:'var(--mono)', fontSize:9, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>
        {[
          ['Nr', '4%'],['OZ', '8%'],['Abschnitt','11%'],['Position / Bezeichnung','22%'],
          ['Frage','30%'],['Status','9%'],['Autor','8%'],['Datum','8%']
        ].map(([l,w])=>(
          <div key={l} style={{ flex:`0 0 ${w}`, padding:'9px 12px',
            borderRight:'1px solid var(--line)' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding:'60px 16px', textAlign:'center', color:'var(--mute)',
            fontFamily:'var(--mono)', fontSize:11 }}>
            Keine Bieterfragen entsprechen den Filtern.
          </div>
        )}
        {filtered.map((r,i)=>{
          const who = (window.TEAM||[]).find(t=>t.id===r.who);
          return (
            <div key={r.noteId} onClick={()=>onPick && onPick(r.sectionCode, r.isPos ? r.oz : null)}
              style={{ display:'flex', borderBottom:'1px solid var(--grid)',
                background: i%2 ? 'var(--panel)' : 'var(--white)',
                cursor:'pointer', alignItems:'stretch'
              }}>
              <div style={{ flex:'0 0 4%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:10, color:'var(--mute)' }}>{String(i+1).padStart(3,'0')}</div>
              <div style={{ flex:'0 0 8%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:11, color:'var(--blueD)', fontWeight:500 }}>{r.oz}</div>
              <div style={{ flex:'0 0 11%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>
                <div style={{ color:'var(--mute)', fontSize:9 }}>§ {r.sectionCode}</div>
                <div style={{ color:'var(--ink)' }}>{r.sectionLabel}</div>
              </div>
              <div style={{ flex:'0 0 22%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--sans)', fontSize:11.5, color:'var(--ink)', fontWeight:500, lineHeight:1.35 }}>
                {r.label}
              </div>
              <div style={{ flex:'0 0 30%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--sans)', fontSize:11.5, color:'var(--ink)', lineHeight:1.4 }}>
                {r.frage}
                {r.antwort && (
                  <div style={{
                    marginTop:6, padding:'5px 7px', borderLeft:'2px solid var(--greenD)',
                    background:'var(--white)', fontSize:11, color:'var(--dim)'
                  }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.5, color:'var(--greenD)' }}>ANTWORT </span>
                    {r.antwort}
                  </div>
                )}
              </div>
              <div style={{ flex:'0 0 9%', padding:'10px 12px', borderRight:'1px solid var(--grid)' }}>
                <NoteStatusBadge s={r.status}/>
              </div>
              <div style={{ flex:'0 0 8%', padding:'10px 12px', borderRight:'1px solid var(--grid)' }}>
                {who && <Member id={who.id} size={18} showName={false}/>}
                <span style={{ marginLeft:6, fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>{who?.name}</span>
              </div>
              <div style={{ flex:'0 0 8%', padding:'10px 12px',
                fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)' }}>{r.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2) AUFGABEN — all tasks across the LV
// ─────────────────────────────────────────────────────────────
function TasksView({ tasks, assignees, onPick }) {
  const [statusFilter, setStatusFilter] = useStateA('alle');     // alle | offen | erledigt
  const [whoFilter,    setWhoFilter]    = useStateA('alle');
  const [secFilter,    setSecFilter]    = useStateA('alle');

  const rows = useMemoA(()=>{
    const out = [];
    window.LV.sections.forEach(sec => {
      const secTasks = tasks.getFor(sec.id);
      secTasks.forEach(t => out.push({
        ...t, ownerId: sec.id, oz: sec.code, isPos: false,
        sectionCode: sec.code, sectionLabel: sec.label,
        label: sec.label,
      }));
      sec.positions.forEach(p => {
        const pTasks = tasks.getFor(p.code);
        pTasks.forEach(t => out.push({
          ...t, ownerId: p.code, oz: p.code, isPos: true,
          sectionCode: sec.code, sectionLabel: sec.label,
          label: p.label,
        }));
      });
    });
    // sort: open first, by OZ
    out.sort((a,b)=>{
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.oz.localeCompare(b.oz);
    });
    return out;
  }, [tasks]);

  const filtered = rows.filter(r => {
    if (statusFilter === 'offen' && r.done) return false;
    if (statusFilter === 'erledigt' && !r.done) return false;
    if (whoFilter !== 'alle' && r.who !== whoFilter) return false;
    if (secFilter !== 'alle' && r.sectionCode !== secFilter) return false;
    return true;
  });

  const counts = {
    total: rows.length,
    offen: rows.filter(r=>!r.done).length,
    erl:   rows.filter(r=>r.done).length,
  };
  // breakdown by person
  const perPerson = (window.TEAM||[]).map(t => ({
    ...t,
    open: rows.filter(r => r.who === t.id && !r.done).length,
    done: rows.filter(r => r.who === t.id && r.done).length,
  })).filter(p => p.open + p.done > 0);

  const exportCSV = () => {
    const headers = ['OZ','Abschnitt','Position','Aufgabe','Status','Verantwortlich','Rolle'];
    const data = filtered.map(r => {
      const who = (window.TEAM||[]).find(t=>t.id===r.who) || {};
      return [r.oz, r.sectionCode + ' ' + r.sectionLabel, r.label, r.title,
        r.done?'erledigt':'offen', who.name||r.who, who.role||''];
    });
    downloadCSV(`Aufgaben_${window.LV.project}_${new Date().toISOString().slice(0,10)}.csv`, headers, data);
  };

  const sectionCodes = ['alle', ...window.LV.sections.map(s=>s.code)];

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--white)',
      display:'flex', flexDirection:'column' }}>
      <AnalyticsHeader
        icon="✓"
        title="Aufgaben — Gesamtübersicht"
        subtitle={`Alle Aufgaben mit Position, Status und Verantwortlichkeit · ${window.LV.project}`}
        counts={[
          { label:'Gesamt',   value: counts.total },
          { label:'Offen',    value: counts.offen, color:'var(--amber)' },
          { label:'Erledigt', value: counts.erl,   color:'var(--greenD)' },
        ]}
      />

      {/* Per-person summary */}
      <div style={{ padding:'10px 22px', background:'var(--paper)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6, marginBottom:6 }}>NACH VERANTWORTLICHKEIT</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {perPerson.map(p => {
            const on = whoFilter === p.id;
            return (
              <div key={p.id} onClick={()=>setWhoFilter(on ? 'alle' : p.id)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'5px 10px 5px 5px',
                border:`1px solid ${on ? p.color : 'var(--line)'}`,
                background: on ? p.color+'12' : 'var(--white)', cursor:'pointer',
                borderRadius:99,
              }}>
                <Member id={p.id} size={22}/>
                <span style={{ fontFamily:'var(--mono)', fontSize:10.5, color:'var(--ink)' }}>{p.name}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>{p.role}</span>
                <span style={{ marginLeft:4, padding:'1px 6px', fontFamily:'var(--mono)', fontSize:9,
                  background:'var(--amberS)', color:'var(--amber)', border:'1px solid var(--amber)33' }}>
                  {p.open} offen
                </span>
                {p.done > 0 && (
                  <span style={{ padding:'1px 6px', fontFamily:'var(--mono)', fontSize:9,
                    background:'var(--greenS)', color:'var(--greenD)', border:'1px solid var(--greenD)33' }}>
                    {p.done} erl.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px',
        borderBottom:'1px solid var(--line)', background:'var(--panel)' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6, marginRight:4 }}>FILTER</span>
        {['alle','offen','erledigt'].map(s => (
          <Chip key={s} on={statusFilter===s} onClick={()=>setStatusFilter(s)}>
            {s === 'alle' ? 'Alle' : s}
            {s !== 'alle' && <span style={{
              marginLeft:6, padding:'0 5px',
              background: statusFilter===s ? 'var(--blue)' : 'var(--line)',
              color: statusFilter===s ? '#fff' : 'var(--dim)',
              fontSize:9, lineHeight:'14px'
            }}>{s==='offen' ? counts.offen : counts.erl}</span>}
          </Chip>
        ))}
        <span style={{ width:1, height:18, background:'var(--line)', margin:'0 6px' }}/>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>Abschnitt:</span>
        <select value={secFilter} onChange={e=>setSecFilter(e.target.value)} style={{
          fontFamily:'var(--mono)', fontSize:10, padding:'3px 6px',
          border:'1px solid var(--line)', background:'var(--white)', color:'var(--ink)'
        }}>
          {sectionCodes.map(c => (
            <option key={c} value={c}>
              {c==='alle' ? 'Alle' : `${c} · ${window.LV.sections.find(s=>s.code===c)?.label}`}
            </option>
          ))}
        </select>
        <span style={{ flex:1 }}/>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>
          {filtered.length} von {rows.length}
        </span>
        <ActionButton icon="↓" label="Excel / CSV" onClick={exportCSV}/>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--line2)',
        fontFamily:'var(--mono)', fontSize:9, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>
        {[
          ['Nr','4%'],['OZ','8%'],['Abschnitt','13%'],['Position','20%'],
          ['Aufgabe','30%'],['Status','9%'],['Verantwortlich','16%']
        ].map(([l,w])=>(
          <div key={l} style={{ flex:`0 0 ${w}`, padding:'9px 12px',
            borderRight:'1px solid var(--line)' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding:'60px 16px', textAlign:'center', color:'var(--mute)',
            fontFamily:'var(--mono)', fontSize:11 }}>
            Keine Aufgaben entsprechen den Filtern.
          </div>
        )}
        {filtered.map((r,i)=>{
          const who = (window.TEAM||[]).find(t=>t.id===r.who);
          return (
            <div key={r.id} onClick={()=>onPick && onPick(r.sectionCode, r.isPos ? r.oz : null)}
              style={{ display:'flex', borderBottom:'1px solid var(--grid)',
                background: i%2 ? 'var(--panel)' : 'var(--white)', cursor:'pointer' }}>
              <div style={{ flex:'0 0 4%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:10, color:'var(--mute)' }}>{String(i+1).padStart(3,'0')}</div>
              <div style={{ flex:'0 0 8%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:11, color:'var(--blueD)', fontWeight:500 }}>{r.oz}</div>
              <div style={{ flex:'0 0 13%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--mono)', fontSize:10, color:'var(--ink)' }}>
                <span style={{ color:'var(--mute)' }}>§ {r.sectionCode} · </span>{r.sectionLabel}
              </div>
              <div style={{ flex:'0 0 20%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--sans)', fontSize:11.5, color:'var(--ink)', fontWeight:500,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {r.isPos ? r.label : <span style={{ color:'var(--mute)', fontStyle:'italic' }}>Abschnittsweit</span>}
              </div>
              <div style={{ flex:'0 0 30%', padding:'10px 12px', borderRight:'1px solid var(--grid)',
                fontFamily:'var(--sans)', fontSize:11.5,
                color: r.done ? 'var(--mute)' : 'var(--ink)',
                textDecoration: r.done ? 'line-through' : 'none', lineHeight:1.4 }}>
                {r.title}
              </div>
              <div style={{ flex:'0 0 9%', padding:'10px 12px', borderRight:'1px solid var(--grid)' }}>
                {r.done ? (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                    padding:'1px 7px', border:'1px solid var(--greenD)33',
                    background:'var(--greenS)', color:'var(--greenD)',
                    fontFamily:'var(--mono)', fontSize:9, letterSpacing:.3 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--greenD)' }}/>
                    erledigt
                  </span>
                ) : (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                    padding:'1px 7px', border:'1px solid var(--amber)33',
                    background:'var(--amberS)', color:'var(--amber)',
                    fontFamily:'var(--mono)', fontSize:9, letterSpacing:.3 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--amber)' }}/>
                    offen
                  </span>
                )}
              </div>
              <div style={{ flex:'0 0 16%', padding:'10px 12px',
                display:'flex', alignItems:'center', gap:8 }}>
                {who && <Member id={who.id} size={20}/>}
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--ink)' }}>
                  {who?.name} <span style={{ color:'var(--mute)' }}>· {who?.role}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3) BETON-VERZEICHNIS — concrete types used in the project
// ─────────────────────────────────────────────────────────────
function BetonView({ onPick }) {
  const groups = useMemoA(()=>{
    const m = new Map();
    window.LV.sections.forEach(sec => {
      sec.positions.forEach(p => {
        if (!p.beton) return;
        if (!m.has(p.beton)) m.set(p.beton, {
          beton: p.beton, positions: [], totalVol: 0, totalCost: 0,
          expoSet: new Set(), sections: new Set(),
        });
        const g = m.get(p.beton);
        g.positions.push({ ...p, sectionCode: sec.code, sectionLabel: sec.label });
        if (p.einheit === 'm³') g.totalVol += p.menge || 0;
        g.totalCost += (p.menge||0) * (p.ep||0);
        (p.expo||[]).forEach(e => g.expoSet.add(e));
        g.sections.add(`${sec.code} ${sec.label}`);
      });
    });
    return [...m.values()].sort((a,b)=>{
      // C12/15 -> C30/37 -> C35/45 (numeric sort on first number)
      const na = parseInt(a.beton.replace(/[^\d]/g,'')); const nb = parseInt(b.beton.replace(/[^\d]/g,''));
      return na - nb;
    });
  }, []);

  const grandVol  = groups.reduce((a,g)=>a+g.totalVol, 0);
  const grandCost = groups.reduce((a,g)=>a+g.totalCost, 0);
  const grandPos  = groups.reduce((a,g)=>a+g.positions.length, 0);

  const exportCSV = () => {
    const headers = ['Druckfestigkeit','Anzahl Positionen','Volumen m³','Gesamtkosten EUR','Expositionsklassen','Abschnitte'];
    const rows = groups.map(g => [
      g.beton, g.positions.length, g.totalVol.toFixed(2),
      g.totalCost.toFixed(2), [...g.expoSet].join(', '), [...g.sections].join(' | ')
    ]);
    // also append position-level rows
    rows.push([], ['POSITIONSDETAIL']);
    rows.push(['OZ','Bezeichnung','Druckfestigkeit','Exposition','Einheit','Menge','EP','GP']);
    groups.forEach(g => g.positions.forEach(p => rows.push([
      p.code, p.label, p.beton, (p.expo||[]).join(', '),
      p.einheit, p.menge, p.ep, ((p.menge||0)*(p.ep||0)).toFixed(2)
    ])));
    downloadCSV(`Beton-Verzeichnis_${window.LV.project}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };

  // colour per concrete class
  const palette = ['#0891b2','#2563eb','#7c3aed','#0f8a4c','#d97706'];

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--paper)',
      display:'flex', flexDirection:'column' }}>
      <AnalyticsHeader
        icon="◆"
        title="Beton-Verzeichnis"
        subtitle={`Übersicht aller im Projekt verwendeten Betonsorten · ${window.LV.project}`}
        counts={[
          { label:'Sorten',      value: groups.length },
          { label:'Positionen',  value: grandPos },
          { label:'Volumen m³',  value: grandVol.toLocaleString('de-DE',{ maximumFractionDigits:0 }) },
          { label:'Kosten €',    value: grandCost.toLocaleString('de-DE',{ maximumFractionDigits:0 }), color:'var(--blueD)' },
        ]}
      />

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px',
        borderBottom:'1px solid var(--line)', background:'var(--white)' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>
          {groups.length} Betonsorten · {grandPos} Positionen · ∑ {grandVol.toLocaleString('de-DE')} m³
        </span>
        <span style={{ flex:1 }}/>
        <ActionButton icon="↓" label="Excel / CSV" onClick={exportCSV}/>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'18px 22px' }}>
        {/* Top: cards with bar comparison */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(groups.length, 4)}, 1fr)`,
          gap:14, marginBottom:22 }}>
          {groups.map((g,i)=>{
            const c = palette[i % palette.length];
            const volPct = grandVol > 0 ? (g.totalVol/grandVol)*100 : 0;
            return (
              <div key={g.beton} style={{
                background:'var(--white)', border:'1px solid var(--line)',
                borderTop:`3px solid ${c}`, padding:'14px 16px'
              }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--sans)', fontSize:22, fontWeight:600, color:'var(--ink)', letterSpacing:-.4 }}>{g.beton}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)', letterSpacing:.4 }}>
                    {g.positions.length} POS · {[...g.sections].length} ABSCHN.
                  </span>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:8, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6 }}>VOLUMEN</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--ink)', marginTop:2 }}>
                      {g.totalVol.toLocaleString('de-DE',{ maximumFractionDigits:0 })} <span style={{ color:'var(--mute)', fontSize:10 }}>m³</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6 }}>GESAMTKOSTEN</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--ink)', marginTop:2 }}>
                      {g.totalCost.toLocaleString('de-DE',{ maximumFractionDigits:0 })} <span style={{ color:'var(--mute)', fontSize:10 }}>€</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ height:4, background:'var(--grid)' }}>
                    <div style={{ width:`${volPct}%`, height:'100%', background:c }}/>
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--mute)', marginTop:3 }}>
                    {volPct.toFixed(0)} % DES VOLUMENS
                  </div>
                </div>
                {g.expoSet.size > 0 && (
                  <div style={{ borderTop:'1px solid var(--grid)', paddingTop:8, marginTop:6 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mute)', letterSpacing:.6, marginBottom:5 }}>EXPOSITIONSKLASSEN</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {[...g.expoSet].sort().map(e => (
                        <span key={e} style={{
                          fontFamily:'var(--mono)', fontSize:9, padding:'1px 6px',
                          background:c+'18', color:c, border:`1px solid ${c}55`
                        }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail: positions per concrete class */}
        {groups.map((g,gi)=>{
          const c = palette[gi % palette.length];
          return (
            <div key={g.beton} style={{
              background:'var(--white)', border:'1px solid var(--line)',
              marginBottom:14
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', borderBottom:'1px solid var(--line)',
                background:'var(--panel)' }}>
                <span style={{ width:12, height:12, background:c, borderRadius:2 }}/>
                <span style={{ fontFamily:'var(--sans)', fontSize:14, fontWeight:600, color:'var(--ink)' }}>{g.beton}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:9.5, color:'var(--mute)' }}>
                  · {g.positions.length} Positionen · {g.totalVol.toLocaleString('de-DE')} m³ · {g.totalCost.toLocaleString('de-DE',{ maximumFractionDigits:0 })} €
                </span>
              </div>
              <div style={{ display:'flex', borderBottom:'1px solid var(--line2)',
                fontFamily:'var(--mono)', fontSize:9, letterSpacing:.6, color:'var(--mute)', textTransform:'uppercase' }}>
                {[['OZ','9%'],['Abschnitt','15%'],['Bezeichnung','30%'],['Exposition','13%'],
                  ['Tragend','8%'],['Menge','8%'],['EP €','8%'],['GP €','9%']
                ].map(([l,w])=>(
                  <div key={l} style={{ flex:`0 0 ${w}`, padding:'8px 12px',
                    borderRight:'1px solid var(--grid)' }}>{l}</div>
                ))}
              </div>
              {g.positions.map((p,i)=>(
                <div key={p.code} onClick={()=>onPick && onPick(p.sectionCode, p.code)}
                  style={{ display:'flex', borderBottom:'1px solid var(--grid)',
                    background: i%2 ? 'var(--panel)' : 'var(--white)', cursor:'pointer',
                    fontFamily:'var(--mono)', fontSize:11 }}>
                  <div style={{ flex:'0 0 9%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--blueD)', fontWeight:500 }}>{p.code}</div>
                  <div style={{ flex:'0 0 15%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--dim)' }}>
                    <span style={{ color:'var(--mute)' }}>§{p.sectionCode} </span>{p.sectionLabel}
                  </div>
                  <div style={{ flex:'0 0 30%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--ink)', fontFamily:'var(--sans)', fontSize:11.5, fontWeight:500,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</div>
                  <div style={{ flex:'0 0 13%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--dim)' }}>{(p.expo||[]).join(', ') || '—'}</div>
                  <div style={{ flex:'0 0 8%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--dim)' }}>{p.tragend===true?'tragend':p.tragend===false?'nicht':'—'}</div>
                  <div style={{ flex:'0 0 8%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--ink)', textAlign:'right' }}>
                    {p.menge?.toLocaleString('de-DE')} <span style={{ color:'var(--mute)', fontSize:9 }}>{p.einheit}</span>
                  </div>
                  <div style={{ flex:'0 0 8%', padding:'8px 12px', borderRight:'1px solid var(--grid)',
                    color:'var(--dim)', textAlign:'right' }}>{p.ep!=null ? p.ep.toLocaleString('de-DE',{ minimumFractionDigits:2 }) : '—'}</div>
                  <div style={{ flex:'0 0 9%', padding:'8px 12px', color:'var(--ink)', textAlign:'right', fontWeight:500 }}>
                    {((p.menge||0)*(p.ep||0)).toLocaleString('de-DE',{ maximumFractionDigits:0 })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { BieterfragenView, TasksView, BetonView });
