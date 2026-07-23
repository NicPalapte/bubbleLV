// lv-app.jsx — Bubble LV-Viewer (simplified)
// Three columns: slim tree · viewer (bubbles → table) · properties.

const { useState, useMemo, useRef, useEffect } = React;

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────

function Logo({ size = 22 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={size + 10} height={size} viewBox="0 0 26 18" style={{ display: 'block' }}>
        <line x1="5" y1="9" x2="14" y2="6" stroke="var(--line2)" strokeWidth="0.8" />
        <line x1="14" y1="6" x2="21" y2="12" stroke="var(--line2)" strokeWidth="0.8" />
        <line x1="5" y1="9" x2="14" y2="14" stroke="var(--line2)" strokeWidth="0.8" />
        <circle cx="14" cy="6" r="2.6" fill="var(--blue)" />
        <circle cx="5" cy="9" r="3.6" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
        <circle cx="21" cy="12" r="2.0" fill="none" stroke="var(--blue)" strokeWidth="1.4" />
      </svg>
      <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: size - 4,
        letterSpacing: -0.2, color: 'var(--ink)' }}>bubble</span>
    </div>);

}

function Status({ s, dotOnly }) {
  const map = {
    'geprüft': { bg: 'var(--greenS)', fg: 'var(--greenD)', dot: 'var(--greenD)' },
    'offen': { bg: 'var(--amberS)', fg: 'var(--amber)', dot: 'var(--amber)' },
    'entwurf': { bg: '#eef2f7', fg: 'var(--dim)', dot: 'var(--mute)' }
  };
  const c = map[s] || map['entwurf'];
  if (dotOnly) return <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 7px 1px 6px',
      border: `1px solid ${c.fg}33`, background: c.bg, color: c.fg,
      fontFamily: 'var(--mono)', fontSize: 9, lineHeight: '14px', letterSpacing: .3 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
      {s}
    </span>);

}

// ─────────────────────────────────────────────────────────────
// Assignees + tasks state (persisted in localStorage)
// ─────────────────────────────────────────────────────────────
function useLocalStore(key, fallback) {
  const [m, setM] = useState(() => {
    try {return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;}
    catch {return fallback;}
  });
  useEffect(() => {try {localStorage.setItem(key, JSON.stringify(m));} catch {}}, [m]);
  return [m, setM];
}

function useAssignees() {
  const [m, setM] = useLocalStore('bubble-assignees', {});
  // Mirror to window so window.assigneeFor (used by the pure filter path) stays live.
  if (typeof window !== 'undefined' && !window.__assignees) window.__assignees = m;
  useEffect(() => { window.__assignees = m; }, [m]);
  return {
    getFor: (id) => m[id] || defaultAssignee(id),
    setFor: (id, who) => setM((o) => ({ ...o, [id]: who }))
  };
}

function useTasks() {
  const [m, setM] = useLocalStore('bubble-tasks', {});
  const getFor = (id) => Object.prototype.hasOwnProperty.call(m, id) ? m[id] : defaultTasks(id);
  return {
    getFor,
    update: (id, fn) => setM((o) => ({ ...o, [id]: fn(getFor(id)) }))
  };
}

// Member chip with colored circle + initials
function Member({ id, size = 22, showName = false, onClick }) {
  const t = TEAM.find((x) => x.id === id) || TEAM[0];
  const initials = t.name.replace(/\.\s?/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
      cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: t.color + '1c', border: `1px solid ${t.color}`,
        color: t.color, fontFamily: 'var(--mono)', fontSize: size < 22 ? 8.5 : 9.5, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: .2
      }}>{initials}</span>
      {showName &&
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)' }}>
          {t.name} <span style={{ color: 'var(--mute)' }}>· {t.role}</span>
        </span>
      }
    </span>);

}

// Bearbeiter picker — avatar + name, opens dropdown of team
function AssigneePicker({ id, assignees, label = 'Bearbeiter' }) {
  const who = assignees.getFor(id);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ fontSize: 8, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--mute)' }}>{label}</div>
      <div onClick={() => setOpen((o) => !o)} style={{
        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '3px 8px 3px 4px', border: '1px solid var(--line)', background: 'var(--white)',
        cursor: 'pointer', borderRadius: 99
      }}>
        <Member id={who} size={22} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)' }}>
          {TEAM.find((t) => t.id === who)?.name}
        </span>
        <span style={{ color: 'var(--mute)', fontSize: 9, marginLeft: 2 }}>▾</span>
      </div>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: 200,
        background: 'var(--white)', border: '1px solid var(--line2)',
        boxShadow: '0 8px 24px rgba(26,37,51,0.10)', fontFamily: 'var(--mono)', fontSize: 10
      }}>
          {TEAM.map((t) => {
          const on = t.id === who;
          return (
            <div key={t.id} onClick={() => {assignees.setFor(id, t.id);setOpen(false);}}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', cursor: 'pointer',
              background: on ? 'var(--blueS)' : 'transparent',
              color: on ? 'var(--blueD)' : 'var(--ink)'
            }}>
                <Member id={t.id} size={20} />
                <span style={{ flex: 1 }}>{t.name}</span>
                <span style={{ color: 'var(--mute)' }}>{t.role}</span>
              </div>);

        })}
        </div>
      }
    </div>);

}

// Aufgaben (tasks) block — checkboxes, assignee per task, add new
function TasksBlock({ id, tasks, assignees, ownerId }) {
  const list = tasks.getFor(id);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const open = list.filter((t) => !t.done).length;
  const done = list.length - open;

  const toggle = (tid) => tasks.update(id, (arr) => arr.map((t) => t.id === tid ? { ...t, done: !t.done } : t));
  const del = (tid) => tasks.update(id, (arr) => arr.filter((t) => t.id !== tid));
  const add = () => {
    const v = draft.trim();if (!v) {setAdding(false);return;}
    const newTask = { id: `t-${Date.now()}`, title: v, done: false, who: ownerId };
    tasks.update(id, (arr) => [...arr, newTask]);
    setDraft('');setAdding(false);
  };

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)' }}>AUFGABEN</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)' }}>
          <span style={{ color: 'var(--amber)' }}>{open} offen</span>
          {done > 0 && <> · <span style={{ color: 'var(--greenD)' }}>{done} erledigt</span></>}
        </div>
      </div>
      {list.length === 0 && !adding &&
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)',
        padding: '8px 0', borderTop: '1px dashed var(--grid2)', borderBottom: '1px dashed var(--grid2)', textAlign: 'center' }}>
          Keine Aufgaben
        </div>
      }
      {list.map((t) => {
        const who = TEAM.find((m) => m.id === t.who) || TEAM[0];
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
            borderBottom: '1px solid var(--grid)'
          }}>
            <span onClick={() => toggle(t.id)} style={{
              width: 14, height: 14, marginTop: 1, flexShrink: 0, cursor: 'pointer',
              border: `1px solid ${t.done ? 'var(--blue)' : 'var(--line2)'}`,
              background: t.done ? 'var(--blue)' : 'var(--white)',
              color: '#fff', fontSize: 9, lineHeight: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>{t.done ? '✓' : ''}</span>
            <span style={{
              flex: 1, fontFamily: 'var(--mono)', fontSize: 10.5,
              color: t.done ? 'var(--mute)' : 'var(--ink)',
              textDecoration: t.done ? 'line-through' : 'none'
            }}>{t.title}</span>
            <Member id={t.who} size={16} />
            <span onClick={() => del(t.id)} style={{ color: 'var(--mute)', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 11, padding: '0 2px' }}>✕</span>
          </div>);

      })}
      {adding ?
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <span style={{ width: 14, height: 14, border: '1px solid var(--line2)', background: 'var(--white)' }} />
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {if (e.key === 'Enter') add();if (e.key === 'Escape') {setAdding(false);setDraft('');}}}
        onBlur={add}
        placeholder="Neue Aufgabe…"
        style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--blue)', outline: 'none',
          fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)', padding: '2px 0', background: 'transparent' }} />
        </div> :

      <div onClick={() => setAdding(true)} style={{
        marginTop: 8, padding: '5px 8px',
        border: '1px dashed var(--line2)', color: 'var(--dim)',
        fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', textAlign: 'center'
      }}>+ Aufgabe hinzufügen</div>
      }
    </div>);

}

// Render text with **bold** markers as highlighted spans.
function Highlighted({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <mark key={i} style={{
              background: 'var(--blueS)', color: 'var(--blueD)',
              padding: '0 3px', borderBottom: '1px solid var(--blue)',
              fontWeight: 500, borderRadius: 0
            }}>{p.slice(2, -2)}</mark>);

        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </span>);

}

function Chip({ children, on, onClick, dashed, count }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      border: dashed ? '1px dashed var(--line2)' : `1px solid ${on ? 'var(--blue)' : 'var(--line)'}`,
      background: on ? 'var(--blueS)' : 'var(--white)',
      color: on ? 'var(--blueD)' : 'var(--dim)',
      fontFamily: 'var(--mono)', fontSize: 10, lineHeight: '14px',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .12s'
    }}>
      {children}
      {count != null && count > 0 &&
      <span style={{
        marginLeft: 2, padding: '0 5px', minWidth: 14, height: 14,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--blue)' : 'var(--line)',
        color: on ? '#fff' : 'var(--dim)',
        fontFamily: 'var(--mono)', fontSize: 9, lineHeight: '14px', borderRadius: 7
      }}>{count}</span>
      }
    </button>);

}

// ─────────────────────────────────────────────────────────────
// Vergabepaket color dots (tree rows / inline)
// ─────────────────────────────────────────────────────────────
function VpDots({ vps, max = 4 }) {
  const list = (vps || []).filter(Boolean).slice(0, max);
  if (list.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      {list.map((v) =>
      <span key={v.id} title={`${v.code} · ${v.name}`}
        style={{ width: 7, height: 7, borderRadius: '50%', background: v.color, border: `1px solid ${v.border}` }} />
      )}
    </span>);

}

// ─────────────────────────────────────────────────────────────
// Active-filter strip — removable chips · Hervorheben/Ausblenden · reset
// ─────────────────────────────────────────────────────────────
function FilterStrip({ filters, setFilter, hideMode, setHideMode, onReset }) {
  const chips = [];
  FACETS.forEach((f) => {
    const sel = filters[f.id];
    if (sel instanceof Set && sel.size > 0) {
      const vals = f.sortValues ? f.sortValues([...sel]) : [...sel];
      vals.forEach((v) => chips.push({
        facetId: f.id, value: v,
        label: f.optionLabel ? f.optionLabel(v) : v,
        color: f.swatch ? f.swatch(v) : null }));
    }
  });
  if (filters.menge && Array.isArray(filters.menge)) {
    chips.push({ facetId: 'menge', value: null,
      label: `Menge ${filters.menge[0].toLocaleString('de-DE')}–${filters.menge[1].toLocaleString('de-DE')}`, color: null });
  }
  if (chips.length === 0) return null;
  const remove = (facetId, value) => {
    if (facetId === 'menge') { setFilter('menge', null); return; }
    const next = new Set(filters[facetId]); next.delete(value);
    setFilter(facetId, next);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
      background: 'var(--white)', borderBottom: '1px solid var(--line)', flexShrink: 0,
      overflowX: 'auto', position: 'relative', zIndex: 4 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)', letterSpacing: .6, flexShrink: 0 }}>AKTIVE FILTER</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
        {chips.map((c, i) =>
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 6px 3px 9px',
          border: `1px solid ${c.color || 'var(--line2)'}`, background: c.color ? 'var(--white)' : 'var(--paper)',
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          {c.color && <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />}
          {c.label}
          <span onClick={() => remove(c.facetId, c.value)} style={{ cursor: 'pointer', color: 'var(--mute)', fontSize: 11, lineHeight: 1 }}>✕</span>
        </span>
        )}
      </div>
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)', letterSpacing: .6, flexShrink: 0 }}>NICHT-TREFFER</span>
      <div style={{ display: 'flex', border: '1px solid var(--line)', flexShrink: 0 }}>
        {[['dim', 'Hervorheben'], ['hide', 'Ausblenden']].map(([m, lbl], i) => {
          const on = hideMode === m;
          return (
            <span key={m} onClick={() => setHideMode(m)} style={{
              padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5,
              background: on ? 'var(--blueS)' : 'var(--white)', color: on ? 'var(--blueD)' : 'var(--dim)',
              borderLeft: i > 0 ? '1px solid var(--line)' : 'none', fontWeight: on ? 500 : 400 }}>{lbl}</span>);
        })}
      </div>
      <Chip dashed onClick={onReset}>✕ Zurücksetzen</Chip>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Position properties: Vergabepakete + Preisspiegel (NU offered EP)
// ─────────────────────────────────────────────────────────────
function PosVergabe({ p }) {
  const vps = window.positionPakete ? window.positionPakete(p.code) : [];
  if (vps.length === 0) return null;
  const offers = (window.angeboteForPosition ? window.angeboteForPosition(p.code) : []).slice().sort((a, b) => a.ep - b.ep);
  const lo = offers.length ? offers[0].ep : null;
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 6 }}>VERGABEPAKETE</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {vps.map((v) =>
        <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
          background: v.soft, border: `1px solid ${v.border}`, color: v.ink, fontFamily: 'var(--mono)', fontSize: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: v.color }} />
          {v.code} · {v.name}
        </span>
        )}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)' }}>PREISSPIEGEL</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--mute)' }}>EP · {offers.length} Angebot(e)</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--panel)',
        border: '1px solid var(--grid)', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--dim)' }}>
        <span>LV-Schätzung</span>
        <span style={{ color: 'var(--ink)' }}>{p.ep != null ? p.ep.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '—'}</span>
      </div>
      {offers.length === 0 &&
      <div style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>Noch keine Angebote.</div>
      }
      {offers.map((o, i) => {
        const delta = p.ep != null ? (o.ep - p.ep) / p.ep * 100 : null;
        const best = o.ep === lo;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
            borderBottom: '1px solid var(--grid)', background: best ? 'var(--greenS)' : 'transparent' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: (window.ANFRAGE_STATUS[o.status] || {}).dot || 'var(--mute)' }} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.nu.name}</span>
            {best && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--greenD)', border: '1px solid var(--greenD)', padding: '0 4px' }}>günstigst</span>}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)' }}>{o.ep.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
            {delta != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, width: 44, textAlign: 'right', color: delta > 0 ? '#b91c1c' : 'var(--greenD)' }}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>}
          </div>);
      })}
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Faceted filter — dynamic, generated from data
// ─────────────────────────────────────────────────────────────
// A filter is { facetId: Set(values) }. Each facet has:
//   id, label, getValues(p)→string[], (optional) sort, (optional) render
const FACETS = [
{ id: 'paket', label: 'Vergabepaket',
  get: (p) => window.positionPakete ? window.positionPakete(p.code).map((v) => v.id) : [],
  optionLabel: (id) => { const v = window.VP_BY_ID && window.VP_BY_ID[id]; return v ? `${v.code} · ${v.name}` : id; },
  swatch: (id) => window.VP_BY_ID && window.VP_BY_ID[id] ? window.VP_BY_ID[id].color : null,
  sortValues: (vals) => { const ord = (window.VERGABEPAKETE || []).map((v) => v.id); return [...vals].sort((a, b) => ord.indexOf(a) - ord.indexOf(b)); } },
{ id: 'nu', label: 'Nachunternehmer',
  get: (p) => {
    if (!window.positionPakete || !window.anfragenFor) return [];
    const ids = new Set();
    window.positionPakete(p.code).forEach((v) => window.anfragenFor(v.id).forEach((a) => ids.add(a.nuId)));
    return [...ids];
  },
  optionLabel: (id) => window.NU_BY_ID && window.NU_BY_ID[id] ? window.NU_BY_ID[id].name : id },
{ id: 'bearb', label: 'Verantwortlich',
  get: (p) => window.assigneeFor ? [window.assigneeFor(p.code)] : [],
  optionLabel: (id) => { const t = (window.TEAM || []).find((x) => x.id === id); return t ? `${t.name} · ${t.role}` : id; },
  sortValues: (vals) => { const ord = (window.TEAM || []).map((t) => t.id); return [...vals].sort((a, b) => ord.indexOf(a) - ord.indexOf(b)); } },
{ id: 'status', label: 'Status', get: (p) => [p.status] },
{ id: 'beton', label: 'Druckfestigkeit', get: (p) => p.beton ? [p.beton] : [] },
{ id: 'einheit', label: 'Einheit', get: (p) => p.einheit ? [p.einheit] : [] }];


function FacetButton({ facet, allPositions, active, setActive }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  // Compute available values + counts from full dataset
  const counts = useMemo(() => {
    const m = new Map();
    allPositions.forEach((p) => facet.get(p).forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
    return m;
  }, [allPositions, facet]);
  const values = facet.sortValues ? facet.sortValues([...counts.keys()]) : [...counts.keys()].sort();

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (v) => {
    const next = new Set(active);
    next.has(v) ? next.delete(v) : next.add(v);
    setActive(next);
  };

  return (
    <div ref={btnRef} style={{ position: 'relative' }}>
      <Chip on={active.size > 0} onClick={() => setOpen((o) => !o)} count={active.size}>
        {facet.label} <span style={{ color: active.size > 0 ? 'var(--blueD)' : 'var(--mute)', marginLeft: -2 }}>▾</span>
      </Chip>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
        minWidth: 244, maxWidth: 320, background: 'var(--white)', border: '1px solid var(--line2)',
        boxShadow: '0 8px 24px rgba(26,37,51,0.10)',
        fontFamily: 'var(--mono)', fontSize: 10
      }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'var(--mute)', letterSpacing: .5, fontSize: 9, textTransform: 'uppercase' }}>
            <span>{facet.label}</span>
            {active.size > 0 &&
          <span onClick={() => setActive(new Set())} style={{ cursor: 'pointer', color: 'var(--blue)' }}>
                zurücksetzen
              </span>
          }
          </div>
          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            {values.length === 0 &&
          <div style={{ padding: '10px 12px', color: 'var(--mute)' }}>Keine Werte</div>
          }
            {values.map((v) => {
            const on = active.has(v);
            return (
              <div key={v} onClick={() => toggle(v)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                cursor: 'pointer', background: on ? 'var(--blueS)' : 'transparent',
                color: on ? 'var(--blueD)' : 'var(--ink)'
              }}>
                  <span style={{
                  width: 12, height: 12, border: `1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`,
                  background: on ? 'var(--blue)' : 'var(--white)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 9, lineHeight: 1
                }}>{on ? '✓' : ''}</span>
                  {facet.id === 'status' ? <Status s={v} dotOnly /> : null}
                  {facet.id === 'bearb' ? <Member id={v} size={16} /> : null}
                  {facet.swatch && facet.swatch(v) ? <span style={{ width: 11, height: 11, borderRadius: 2, background: facet.swatch(v), flexShrink: 0 }} /> : null}
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={facet.optionLabel ? facet.optionLabel(v) : v}>{facet.optionLabel ? facet.optionLabel(v) : v}</span>
                  <span style={{ color: 'var(--mute)', flexShrink: 0 }}>{counts.get(v)}</span>
                </div>);

          })}
          </div>
        </div>
      }
    </div>);

}

// Range filter for numeric facets (Menge)
function RangeButton({ id, label, allPositions, getter, unit, active, setActive }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const values = useMemo(() => allPositions.map(getter).filter((v) => v != null), [allPositions, getter]);
  const min = values.length ? Math.floor(Math.min(...values)) : 0;
  const max = values.length ? Math.ceil(Math.max(...values)) : 100;
  const [lo, hi] = active || [min, max];
  const isActive = active && (active[0] > min || active[1] < max);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);};
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={btnRef} style={{ position: 'relative' }}>
      <Chip on={isActive} onClick={() => setOpen((o) => !o)}>
        {label} {isActive &&
        <span style={{ color: 'var(--blueD)' }}>· {lo.toLocaleString('de-DE')}–{hi.toLocaleString('de-DE')}</span>
        }
        <span style={{ color: isActive ? 'var(--blueD)' : 'var(--mute)', marginLeft: -2 }}>▾</span>
      </Chip>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, width: 260,
        background: 'var(--white)', border: '1px solid var(--line2)',
        boxShadow: '0 8px 24px rgba(26,37,51,0.10)', padding: 14,
        fontFamily: 'var(--mono)', fontSize: 10
      }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'var(--mute)', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>
            <span>{label} ({unit})</span>
            {isActive &&
          <span onClick={() => setActive(null)} style={{ cursor: 'pointer', color: 'var(--blue)' }}>
                zurücksetzen
              </span>
          }
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)', marginBottom: 6 }}>
            <span>{lo.toLocaleString('de-DE')}</span>
            <span>{hi.toLocaleString('de-DE')}</span>
          </div>
          <div style={{ position: 'relative', height: 24 }}>
            <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 2, background: 'var(--grid)' }} />
            <div style={{ position: 'absolute', top: 11, height: 2, background: 'var(--blue)',
            left: `${(lo - min) / (max - min) * 100}%`, right: `${(max - hi) / (max - min) * 100}%` }} />
            <input type="range" min={min} max={max} value={lo}
          onChange={(e) => setActive([Math.min(+e.target.value, hi), hi])}
          style={{ position: 'absolute', inset: 0, width: '100%', appearance: 'none', background: 'transparent', pointerEvents: 'auto' }} />
            <input type="range" min={min} max={max} value={hi}
          onChange={(e) => setActive([lo, Math.max(+e.target.value, lo)])}
          style={{ position: 'absolute', inset: 0, width: '100%', appearance: 'none', background: 'transparent', pointerEvents: 'auto' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)', fontSize: 9, marginTop: 6 }}>
            <span>min {min.toLocaleString('de-DE')}</span>
            <span>max {max.toLocaleString('de-DE')}</span>
          </div>
        </div>
      }
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Filter matching — single source of truth for all views
// ─────────────────────────────────────────────────────────────
function matchPos(p, filters, search) {
  for (const f of FACETS) {
    const sel = filters[f.id];
    if (sel instanceof Set && sel.size > 0) {
      const vals = f.get(p);
      if (!vals.some((v) => sel.has(v))) return false;
    }
  }
  if (filters.menge && Array.isArray(filters.menge)) {
    const [lo, hi] = filters.menge;
    const m = p.menge || 0;
    if (m < lo || m > hi) return false;
  }
  if (search) {
    const q = search.toLowerCase();
    if (!(p.label || '').toLowerCase().includes(q) &&
    !(p.code || '').toLowerCase().includes(q) &&
    !(p.beton || '').toLowerCase().includes(q) &&
    !(p.langtext || '').toLowerCase().includes(q)) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Resize handle
// ─────────────────────────────────────────────────────────────
function ResizeHandle({ value, setValue, min, max, sign = 1 }) {
  const start = (e) => {
    e.preventDefault();
    const x0 = e.clientX;
    const v0 = value;
    const move = (ev) => {
      const dx = ev.clientX - x0;
      const next = Math.min(max, Math.max(min, v0 + sign * dx));
      setValue(next);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <div onMouseDown={start}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--blueS)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    style={{
      width: 5, flexShrink: 0, cursor: 'col-resize', background: 'transparent',
      borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)',
      position: 'relative', zIndex: 4, transition: 'background .1s'
    }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 1, height: 26, background: 'var(--line2)', pointerEvents: 'none'
      }} />
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Topbar — slim, with faceted filters
// ─────────────────────────────────────────────────────────────
function TopBar({ breadcrumb, search, setSearch, filters, setFilter, allPositions, onReset, analyticsMode }) {
  const activeCount = Object.values(filters).reduce((a, v) => {
    if (v instanceof Set) return a + v.size;
    if (Array.isArray(v)) return a + 1;
    return a;
  }, 0);
  return (
    <div style={{ height: 54, background: 'var(--white)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'stretch', flexShrink: 0, position: 'relative', zIndex: 5 }}>
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--line)' }}>
        <Logo size={22} />
      </div>
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8,
        color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 10, borderRight: '1px solid var(--line)' }}>
        {breadcrumb}
      </div>
      <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
          border: '1px solid var(--line)', background: 'var(--white)', flex: 1,
          opacity: analyticsMode ? 0.45 : 1 }}>
          <span style={{ color: 'var(--mute)', fontSize: 12 }}>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={analyticsMode ? 'Suche in LV-Ansicht' : 'Positionen, OZ, Langtext…'}
          disabled={analyticsMode}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }} />
          <span style={{ color: 'var(--mute)', fontFamily: 'var(--mono)', fontSize: 9,
            border: '1px solid var(--line)', padding: '0 5px' }}>/</span>
        </div>
      </div>
      {analyticsMode ?
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>
            ANALYTIK-ANSICHT · Filter & Bubble-Navigation in LV-Ansicht verfügbar
          </span>
        </div> :

      <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'visible' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)', letterSpacing: .6, marginRight: 2 }}>FILTER</span>
          {FACETS.map((f) =>
        <FacetButton key={f.id} facet={f} allPositions={allPositions}
        active={filters[f.id] || new Set()}
        setActive={(v) => setFilter(f.id, v)} />
        )}
          <RangeButton id="menge" label="Menge" allPositions={allPositions}
        getter={(p) => p.menge} unit="∈ Einheit"
        active={filters.menge} setActive={(v) => setFilter('menge', v)} />
          {activeCount > 0 &&
        <Chip dashed onClick={onReset}>✕ {activeCount} zurücksetzen</Chip>
        }
        </div>
      }
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12,
        borderLeft: '1px solid var(--line)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--blueS)',
          border: '1px solid var(--blue)', color: 'var(--blueD)', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JT</div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Left tree — slim, search included, filter-aware, collapsible
// ─────────────────────────────────────────────────────────────
function Tree({ width, collapsed, setCollapsed, selSection, selPos, view, setView,
  notes, tasks, onSection, onPos, onRoot, filters, globalSearch, hideMode }) {
  const q = (globalSearch || '').trim();
  const [openIds, setOpenIds] = useState(new Set(LV.sections.map((s) => s.id)));
  const toggle = (id) => setOpenIds((o) => {const n = new Set(o);n.has(id) ? n.delete(id) : n.add(id);return n;});
  const treeMatches = (s) => !q || (s || '').toLowerCase().includes(q.toLowerCase());

  // analytics counts (sidebar badges)
  const navCounts = useMemo(() => {
    let bf = 0;
    const allNotes = notes ? notes.all() : {};
    Object.values(allNotes).forEach((arr) => arr.forEach((n) => {if (n.type === 'bieterfrage' && n.status !== 'erledigt') bf++;}));
    let openTasks = 0;
    if (tasks) {
      LV.sections.forEach((sec) => {
        tasks.getFor(sec.id).forEach((t) => {if (!t.done) openTasks++;});
        sec.positions.forEach((p) => tasks.getFor(p.code).forEach((t) => {if (!t.done) openTasks++;}));
      });
    }
    const betonSet = new Set();
    LV.sections.forEach((sec) => sec.positions.forEach((p) => {if (p.beton) betonSet.add(p.beton);}));
    const vpCount = (window.VERGABEPAKETE || []).length;
    let nuWarn = 0;
    (window.NACHUNTERNEHMER || []).forEach((n) => { const s = window.nuDocStatus(n.id); if ((s.expired + s.missing) > 0) nuWarn++; });
    return { bf, openTasks, beton: betonSet.size, vp: vpCount, nuWarn };
  }, [notes, tasks]);

  // Counts are neutral by default; only genuine "needs attention" states carry a single accent.
  const NAV = [
  { id: 'vp', label: 'Vergabepakete', icon: '▣', count: navCounts.vp },
  { id: 'nu', label: 'Nachunternehmer', icon: '⊞', count: navCounts.nuWarn, warn: true },
  { id: 'bf', label: 'Bieterfragen', icon: '?', count: navCounts.bf, warn: true },
  { id: 'tasks', label: 'Aufgaben', icon: '✓', count: navCounts.openTasks, warn: true },
  { id: 'beton', label: 'Beton-Verzeichnis', icon: '◆', count: navCounts.beton }];


  // ── COLLAPSED: icon rail
  if (collapsed) {
    return (
      <div style={{ width: 44, background: 'var(--white)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div onClick={() => setCollapsed(false)} title="Baum ausklappen"
        style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid var(--line)', cursor: 'pointer', color: 'var(--dim)',
          fontFamily: 'var(--mono)', fontSize: 15 }}>›</div>
        {/* analytics nav (collapsed) */}
        {NAV.map((n) => {
          const on = view === n.id;
          return (
            <div key={n.id} onClick={() => setView(n.id)} title={n.label}
            style={{
              height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid var(--grid)', cursor: 'pointer', position: 'relative',
              background: on ? 'var(--blueS)' : 'transparent',
              color: on ? 'var(--blueD)' : 'var(--dim)',
              borderLeft: on ? '2px solid var(--blue)' : '2px solid transparent',
              fontFamily: 'var(--mono)', fontSize: 13
            }}>
              {n.icon}
              {n.count > 0 &&
              <span style={{ position: 'absolute', top: 4, right: 4,
                minWidth: 14, height: 14, padding: '0 3px',
                background: n.warn ? 'var(--amber)' : 'var(--dim)', color: '#fff',
                fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7
              }}>{n.count}</span>
              }
            </div>);

        })}
        <div onClick={onRoot} title="Übersicht"
        style={{
          height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid var(--line)', borderTop: '1px solid var(--line)',
          cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 11,
          color: view === 'lv' && !selSection ? 'var(--blueD)' : 'var(--dim)',
          background: view === 'lv' && !selSection ? 'var(--blueS)' : 'transparent'
        }}>◯</div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {LV.sections.map((sec) => {
            const matching = sec.positions.filter((p) => matchPos(p, filters, globalSearch)).length;
            const on = selSection === sec.id;
            return (
              <div key={sec.id} onClick={() => onSection(sec.id)} title={`${sec.code} · ${sec.label}`}
              style={{
                height: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                background: on ? 'var(--blueS)' : 'transparent',
                borderLeft: on ? '2px solid var(--blue)' : '2px solid transparent',
                opacity: matching === 0 ? 0.4 : 1
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11,
                  color: on ? 'var(--blueD)' : 'var(--ink)', lineHeight: 1 }}>{sec.code}</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 3,
                  background: sec.status === 'geprüft' ? 'var(--greenD)' : sec.status === 'offen' ? 'var(--amber)' : 'var(--mute)' }} />
              </div>);

          })}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)',
          writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: 1.2,
          padding: '8px 0', textAlign: 'center' }}>
          STRUKTUR
        </div>
      </div>);

  }

  // ── EXPANDED
  return (
    <div style={{ width, background: 'var(--white)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* PROJECT header — prominent; click to return to bubble overview */}
      <div style={{ padding: '10px 12px 11px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: .6, color: 'var(--mute)',
            textTransform: 'uppercase' }}>Projekt</span>
          <span onClick={() => setCollapsed(true)} title="Einklappen"
          style={{ cursor: 'pointer', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 13,
            padding: '0 2px', lineHeight: 1 }}>‹</span>
        </div>
        <div onClick={onRoot} style={{ cursor: 'pointer',
          borderLeft: view === 'lv' && !selSection ? '2px solid var(--blue)' : '2px solid transparent',
          paddingLeft: 8, marginLeft: -2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 700,
              color: view === 'lv' && !selSection ? 'var(--blueD)' : 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{LV.project}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', flexShrink: 0,
              border: '1px solid var(--line2)', padding: '0 4px', lineHeight: '15px' }}>{LV.version}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', marginTop: 3 }}>
            Übersicht · {LV.sections.length} Abschnitte
          </div>
        </div>
      </div>

      {/* ANALYTIK block */}
      <div style={{ padding: '8px 8px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div style={{ padding: '2px 4px 6px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)',
            textTransform: 'uppercase' }}>Analytik</span>
        </div>
        {NAV.map((n) => {
          const on = view === n.id;
          return (
            <div key={n.id} onClick={() => setView(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              cursor: 'pointer',
              borderLeft: on ? '2px solid var(--blue)' : '2px solid transparent',
              background: on ? 'var(--blueS)' : 'transparent',
              color: on ? 'var(--blueD)' : 'var(--ink)',
              fontFamily: 'var(--mono)', fontSize: 11
            }}>
              <span style={{
                width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`, background: 'var(--white)',
                fontSize: 10, color: on ? 'var(--blue)' : 'var(--dim)'
              }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.count > 0 &&
              <span style={{
                padding: '1px 6px', minWidth: 18, textAlign: 'center',
                background: n.warn ? 'var(--amber)' : '#eef2f7', color: n.warn ? '#fff' : 'var(--dim)',
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: .2
              }}>{n.count}</span>
              }
            </div>);

        })}
      </div>

      {/* Struktur header */}
      <div style={{ padding: '8px 12px 2px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6,
        color: 'var(--mute)', textTransform: 'uppercase' }}>Struktur</div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {LV.sections.map((sec) => {
          const facetMatch = (p) => matchPos(p, filters, '');
          const facetsActive = Object.values(filters).some((v) =>
          v instanceof Set && v.size > 0 || Array.isArray(v));
          const secMatch = treeMatches(sec.label) || treeMatches(sec.code);
          // Text search always narrows candidates (hides non-text matches).
          const candidates = q ? sec.positions.filter((p) => treeMatches(p.label) || treeMatches(p.code)) : sec.positions;
          if (q && !secMatch && candidates.length === 0) return null;
          const facetCount = candidates.filter(facetMatch).length;
          // Facet filter: 'hide' removes empty sections; 'dim' keeps + dims.
          if (hideMode === 'hide' && facetsActive && facetCount === 0 && !secMatch) return null;
          const display = hideMode === 'hide' && facetsActive ? candidates.filter(facetMatch) : candidates;
          const open = openIds.has(sec.id) || !!q && display.length > 0;
          const dimSec = facetsActive && facetCount === 0;
          const secVps = window.positionPakete ?
          [...new Set(sec.positions.flatMap((p) => window.positionPakete(p.code).map((v) => v.id)))].map((id) => window.VP_BY_ID[id]) : [];
          return (
            <div key={sec.id} style={{ opacity: dimSec ? 0.4 : 1 }}>
              <div onClick={() => {toggle(sec.id);onSection(sec.id);}}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderLeft: selSection === sec.id && !selPos ? '2px solid var(--blue)' : `2px solid ${secVps[0] ? secVps[0].color : 'transparent'}`,
                background: selSection === sec.id && !selPos ? 'var(--blueS)' : 'transparent',
                fontFamily: 'var(--mono)', fontSize: 11,
                color: selSection === sec.id && !selPos ? 'var(--blueD)' : 'var(--ink)',
                cursor: 'pointer'
              }}>
                <span style={{ width: 10, color: 'var(--mute)', fontSize: 9 }}>{open ? '▾' : '▸'}</span>
                <span style={{ color: 'var(--mute)', fontSize: 10, width: 22 }}>{sec.code}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{sec.label}</span>
                <Status s={sec.status} dotOnly />
                <span style={{ color: 'var(--mute)', fontSize: 9, fontFamily: 'var(--mono)',
                  minWidth: 32, textAlign: 'right' }}>
                  {facetsActive && facetCount !== sec.positions.length ?
                  <><span style={{ color: 'var(--blueD)' }}>{facetCount}</span>/{sec.positions.length}</> :
                  sec.positions.length}
                </span>
              </div>
              {open && display.map((p) => {
                const pDim = facetsActive && !facetMatch(p);
                const pvps = window.positionPakete ? window.positionPakete(p.code) : [];
                return (
                  <div key={p.code} onClick={(e) => {e.stopPropagation();onPos(sec.id, p.code);}}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 18px',
                    borderLeft: selPos === p.code ? '2px solid var(--blue)' : `2px solid ${pvps[0] ? pvps[0].color : 'transparent'}`,
                    background: selPos === p.code ? 'var(--blueS)' : 'transparent',
                    fontFamily: 'var(--mono)', fontSize: 10.5,
                    color: selPos === p.code ? 'var(--blueD)' : 'var(--ink)',
                    opacity: pDim ? 0.32 : 1,
                    cursor: 'pointer'
                  }}>
                    <span style={{ color: 'var(--mute)', fontSize: 10, width: 42 }}>{p.code}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                    <Status s={p.status} dotOnly />
                  </div>);

              })}
            </div>);

        })}
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Bubble graph + scalable engine moved to lv-graph.jsx.
// Exposes: window.Bubbles, window.AllPositionsTable, window.SIZE_MODES,
//          window.LOTS, window.DOCS
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Positions table — appears once you drill in
// ─────────────────────────────────────────────────────────────
function PositionsTable({ section, selPos, onPick, filters, search, assignees, onBack }) {
  const [sort, setSort] = useState({ key: 'code', dir: 1 });
  const rows = useMemo(() => {
    let r = section.positions.filter((p) => matchPos(p, filters, search));
    r.sort((a, b) => {
      const va = a[sort.key],vb = b[sort.key];
      if (va == null) return 1;if (vb == null) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
    });
    return r;
  }, [section, sort, filters, search]);

  const cols = [
  { k: 'code', l: 'OZ', w: '9%' },
  { k: 'label', l: 'Bezeichnung', w: '28%' },
  { k: 'beton', l: 'Druckfestigkeit', w: '11%' },
  { k: 'expo', l: 'Exposition', w: '12%', render: (p) => (p.expo || []).join(', ') || '—' },
  { k: 'einheit', l: 'Einheit', w: '6%' },
  { k: 'menge', l: 'Menge', w: '8%', align: 'right', render: (p) => p.menge?.toLocaleString('de-DE') },
  { k: 'ep', l: 'EP €', w: '8%', align: 'right', render: (p) => p.ep != null ? p.ep.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
  { k: 'bearb', l: 'Bearb.', w: '8%', render: (p) => assignees ? <Member id={assignees.getFor(p.code)} size={18} /> : null },
  { k: 'status', l: 'Status', w: '10%', render: (p) => <Status s={p.status} /> }];


  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--white)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* table sub-toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 12, padding: '10px 16px',
        borderBottom: '1px solid var(--line)', background: 'var(--panel)',
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', minWidth: 0 }}>
        <span onClick={onBack} title="Zurück zur Übersicht"
        style={{ cursor: 'pointer', color: 'var(--blue)', padding: '0 4px',
          fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1 }}>←</span>
        <span style={{ letterSpacing: .6, color: 'var(--mute)' }}>§ {section.code}</span>
        <span style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600 }}>
          {section.label}
        </span>
        <Status s={section.status} />
        <span style={{ color: 'var(--line2)' }}>·</span>
        <span><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{rows.length}</span>
          /{section.positions.length} Pos.</span>
        <span style={{ color: 'var(--line2)' }}>·</span>
        <span>∑ {rows.reduce((a, p) => a + (p.menge || 0), 0).toLocaleString('de-DE')} {rows[0]?.einheit || ''}</span>
        <span style={{ color: 'var(--line2)' }}>·</span>
        <span>∑ {rows.reduce((a, p) => a + (p.menge || 0) * (p.ep || 0), 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
        <span style={{ marginLeft: 'auto', color: 'var(--mute)' }}>sortiert nach {sort.key} {sort.dir > 0 ? '↑' : '↓'}</span>
      </div>
      {/* header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line2)', background: 'var(--white)',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', textTransform: 'uppercase',
        minWidth: 0, overflow: 'hidden' }}>
        {cols.map((c) =>
        <div key={c.k} onClick={() => setSort((s) => ({ key: c.k, dir: s.key === c.k ? -s.dir : 1 }))}
        style={{ flex: `0 0 ${c.w}`, padding: '10px 12px', borderRight: '1px solid var(--line)',
          textAlign: c.align || 'left', cursor: 'pointer', userSelect: 'none',
          color: sort.key === c.k ? 'var(--blue)' : 'var(--mute)' }}>
            {c.l} {sort.key === c.k ? sort.dir > 0 ? '↑' : '↓' : ''}
          </div>
        )}
      </div>
      {/* body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rows.length === 0 &&
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--mute)', fontSize: 11 }}>
            Keine Positionen entsprechen den Filtern.
          </div>
        }
        {rows.map((p, i) =>
        <div key={p.code} onClick={() => onPick(p.code)}
        style={{ display: 'flex', borderBottom: '1px solid var(--grid)',
          background: selPos === p.code ? 'var(--blueS)' :
          i % 2 ? 'var(--panel)' : 'var(--white)',
          cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 11 }}>
            {cols.map((c) => {
            const v = c.render ? c.render(p) : p[c.k] ?? '—';
            return (
              <div key={c.k} style={{
                flex: `0 0 ${c.w}`, padding: '9px 12px', borderRight: '1px solid var(--grid)',
                textAlign: c.align || 'left',
                color: c.k === 'label' ? 'var(--ink)' : c.k === 'code' ? 'var(--dim)' : 'var(--dim)',
                fontWeight: c.k === 'label' ? 500 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                  {v}
                </div>);

          })}
          </div>
        )}
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Right properties — slim, varies by selection
// ─────────────────────────────────────────────────────────────
function PF({ l, v }) {
  return (
    <div style={{ padding: '5px 0' }}>
      <div style={{ fontSize: 8, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--mute)' }}>{l}</div>
      <div style={{ color: 'var(--ink)', marginTop: 2, fontFamily: 'var(--mono)', fontSize: 11 }}>{v}</div>
    </div>);

}

function PropsPanel({ width, section, position, lot, project, assignees, tasks, notes }) {
  const shell = { width, background: 'var(--white)', borderLeft: '1px solid var(--line)',
    display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' };

  // ── PROJECT (hover on project bubble)
  if (project) {
    const projPos = LV.sections.reduce((a, s) => a + s.positions.length, 0)
      + LOTS.reduce((a, l) => a + (l.mock?.count || 0), 0);
    const projCost = LV.sections.reduce((a, s) => a + s.positions.reduce((b, p) => b + (p.menge || 0) * (p.ep || 0), 0), 0)
      + LOTS.reduce((a, l) => a + (l.mock?.cost || 0), 0);
    const projVol = LV.sections.reduce((a, s) => a + (s.volume || 0), 0)
      + LOTS.reduce((a, l) => a + (l.mock?.volume || 0), 0);
    return (
      <div style={shell}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>PROJEKT</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', border: '1px solid var(--line2)', padding: '0 5px', lineHeight: '15px' }}>{LV.version}</span>
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{LV.project}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>KENNZAHLEN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
              <PF l="Lose" v={LOTS.length} />
              <PF l="Abschnitte" v={LV.sections.length} />
              <PF l="Positionen" v={projPos.toLocaleString('de-DE')} />
              <PF l="Volumen" v={`${projVol.toLocaleString('de-DE')} m³`} />
              <PF l="Gesamtpreis" v={`${projCost.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`} />
            </div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 6 }}>LOSE</div>
            {LOTS.map((l) => {
              const secs = l.sectionIds.map((id) => LV.sections.find((s) => s.id === id)).filter(Boolean);
              const pc = secs.length ? secs.reduce((a, s) => a + s.positions.length, 0) : (l.mock?.count || 0);
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                  borderBottom: '1px solid var(--grid)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                  <span style={{ color: 'var(--mute)', width: 16 }}>{l.num}</span>
                  <span style={{ flex: 1, color: 'var(--ink)' }}>{l.label}</span>
                  <span style={{ color: 'var(--dim)' }}>{pc.toLocaleString('de-DE')} Pos.</span>
                  <Status s={l.status} dotOnly />
                </div>);
            })}
          </div>
        </div>
      </div>);
  }

  // ── LOT (hover on lot bubble)
  if (lot) {
    const secs = lot.sectionIds.map((id) => LV.sections.find((s) => s.id === id)).filter(Boolean);
    const real = secs.length > 0;
    const posCount = real ? secs.reduce((a, s) => a + s.positions.length, 0) : (lot.mock?.count || 0);
    const vol = real ? secs.reduce((a, s) => a + (s.volume || 0), 0) : (lot.mock?.volume || 0);
    const cost = real ? secs.reduce((a, s) => a + s.positions.reduce((b, p) => b + (p.menge || 0) * (p.ep || 0), 0), 0) : (lot.mock?.cost || 0);
    return (
      <div style={shell}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>LOS {lot.num}</span>
            <Status s={lot.status} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{lot.label}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>KENNZAHLEN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
              <PF l="Abschnitte" v={real ? secs.length : '—'} />
              <PF l="Positionen" v={posCount.toLocaleString('de-DE')} />
              {vol > 0 && <PF l="Volumen" v={`${vol.toLocaleString('de-DE')} m³`} />}
              <PF l="Gesamtpreis" v={`${cost.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`} />
            </div>
          </div>
          {real ?
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 6 }}>ABSCHNITTE</div>
            {secs.map((s) =>
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
              borderBottom: '1px solid var(--grid)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                <span style={{ color: 'var(--mute)', width: 22 }}>{s.code}</span>
                <span style={{ flex: 1, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                <span style={{ color: 'var(--dim)' }}>{s.positions.length}</span>
                <Status s={s.status} dotOnly />
              </div>)}
          </div> :
          <div style={{ padding: '16px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--mute)', lineHeight: 1.6 }}>
            Los noch nicht ausgearbeitet — Kennzahlen sind Schätzwerte aus der Projektplanung.
          </div>}
        </div>
      </div>);
  }

  if (!section && !position) {
    return (
      <div style={shell}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>EIGENSCHAFTEN</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>Übersicht</div>
        </div>
        <div style={{ padding: '14px 16px', flex: 1 }}>
          <div style={{ color: 'var(--mute)', fontSize: 11, lineHeight: 1.6 }}>
            Wähle eine Bubble oder Position aus, um Details anzuzeigen.
          </div>
          <div style={{ marginTop: 18 }}>
            <PF l="Projekt" v={LV.project} />
            <PF l="Version" v={LV.version} />
            <PF l="Abschnitte" v={LV.sections.length} />
            <PF l="Positionen" v={LV.sections.reduce((a, s) => a + s.positions.length, 0)} />
            <PF l="Gesamtvolumen" v={`${LV.sections.reduce((a, s) => a + (s.volume || 0), 0).toLocaleString('de-DE')} m³`} />
          </div>
        </div>
      </div>);

  }

  if (position) {
    const sec = section;
    const p = position;
    const gp = (p.menge || 0) * (p.ep || 0);
    const secTotal = sec.positions.reduce((a, x) => a + (x.menge || 0) * (x.ep || 0), 0);
    const pct = secTotal > 0 ? Math.round(gp / secTotal * 100) : 0;
    return (
      <div style={{ width, background: 'var(--white)', borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>POSITION · OZ {p.code}</span>
            <Status s={p.status} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {p.label}
          </div>
          {p.beton &&
          <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <Chip on>{p.beton}</Chip>
              {(p.expo || []).map((e) => <Chip key={e}>{e}</Chip>)}
              {p.tragend === true && <Chip>tragend</Chip>}
              {p.tragend === false && <Chip>nicht tragend</Chip>}
            </div>
          }
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* VERGABE + PREISSPIEGEL */}
          <PosVergabe p={p} />
          {/* BEARBEITER */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <AssigneePicker id={p.code} assignees={assignees} />
          </div>

          {/* AUFGABEN */}
          <TasksBlock id={p.code} tasks={tasks} assignees={assignees} ownerId={assignees.getFor(p.code)} />

          {/* NOTIZEN */}
          <NotesBlock id={p.code} notes={notes} ownerId={assignees.getFor(p.code)} />

          {/* LANGTEXT */}
          {p.langtext &&
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--grid)',
            background: 'var(--panel)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)' }}>
                  LANGTEXT
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)' }}>** = wichtig</span>
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink)',
              lineHeight: 1.55, letterSpacing: .05 }}>
                <Highlighted text={p.langtext} />
              </div>
              {p.besonderheiten?.length > 0 &&
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.besonderheiten.map((b, i) =>
              <span key={i} style={{
                fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px',
                background: 'var(--white)', border: '1px solid var(--line2)',
                color: 'var(--dim)'
              }}>{b}</span>
              )}
                </div>
            }
            </div>
          }

          {/* METADATA */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>METADATEN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
              <PF l="OZ" v={p.code} />
              <PF l="Einheit" v={p.einheit} />
              <PF l="Menge" v={p.menge?.toLocaleString('de-DE')} />
              {p.dicke && <PF l="Dicke" v={p.dicke} />}
              {p.hoehe && <PF l="Höhe" v={p.hoehe} />}
              {p.beton && <PF l="Druckfestigkeit" v={p.beton} />}
            </div>
          </div>

          {p.beton &&
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>BETONSPEZIFIKATION</div>
              <PF l="Expositionsklassen" v={(p.expo || []).join(' · ') || '—'} />
              <PF l="Normen" v="DIN EN 206-1 · DIN 1045-2" />
            </div>
          }

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>MENGEN + KOSTEN</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 0', color: 'var(--dim)' }}>
              <span>EP</span><span style={{ color: 'var(--ink)' }}>{p.ep != null ? p.ep.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 0', color: 'var(--dim)' }}>
              <span>GP</span><span style={{ color: 'var(--ink)' }}>{gp.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
            </div>
            <div style={{ marginTop: 8, height: 3, background: 'var(--grid)' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--blue),var(--cyan))' }} />
            </div>
            <div style={{ marginTop: 4, color: 'var(--mute)', fontSize: 9, letterSpacing: .4 }}>
              {pct} % DES ABSCHNITTS
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)' }}>DOKUMENTE</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)' }}>3</span>
            </div>
            {['Statik_AW_03.pdf', 'Plan_03.dwg', 'Bewehrung_AW.pdf'].map((d) =>
            <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 0', fontFamily: 'var(--mono)', fontSize: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--ink)' }}>
                  <span style={{ width: 12, height: 14, border: '1px solid var(--line2)', display: 'inline-block',
                  background: 'repeating-linear-gradient(180deg,var(--grid) 0 2px,transparent 2px 4px)' }} />
                  {d}
                </span>
                <span style={{ color: 'var(--mute)' }}>↗</span>
              </div>
            )}
          </div>

        </div>
      </div>);

  }

  // section selected
  const sec = section;
  const totalGP = sec.positions.reduce((a, p) => a + (p.menge || 0) * (p.ep || 0), 0);
  const statusCounts = sec.positions.reduce((a, p) => {a[p.status] = (a[p.status] || 0) + 1;return a;}, {});
  return (
    <div style={{ width, background: 'var(--white)', borderLeft: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>ABSCHNITT · {sec.code}</span>
          <Status s={sec.status} />
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{sec.label}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* BEARBEITER */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
          <AssigneePicker id={sec.id} assignees={assignees} label="Verantwortlich" />
        </div>

        {/* AUFGABEN */}
        <TasksBlock id={sec.id} tasks={tasks} assignees={assignees} ownerId={assignees.getFor(sec.id)} />

        {/* NOTIZEN */}
        <NotesBlock id={sec.id} notes={notes} ownerId={assignees.getFor(sec.id)} />

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 4 }}>KENNZAHLEN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <PF l="Positionen" v={sec.positions.length} />
            <PF l="Volumen" v={`${sec.volume?.toLocaleString('de-DE')} m³`} />
            <PF l="Gesamtpreis" v={`${totalGP.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`} />
            <PF l="∅ EP" v={`${(totalGP / Math.max(1, sec.positions.reduce((a, p) => a + (p.menge || 0), 0))).toFixed(2)} €`} />
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--grid)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 6 }}>STATUS</div>
          {['geprüft', 'offen', 'entwurf'].map((s) => {
            const n = statusCounts[s] || 0;
            const pct = sec.positions.length > 0 ? n / sec.positions.length * 100 : 0;
            return (
              <div key={s} style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Status s={s} dotOnly /> {s}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{n}</span>
                </div>
                <div style={{ marginTop: 3, height: 2, background: 'var(--grid)' }}>
                  <div style={{ width: `${pct}%`, height: '100%',
                    background: s === 'geprüft' ? 'var(--blue)' : s === 'offen' ? 'var(--amber)' : 'var(--mute)' }} />
                </div>
              </div>);

          })}
        </div>

        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: .6, color: 'var(--mute)', marginBottom: 6 }}>TOP POSITIONEN</div>
          {sec.positions.slice().sort((a, b) => b.menge * b.ep - a.menge * a.ep).slice(0, 4).map((p) =>
          <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0',
            fontFamily: 'var(--mono)', fontSize: 10 }}>
              <span style={{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                <span style={{ color: 'var(--mute)', marginRight: 6 }}>{p.code}</span>{p.label}
              </span>
              <span style={{ color: 'var(--dim)' }}>{((p.menge || 0) * (p.ep || 0)).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
            </div>
          )}
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Breadcrumb — Project ▾ / Lot ▾ / LV ▾   (dropdowns; mock switching)
// Stops at LV level — section/position context lives in the panels.
// ─────────────────────────────────────────────────────────────
function Crumb({ value, options, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative' }}>
      <span onClick={() => setOpen((o) => !o)} style={{
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 7px', border: '1px solid transparent',
        color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: .2,
        background: open ? 'var(--blueS)' : 'transparent',
        borderColor: open ? 'var(--blue)' : 'transparent'
      }}>
        {value}
        <span style={{ color: 'var(--mute)', fontSize: 9 }}>▾</span>
      </span>
      {open &&
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: 200,
        background: 'var(--white)', border: '1px solid var(--line2)',
        boxShadow: '0 8px 24px rgba(26,37,51,0.10)',
        fontFamily: 'var(--mono)', fontSize: 10
      }}>
          {options.map((opt) => {
          const on = opt === value;
          return (
            <div key={opt} onClick={() => {onPick(opt);setOpen(false);}} style={{
              padding: '7px 10px', cursor: 'pointer',
              background: on ? 'var(--blueS)' : 'transparent',
              color: on ? 'var(--blueD)' : 'var(--ink)'
            }}>{opt}</div>);

        })}
          <div style={{ borderTop: '1px solid var(--line)', padding: '7px 10px', color: 'var(--mute)', cursor: 'pointer' }}>
            + Neu…
          </div>
        </div>
      }
    </span>);

}

function Breadcrumb({ project, setProject, lot, setLot, version, setVersion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--dim)' }}>
      <Crumb value={project} options={LV.projects} onPick={setProject} />
      <span style={{ color: 'var(--line2)' }}>/</span>
      <Crumb value={lot} options={LV.lots} onPick={setLot} />
      <span style={{ color: 'var(--line2)' }}>/</span>
      <Crumb value={version} options={LV.versions} onPick={setVersion} />
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Bubble overview header — size-mode toggle + hint
// ─────────────────────────────────────────────────────────────
function CenterHint({ count, sizeMode, setSizeMode, demoEnabled, lotCount }) {
  return (
    <div style={{ position: 'absolute', top: 14, left: 0, right: 0, display: 'flex',
      justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.94)', border: '1px solid var(--line)',
        padding: '5px 6px 5px 14px', pointerEvents: 'auto',
        boxShadow: '0 1px 0 rgba(26,37,51,0.02)'
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: .6 }}>
          PROJEKT · {lotCount} LOSE · {count} ABSCHNITTE{demoEnabled ? ' · +DEMO' : ''} · GRÖSSE
        </span>
        <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
          {SIZE_MODES.map((m, i) => {
            const on = m.id === sizeMode;
            return (
              <span key={m.id} onClick={() => setSizeMode(m.id)} style={{
                padding: '4px 10px',
                fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                background: on ? 'var(--blueS)' : 'var(--white)',
                color: on ? 'var(--blueD)' : 'var(--dim)',
                borderLeft: i > 0 ? '1px solid var(--line)' : 'none',
                fontWeight: on ? 500 : 400, whiteSpace: 'nowrap'
              }}>{m.short}</span>);
          })}
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
function App() {
  const [view, setViewRaw] = useState('lv'); // 'lv' | 'bf' | 'tasks' | 'beton'
  const [selSection, setSelSection] = useState(null); // section id
  const [selPos, setSelPos] = useState(null); // position code
  // switching to an analytics view also clears LV selection so the tree state is unambiguous
  const setView = (v) => {
    setViewRaw(v);
    if (v !== 'lv') {setSelSection(null);setSelPos(null);}
  };
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({}); // { facetId: Set | range }
  const [sizeMode, setSizeMode] = useState(() => localStorage.getItem('bubble-sizeMode') || 'count');
  useEffect(() => localStorage.setItem('bubble-sizeMode', sizeMode), [sizeMode]);
  const [demoEnabled, setDemoEnabled] = useState(() => localStorage.getItem('bubble-demo') === '1');
  useEffect(() => localStorage.setItem('bubble-demo', demoEnabled ? '1' : '0'), [demoEnabled]);
  const [hideMode, setHideMode] = useState(() => localStorage.getItem('bubble-hideMode') || 'dim');
  useEffect(() => localStorage.setItem('bubble-hideMode', hideMode), [hideMode]);

  const assignees = useAssignees();
  const tasks = useTasks();
  const notes = useNotes();

  // jump from analytics row → LV view focused on that pos
  const jumpToPos = (sectionCode, posCode) => {
    const sec = LV.sections.find((s) => s.code === sectionCode);
    if (!sec) return;
    setView('lv');
    setSelSection(sec.id);
    setSelPos(posCode);
  };

  // Breadcrumb (project / lot / version) — interactive mock state
  const [project, setProject] = useState(LV.project);
  const [lot, setLot] = useState(LV.lot);
  const [version, setVersion] = useState(LV.version);

  // Tree collapse state — persisted
  const [treeCollapsed, setTreeCollapsed] = useState(
    () => localStorage.getItem('bubble-treeCollapsed') === '1'
  );
  useEffect(() => localStorage.setItem('bubble-treeCollapsed', treeCollapsed ? '1' : '0'),
  [treeCollapsed]);

  const setFilter = (id, value) => setFilters((f) => {
    const next = { ...f };
    if (value == null || value instanceof Set && value.size === 0) {
      delete next[id];
    } else {
      next[id] = value;
    }
    return next;
  });
  const resetFilters = () => setFilters({});

  const allPositions = useMemo(() => LV.sections.flatMap((s) => s.positions), []);

  const sectionObj = useMemo(() => LV.sections.find((s) => s.id === selSection) || null, [selSection]);
  const positionObj = useMemo(() => {
    if (!sectionObj || !selPos) return null;
    return sectionObj.positions.find((p) => p.code === selPos) || null;
  }, [sectionObj, selPos]);

  // Hover preview for the right panel — show info on hover, snap back on leave.
  // Small trailing delay on clearing avoids flicker while sweeping the canvas.
  const [panelHover, setPanelHover] = useState(null);
  useEffect(() => {
    if (hovered) { setPanelHover(hovered); return; }
    const t = setTimeout(() => setPanelHover(null), 140);
    return () => clearTimeout(t);
  }, [hovered]);
  const hoverTarget = useMemo(() => {
    const id = panelHover;
    if (!id || id.startsWith('cluster:') || id.startsWith('doc:')) return null;
    if (id === 'project') return { project: true };
    const lot = LOTS.find((l) => l.id === id);
    if (lot) return { lot };
    if (id.startsWith('pos:')) {
      const code = id.slice(4);
      for (const s of LV.sections) {
        const p = s.positions.find((x) => x.code === code);
        if (p) return { section: s, position: p };
      }
      return null;
    }
    const sec = LV.sections.find((s) => s.id === id);
    if (sec) return { section: sec };
    return null;
  }, [panelHover]);

  // Hover only drives the right panel while the bubble graph is visible.
  // In the drilled-in table view the graph is unmounted, so a stale `hovered`
  // must not override the row the user just clicked.
  const tableHover = sectionObj ? null : hoverTarget;

  // ESC to go back one level
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (selPos) setSelPos(null);else
        if (selSection) setSelSection(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selPos, selSection]);

  // Resizable panel widths — persisted in localStorage
  const [leftW, setLeftW] = useState(() => +localStorage.getItem('bubble-leftW') || 236);
  const [rightW, setRightW] = useState(() => +localStorage.getItem('bubble-rightW') || 320);
  useEffect(() => localStorage.setItem('bubble-leftW', leftW), [leftW]);
  useEffect(() => localStorage.setItem('bubble-rightW', rightW), [rightW]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <TopBar
        breadcrumb={<Breadcrumb project={project} setProject={setProject}
        lot={lot} setLot={setLot} version={version} setVersion={setVersion} />}
        search={search} setSearch={setSearch}
        filters={filters} setFilter={setFilter} onReset={resetFilters}
        allPositions={allPositions}
        analyticsMode={view !== 'lv'} />

      {view === 'lv' &&
      <FilterStrip filters={filters} setFilter={setFilter}
        hideMode={hideMode} setHideMode={setHideMode} onReset={resetFilters} />
      }
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Tree
          width={leftW}
          collapsed={treeCollapsed} setCollapsed={setTreeCollapsed}
          selSection={selSection} selPos={selPos}
          view={view} setView={setView}
          notes={notes} tasks={tasks}
          onSection={(id) => {setView('lv');setSelSection(id);setSelPos(null);}}
          onPos={(sid, code) => {setView('lv');setSelSection(sid);setSelPos(code);}}
          onRoot={() => {setView('lv');setSelSection(null);setSelPos(null);}}
          filters={filters} globalSearch={search} hideMode={hideMode} />
        
        {!treeCollapsed &&
        <ResizeHandle value={leftW} setValue={setLeftW} min={180} max={460} />
        }
        <div style={{ flex: 1, position: 'relative', background: 'var(--paper)', minWidth: 0, overflow: 'hidden' }}>
          {view === 'bf' &&
          <BieterfragenView notes={notes} onPick={jumpToPos} />
          }
          {view === 'tasks' &&
          <TasksView tasks={tasks} assignees={assignees} onPick={jumpToPos} />
          }
          {view === 'beton' &&
          <BetonView onPick={jumpToPos} />
          }
          {view === 'vp' &&
          <VergabepaketeView onPick={jumpToPos} />
          }
          {view === 'nu' &&
          <NachunternehmerView onPick={jumpToPos} />
          }
          {view === 'lv' && (sectionObj ?
          <PositionsTable
            section={sectionObj}
            selPos={selPos}
            onPick={(code) => setSelPos(code === selPos ? null : code)}
            onBack={() => {setSelSection(null);setSelPos(null);}}
            filters={filters}
            search={search}
            assignees={assignees} /> :


          <>
              <Bubbles
              sections={LV.sections}
              hovered={hovered} setHovered={setHovered}
              onPick={(sid, code) => {setSelSection(sid);setSelPos(code || null);}}
              tasks={tasks}
              notes={notes}
              sizeMode={sizeMode}
              filters={filters} search={search}
              demoEnabled={demoEnabled} setDemoEnabled={setDemoEnabled} hideMode={hideMode} />
              <CenterHint count={LV.sections.length}
            sizeMode={sizeMode} setSizeMode={setSizeMode}
            demoEnabled={demoEnabled} lotCount={LOTS.length} />
            </>)
          }
        </div>
        {view === 'lv' &&
        <>
            <ResizeHandle value={rightW} setValue={setRightW} min={260} max={560} sign={-1} />
            <PropsPanel width={rightW}
          section={tableHover ? tableHover.section || null : sectionObj}
          position={tableHover ? tableHover.position || null : positionObj}
          lot={tableHover ? tableHover.lot || null : null}
          project={tableHover ? !!tableHover.project : false}
          assignees={assignees} tasks={tasks} notes={notes} />
          </>
        }
      </div>
    </div>);

}

Object.assign(window, { Chip, Member, Status, Highlighted, matchPos });

ReactDOM.createRoot(document.getElementById('root')).render(<App />);