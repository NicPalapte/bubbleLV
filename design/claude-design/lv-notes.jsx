// lv-notes.jsx — Notes feature with classification (Bieterfrage, Hinweis, Klärung, Risiko, Allgemein)

// ─────────────────────────────────────────────────────────────
// Note types
// ─────────────────────────────────────────────────────────────
const NOTE_TYPES = [
  { id:'bieterfrage', label:'Bieterfrage', short:'BF', color:'#7c3aed', bg:'#ede9fe', border:'#c4b5fd' },
  { id:'hinweis',     label:'Hinweis',     short:'HW', color:'#0891b2', bg:'#cffafe', border:'#a5f3fc' },
  { id:'klaerung',    label:'Klärung',     short:'KL', color:'#d97706', bg:'#fde8c4', border:'#fcd34d' },
  { id:'risiko',      label:'Risiko',      short:'RS', color:'#dc2626', bg:'#fee2e2', border:'#fca5a5' },
  { id:'allgemein',   label:'Allgemein',   short:'AL', color:'#6b7d92', bg:'#eef2f7', border:'#cbd5e1' },
];
const NOTE_TYPE_MAP = Object.fromEntries(NOTE_TYPES.map(t=>[t.id, t]));

const NOTE_STATUS = [
  { id:'offen',        label:'offen' },
  { id:'beantwortet',  label:'beantwortet' },
  { id:'erledigt',     label:'erledigt' },
];

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
function useNotes() {
  const [m, setM] = React.useState(()=> {
    try { return JSON.parse(localStorage.getItem('bubble-notes') || 'null') ?? {}; }
    catch { return {}; }
  });
  React.useEffect(()=>{ try { localStorage.setItem('bubble-notes', JSON.stringify(m)); } catch {} }, [m]);

  const getFor = (id) => Object.prototype.hasOwnProperty.call(m, id)
    ? m[id]
    : (window.defaultNotes ? window.defaultNotes(id) : []);
  const update = (id, fn) => setM(o => ({ ...o, [id]: fn(getFor(id)) }));
  const all = () => {
    // merge seeded defaults with user edits — user edits win
    const out = {};
    if (window.LV) {
      // walk all known ids (sections + positions)
      window.LV.sections.forEach(s=>{
        out[s.id] = getFor(s.id);
        s.positions.forEach(p => { out[p.code] = getFor(p.code); });
      });
    }
    Object.keys(m).forEach(k => { out[k] = m[k]; });
    return out;
  };
  return { getFor, update, all };
}

// ─────────────────────────────────────────────────────────────
// UI bits
// ─────────────────────────────────────────────────────────────
function NoteTypeBadge({ type, size='sm' }) {
  const t = NOTE_TYPE_MAP[type] || NOTE_TYPE_MAP.allgemein;
  const big = size === 'lg';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding: big ? '2px 8px' : '1px 6px',
      border:`1px solid ${t.border}`, background:t.bg, color:t.color,
      fontFamily:'var(--mono)', fontSize: big ? 10 : 9, lineHeight:'14px', letterSpacing:.3
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:t.color }}/>
      {t.label}
    </span>
  );
}

function NoteStatusBadge({ s }) {
  const c = s==='beantwortet' ? { bg:'var(--greenS)', fg:'var(--greenD)' }
          : s==='erledigt'    ? { bg:'#eef2f7',       fg:'var(--dim)'   }
          :                     { bg:'var(--amberS)', fg:'var(--amber)' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'1px 6px', border:`1px solid ${c.fg}33`,
      background:c.bg, color:c.fg,
      fontFamily:'var(--mono)', fontSize:9, lineHeight:'14px', letterSpacing:.3
    }}>{s}</span>
  );
}

// Type picker — segmented chips
function TypePicker({ value, onChange }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {NOTE_TYPES.map(t => {
        const on = t.id === value;
        return (
          <span key={t.id} onClick={()=>onChange(t.id)} style={{
            padding:'2px 8px', cursor:'pointer',
            border:`1px solid ${on? t.color : 'var(--line)'}`,
            background: on ? t.bg : 'var(--white)',
            color: on ? t.color : 'var(--dim)',
            fontFamily:'var(--mono)', fontSize:9.5, letterSpacing:.2,
            display:'inline-flex', alignItems:'center', gap:5
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:t.color }}/>
            {t.label}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NotesBlock — used inside PropsPanel
// ─────────────────────────────────────────────────────────────
function NotesBlock({ id, notes, ownerId }) {
  const list = notes.getFor(id);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft]   = React.useState('');
  const [type, setType]     = React.useState('bieterfrage');

  const counts = NOTE_TYPES.map(t => ({ ...t, n: list.filter(x=>x.type===t.id).length }));
  const total = list.length;

  const add = () => {
    const v = draft.trim(); if (!v) { setAdding(false); return; }
    const newNote = {
      id: `n-${Date.now()}`,
      text: v,
      type,
      status: type === 'bieterfrage' ? 'offen' : 'offen',
      who: ownerId,
      date: new Date().toISOString().slice(0,10),
    };
    notes.update(id, arr => [...arr, newNote]);
    setDraft(''); setAdding(false);
  };
  const del = (nid) => notes.update(id, arr => arr.filter(n => n.id !== nid));
  const cycleStatus = (nid) => notes.update(id, arr => arr.map(n => {
    if (n.id !== nid) return n;
    const order = n.type === 'bieterfrage' ? ['offen','beantwortet','erledigt'] : ['offen','erledigt'];
    const i = order.indexOf(n.status);
    return { ...n, status: order[(i+1) % order.length] };
  }));

  return (
    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--grid)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:.6, color:'var(--mute)' }}>NOTIZEN</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>
          {total === 0 ? '—' : (
            counts.filter(c=>c.n>0).map((c,i,arr)=>(
              <React.Fragment key={c.id}>
                <span style={{ color:c.color }}>{c.n} {c.short}</span>{i<arr.length-1 ? ' · ' : ''}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {list.length === 0 && !adding && (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mute)',
          padding:'8px 0', borderTop:'1px dashed var(--grid2)', borderBottom:'1px dashed var(--grid2)', textAlign:'center' }}>
          Keine Notizen
        </div>
      )}

      {list.map(n => {
        const t = NOTE_TYPE_MAP[n.type] || NOTE_TYPE_MAP.allgemein;
        const who = (window.TEAM || []).find(x=>x.id===n.who);
        return (
          <div key={n.id} style={{
            padding:'8px 9px', marginBottom:6,
            border:`1px solid ${t.border}`, borderLeft:`3px solid ${t.color}`,
            background: t.bg + '55',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              <NoteTypeBadge type={n.type}/>
              <span onClick={()=>cycleStatus(n.id)} style={{ cursor:'pointer' }}>
                <NoteStatusBadge s={n.status}/>
              </span>
              <span style={{ flex:1 }}/>
              <span onClick={()=>del(n.id)} style={{
                color:'var(--mute)', cursor:'pointer',
                fontFamily:'var(--mono)', fontSize:11, padding:'0 2px'
              }}>✕</span>
            </div>
            <div style={{
              fontFamily:'var(--sans)', fontSize:12, color:'var(--ink)',
              lineHeight:1.45, marginBottom:5
            }}>{n.text}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6,
              fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>
              <span>{who?.name || 'unbekannt'}</span>
              <span>·</span>
              <span>{n.date}</span>
              {n.antwort && (
                <>
                  <span>·</span>
                  <span style={{ color:'var(--greenD)' }}>Antw. {n.antwortDate || ''}</span>
                </>
              )}
            </div>
            {n.antwort && (
              <div style={{
                marginTop:6, padding:'6px 8px', background:'var(--white)',
                borderLeft:'2px solid var(--greenD)',
                fontFamily:'var(--sans)', fontSize:11.5, color:'var(--ink)', lineHeight:1.4
              }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.5, color:'var(--greenD)', marginBottom:2 }}>ANTWORT</div>
                {n.antwort}
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div style={{ border:'1px solid var(--line2)', padding:8, background:'var(--white)' }}>
          <div style={{ marginBottom:6 }}>
            <TypePicker value={type} onChange={setType}/>
          </div>
          <textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{
              if (e.key==='Enter' && (e.metaKey||e.ctrlKey)) add();
              if (e.key==='Escape') { setAdding(false); setDraft(''); }
            }}
            placeholder={ type==='bieterfrage' ? 'Frage an Auftraggeber…' : 'Notiz…' }
            rows={3}
            style={{
              width:'100%', border:'1px solid var(--line)', outline:'none',
              fontFamily:'var(--sans)', fontSize:12, color:'var(--ink)',
              padding:6, background:'var(--paper)', resize:'vertical', boxSizing:'border-box'
            }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mute)' }}>⌘+↵ speichern · Esc abbrechen</span>
            <span style={{ display:'flex', gap:4 }}>
              <button onClick={()=>{ setAdding(false); setDraft(''); }} style={{
                border:'1px solid var(--line)', background:'var(--white)', color:'var(--dim)',
                fontFamily:'var(--mono)', fontSize:10, padding:'3px 10px', cursor:'pointer'
              }}>Abbrechen</button>
              <button onClick={add} style={{
                border:'1px solid var(--blue)', background:'var(--blue)', color:'#fff',
                fontFamily:'var(--mono)', fontSize:10, padding:'3px 10px', cursor:'pointer'
              }}>Speichern</button>
            </span>
          </div>
        </div>
      ) : (
        <div onClick={()=>setAdding(true)} style={{
          marginTop:8, padding:'5px 8px',
          border:'1px dashed var(--line2)', color:'var(--dim)',
          fontFamily:'var(--mono)', fontSize:10, cursor:'pointer', textAlign:'center'
        }}>+ Notiz / Bieterfrage hinzufügen</div>
      )}
    </div>
  );
}

Object.assign(window, { NOTE_TYPES, NOTE_TYPE_MAP, NOTE_STATUS, useNotes, NotesBlock, NoteTypeBadge, NoteStatusBadge });
