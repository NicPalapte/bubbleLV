// lv-graph.jsx — Scalable knowledge-graph engine for Bubble LV-Viewer
//
// Renders a hierarchical bubble graph that scales to ~10k positions across
// up to 6 depth tiers by combining:
//   - Recursive tree model (any depth, any kind)
//   - Procedural radial-tidy-tree layout with adaptive ring radii
//   - Density-aware rendering at each tier (bubble / dot / cluster)
//   - LOD: labels hide as zoom drops
//   - Viewport culling (cheap bbox test)
//   - Hover spotlight: doc edges drawn only on hover
//
// Exposes <Bubbles/>, <AllPositionsTable/> + constants on `window` so
// lv-main.jsx can use them. (Babel inline scripts share scope only via window.)

const { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SIZE_MODES = [
  { id: 'count', label: 'Anz. Positionen', short: 'POS',
    get: (s) => s.positions.length, fmt: (v) => `${v.toLocaleString('de-DE')} Pos.`,
    aggregate: true },
  { id: 'cost', label: 'Gesamtpreis €', short: 'GP €',
    get: (s) => s.positions.reduce((a, p) => a + (p.menge || 0) * (p.ep || 0), 0),
    fmt: (v) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`,
    aggregate: true },
  { id: 'uniform', label: 'Einheitlich', short: 'Einheitl.',
    get: () => 1, fmt: () => '',
    aggregate: false, uniform: true },
];

const LOTS = [
  { id: 'l1', num: '1', label: 'Rohbau',       status: 'offen',
    sectionIds: ['01','02','03','04','05','06','07'] },
  { id: 'l2', num: '2', label: 'Ausbau',       status: 'entwurf', sectionIds: [],
    mock: { count: 142, volume: 0, cost: 1840000 } },
  { id: 'l3', num: '3', label: 'TGA',          status: 'entwurf', sectionIds: [],
    mock: { count:  89, volume: 0, cost: 1250000 } },
  { id: 'l4', num: '4', label: 'Außenanlagen', status: 'entwurf', sectionIds: [],
    mock: { count:  34, volume: 380, cost: 420000 } },
];

// Knowledge-graph doc → many positions
const DOCS = [
  { id: 'doc-statik-aw',    name: 'Statik_AW_03.pdf',  ext: 'pdf',
    positionCodes: ['03.010', '03.020', '03.030', '02.010'] },
  { id: 'doc-plan-03',      name: 'Plan_03.dwg',       ext: 'dwg',
    positionCodes: ['03.010', '03.020', '03.030', '04.010'] },
  { id: 'doc-bewehrung-aw', name: 'Bewehrung_AW.pdf',  ext: 'pdf',
    positionCodes: ['03.010', '03.030', '02.010'] },
];

// Density thresholds (per parent)
const CLUSTER_AT = 24;   // > this many siblings → single cluster bubble
const DOT_AT     = 8;    // > this many siblings (and ≤ CLUSTER_AT) → dot rendering

// Per-kind base radii in world units
const RADII = {
  project:    70,
  lot:        50,
  section:    32,
  subsection: 22,
  group:      16,
  position:   17,
  cluster:    30,
  doc:        14,
};

// Smallest zoom k at which a kind shows its label
const LABEL_K = {
  project: 0.18, lot: 0.28, section: 0.45,
  subsection: 0.7, group: 0.95, position: 0.85,
  doc: 0.6, cluster: 0.35,
};

// Health palette — grey (draft) / green (checked, nothing open) / orange (open points)
const HEALTH_COLORS = {
  green:  { fill: 'var(--greenS)', stroke: 'var(--greenD)' },
  orange: { fill: '#fff4dc',       stroke: 'var(--amber)'  },
  grey:   { fill: '#f1f4f8',       stroke: 'var(--mute)'   },
};

// Unique Vergabepaket ids under a node (section → its positions; lot → its sections)
function nodeVpIds(n) {
  const ids = new Set();
  const add = (code) => (window.positionPakete ? window.positionPakete(code) : []).forEach((v) => ids.add(v.id));
  if (n.kind === 'section' && n.data) n.data.positions.forEach((p) => add(p.code));
  else if (n.kind === 'lot') (n.children || []).forEach((c) => { if (c.data) c.data.positions.forEach((p) => add(p.code)); });
  return ids;
}

// ─────────────────────────────────────────────────────────────
// Demo data — proves scale (5 levels, ~3000 positions)
// ─────────────────────────────────────────────────────────────

function genDemoLot() {
  // 1 lot × 5 sections × 5 subsections × 5 groups × 25 positions = 3125 positions
  const lot = { id: 'l-demo', kind: 'lot', num: '5', label: 'Demo · Großprojekt',
    status: 'entwurf', children: [], demo: true };
  for (let s = 1; s <= 5; s++) {
    const sec = { id: `dx-s${s}`, kind: 'section', code: `${10 + s}`,
      label: `Demo-Abschnitt ${s}`, status: 'entwurf', children: [], demo: true };
    for (let ss = 1; ss <= 5; ss++) {
      const sub = { id: `dx-s${s}-${ss}`, kind: 'subsection',
        code: `${10 + s}.${ss}`, label: `Unter ${ss}`,
        status: 'entwurf', children: [], demo: true };
      for (let g = 1; g <= 5; g++) {
        const grp = { id: `dx-s${s}-${ss}-${g}`, kind: 'group',
          code: `${10 + s}.${ss}.${g}`, label: `Gr ${g}`,
          status: 'entwurf', children: [], demo: true };
        for (let p = 1; p <= 25; p++) {
          grp.children.push({
            id: `dx-p-${s}-${ss}-${g}-${p}`, kind: 'position',
            code: `${10 + s}.${ss}.${g}.${String(p).padStart(2, '0')}`,
            label: `Position ${p}`, status: 'entwurf', children: [], demo: true,
            menge: 1, ep: 100,
          });
        }
        sub.children.push(grp);
      }
      sec.children.push(sub);
    }
    lot.children.push(sec);
  }
  return lot;
}

// ─────────────────────────────────────────────────────────────
// Tree building
// ─────────────────────────────────────────────────────────────

function buildTree(sections, includeDemo) {
  const root = {
    id: 'project', kind: 'project',
    label: typeof LV !== 'undefined' ? LV.project : 'Projekt',
    children: [],
  };
  LOTS.forEach((lot) => {
    const lotNode = {
      id: lot.id, kind: 'lot', num: lot.num, label: lot.label,
      status: lot.status, children: [],
      empty: lot.sectionIds.length === 0, mock: lot.mock,
    };
    lot.sectionIds.forEach((sid) => {
      const sec = sections.find((s) => s.id === sid);
      if (!sec) return;
      const secNode = {
        id: sec.id, kind: 'section', code: sec.code, label: sec.label,
        status: sec.status, volume: sec.volume, children: [], data: sec,
      };
      sec.positions.forEach((p) => {
        secNode.children.push({
          id: `pos:${p.code}`, kind: 'position',
          code: p.code, label: p.label, status: p.status,
          menge: p.menge, ep: p.ep, einheit: p.einheit,
          children: [], data: p, sectionId: sec.id,
        });
      });
      lotNode.children.push(secNode);
    });
    root.children.push(lotNode);
  });
  if (includeDemo) root.children.push(genDemoLot());
  return root;
}

function walk(root, fn) {
  const parents = new Map();
  function rec(n, parent, depth) {
    parents.set(n.id, parent);
    fn(n, parent, depth);
    (n.children || []).forEach((c) => rec(c, n, depth + 1));
  }
  rec(root, null, 0);
  return parents;
}

// ─────────────────────────────────────────────────────────────
// Density classification per parent
// ─────────────────────────────────────────────────────────────

function classifyChildren(kids) {
  if (!kids || kids.length === 0) return 'normal';
  if (kids.length > CLUSTER_AT) return 'cluster';
  if (kids.length > DOT_AT) return 'dots';
  return 'normal';
}

// ─────────────────────────────────────────────────────────────
// Radial layout — adaptive ring radii per depth
// ─────────────────────────────────────────────────────────────

function layoutRadial(root, collapsed) {
  const positions = new Map();
  const ringNeeds = {};

  // ── Pass 1: find max angular density at each depth so rings can grow
  function plan(node, depth, wedgeStart, wedgeEnd) {
    if (collapsed[node.id]) return;
    const kids = node.children || [];
    if (kids.length === 0) return;
    const cls = classifyChildren(kids);
    if (cls === 'cluster') return; // cluster sits alone on next ring
    const parentWedge = wedgeEnd - wedgeStart;
    const per = parentWedge / kids.length;
    const sizePer = cls === 'dots' ? 7 : (RADII[kids[0].kind] || 14);
    const gap = cls === 'dots' ? 4 : 12;
    const needed = (2 * sizePer + gap) / per;
    ringNeeds[depth + 1] = Math.max(ringNeeds[depth + 1] || 0, needed);
    kids.forEach((c, i) => {
      plan(c, depth + 1, wedgeStart + i * per, wedgeStart + (i + 1) * per);
    });
  }
  plan(root, 0, 0, Math.PI * 2);

  // Ring radii: max of (kind-based default, step-from-previous, density need)
  const MIN_RING = [0, 220, 420, 580, 740, 880, 1020, 1160];
  const rings = [0];
  for (let d = 1; d <= 7; d++) {
    const min = MIN_RING[d] || (rings[d - 1] + 140);
    const stepPad = rings[d - 1] + 120;
    const need = ringNeeds[d] || 0;
    rings[d] = Math.max(min, stepPad, need);
  }

  // ── Pass 2: place nodes
  function place(node, depth, wedgeStart, wedgeEnd) {
    const angle = (wedgeStart + wedgeEnd) / 2;
    const r = rings[depth] || 0;
    positions.set(node.id, {
      id: node.id, kind: node.kind, node,
      cx: Math.cos(angle) * r, cy: Math.sin(angle) * r,
      angle, wedgeStart, wedgeEnd, depth,
    });
    if (collapsed[node.id]) return;
    const kids = node.children || [];
    if (kids.length === 0) return;
    const cls = classifyChildren(kids);
    if (cls === 'cluster') {
      const cr = rings[depth + 1] || (r + 140);
      positions.set(`cluster:${node.id}`, {
        id: `cluster:${node.id}`, kind: 'cluster',
        cx: Math.cos(angle) * cr, cy: Math.sin(angle) * cr,
        angle, depth: depth + 1, ofId: node.id, count: kids.length,
        sampleKind: kids[0]?.kind,
      });
      return;
    }
    const per = (wedgeEnd - wedgeStart) / kids.length;
    kids.forEach((c, i) => {
      place(c, depth + 1, wedgeStart + i * per, wedgeStart + (i + 1) * per);
      const p = positions.get(c.id);
      if (p && cls === 'dots') p.dotted = true;
    });
  }
  place(root, 0, 0, Math.PI * 2);

  return { positions, rings };
}

// Doc placement: centroid of visible linked positions, just outside the
// deepest currently-rendered ring (adapts as user expands branches).
function placeDocs(positions, rings) {
  // Find the deepest ring actually used by any node
  let maxDepth = 0;
  for (const [, info] of positions) {
    if (info.depth > maxDepth) maxDepth = info.depth;
  }
  const baseR = rings[Math.min(maxDepth, rings.length - 1)] || 400;
  const outR = baseR + 70;
  const out = [];
  DOCS.forEach((doc, di) => {
    const linkedIds = [];
    for (const [id, info] of positions) {
      if (info.kind !== 'position') continue;
      if (doc.positionCodes.includes(info.node.code)) linkedIds.push(id);
    }
    if (linkedIds.length === 0) return;
    let sx = 0, sy = 0;
    linkedIds.forEach((id) => {
      const p = positions.get(id);
      sx += p.cx; sy += p.cy;
    });
    const ang = Math.atan2(sy / linkedIds.length, sx / linkedIds.length)
      + (di - (DOCS.length - 1) / 2) * 0.045;
    out.push({
      id: `doc:${doc.id}`, kind: 'doc', node: doc,
      cx: Math.cos(ang) * outR, cy: Math.sin(ang) * outR,
      angle: ang, linkedIds, count: linkedIds.length,
    });
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// Component: Bubbles
// ─────────────────────────────────────────────────────────────

function Bubbles(props) {
  const {
    sections,
    hovered, setHovered,
    onPick,           // (sectionId, positionCode?) → drill to table
    tasks,
    notes,
    demoEnabled, setDemoEnabled,
    sizeMode = 'count',
    filters = {},
    search = '',
    hideMode = 'dim',
  } = props;

  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Synchronous initial measurement — ResizeObserver alone proved unreliable
  // inside sandboxed iframes; fall back to getBoundingClientRect on layout.
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const r = wrapRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    // Belt-and-suspenders: also remeasure shortly after mount in case the
    // parent's layout finishes after our initial paint.
    const t = setTimeout(measure, 60);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  const { w, h } = size;

  // ── Tree (memoized)
  const { tree, parents } = useMemo(() => {
    const t = buildTree(sections, !!demoEnabled);
    const p = walk(t, () => {});
    return { tree: t, parents: p };
  }, [sections, demoEnabled]);

  // ── Collapse state (depth ≥ 2 default-collapsed)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bubble-collapsed-v2') || 'null');
      if (saved && typeof saved === 'object') return saved;
    } catch {}
    return {};
  });
  // After tree rebuilds (e.g. demo on), seed collapse for any new node with children at depth ≥ 2
  useEffect(() => {
    setCollapsed((c) => {
      const next = { ...c };
      let changed = false;
      walk(tree, (n, parent, depth) => {
        if (depth >= 2 && (n.children || []).length > 0 && !(n.id in next)) {
          next[n.id] = true; changed = true;
        }
      });
      return changed ? next : c;
    });
  }, [tree]);
  useEffect(() => {
    try { localStorage.setItem('bubble-collapsed-v2', JSON.stringify(collapsed)); } catch {}
  }, [collapsed]);
  const toggleCollapse = useCallback((id) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }, []);

  // ── Pan/zoom view (world origin at canvas center; default zoomed out a bit)
  const [view, setView] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bubble-view-v2') || 'null');
      if (saved && Number.isFinite(saved.tx) && Number.isFinite(saved.k)) return saved;
    } catch {}
    return { tx: 0, ty: 0, k: 0.7 };
  });
  // Once we know real canvas size, recenter the view if the saved/default
  // origin lands outside the visible region (covers the "saved view from a
  // bigger canvas" case as well as the initial 0,0).
  const initRef = useRef(false);
  useEffect(() => {
    if (!w || !h || initRef.current) return;
    initRef.current = true;
    setView((v) => {
      const outside = v.tx < 0 || v.tx > w || v.ty < 0 || v.ty > h;
      return outside ? { ...v, tx: w / 2, ty: h / 2 } : v;
    });
  }, [w, h]);
  useEffect(() => { try { localStorage.setItem('bubble-view-v2', JSON.stringify(view)); } catch {} }, [view]);

  // ── Drag-to-pan
  const drag = useRef({ on: false, x0: 0, y0: 0, tx0: 0, ty0: 0, moved: false });
  const justDragged = useRef(false);
  const [panning, setPanning] = useState(false);
  useEffect(() => {
    const move = (e) => {
      if (!drag.current.on) return;
      const dx = e.clientX - drag.current.x0;
      const dy = e.clientY - drag.current.y0;
      if (!drag.current.moved && Math.hypot(dx, dy) > 3) { drag.current.moved = true; setPanning(true); }
      if (drag.current.moved) setView((v) => ({ ...v, tx: drag.current.tx0 + dx, ty: drag.current.ty0 + dy }));
    };
    const up = () => {
      if (drag.current.on && drag.current.moved) justDragged.current = true;
      drag.current.on = false;
      setPanning(false);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);
  useEffect(() => {
    if (!panning) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => { document.body.style.cursor = prev; };
  }, [panning]);
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { on: true, x0: e.clientX, y0: e.clientY, tx0: view.tx, ty0: view.ty, moved: false };
  };
  const onClickCapture = (e) => {
    if (justDragged.current) { e.stopPropagation(); justDragged.current = false; }
  };

  // ── Wheel zoom centered on cursor
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setView((v) => {
        const newK = Math.max(0.12, Math.min(4, v.k * factor));
        const realF = newK / v.k;
        return { tx: mx - (mx - v.tx) * realF, ty: my - (my - v.ty) * realF, k: newK };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Layout
  const { positions, rings, docNodes } = useMemo(() => {
    const { positions, rings } = layoutRadial(tree, collapsed);
    const docNodes = placeDocs(positions, rings);
    return { positions, rings, docNodes };
  }, [tree, collapsed]);

  // ── Per-node metric info (radius + sub-label + filter-aware match counts).
  //    Walks the tree directly (not the positions map) so values stay accurate
  //    when branches are collapsed.
  const metricInfo = useMemo(() => {
    const map = new Map();
    const mode = SIZE_MODES.find((m) => m.id === sizeMode) || SIZE_MODES[0];
    const matchFn = window.matchPos;
    const hasFilter = matchFn && (
      Object.values(filters).some((v) => (v instanceof Set && v.size > 0) || Array.isArray(v)) ||
      !!(search && search.trim())
    );

    function compute(node) {
      if (node.kind === 'section') {
        const data = node.data;
        let v = 0;
        if (data && !mode.uniform) { try { v = mode.get(data) || 0; } catch {} }
        const total = data ? data.positions.length : (node.children || []).length;
        let match = total;
        if (data && hasFilter) {
          match = 0;
          data.positions.forEach((p) => { if (matchFn(p, filters, search)) match++; });
        }
        return { v, match, total };
      }
      if (node.kind === 'lot' || node.kind === 'project') {
        let v = 0, match = 0, total = 0;
        (node.children || []).forEach((c) => {
          const r = compute(c);
          v += r.v; match += r.match; total += r.total;
        });
        const mock = node.mock;
        if (mock && !mode.uniform) v += (mock[mode.id] || 0);
        if (mock && !hasFilter) { match += (mock.count || 0); total += (mock.count || 0); }
        return { v, match, total };
      }
      return { v: 0, match: 0, total: 0 };
    }

    // Walk tree to compute every project/lot/section value
    const computed = new Map();
    function visit(n) {
      if (n.kind === 'project' || n.kind === 'lot' || n.kind === 'section') {
        computed.set(n.id, compute(n));
      }
      (n.children || []).forEach(visit);
    }
    visit(tree);

    // Tier-specific radii (sqrt-area scaling); uniform mode → kind defaults
    const secVals = [], lotVals = [];
    for (const [id, r] of computed) {
      const info = positions.get(id);
      if (!info) continue;
      if (info.kind === 'section') secVals.push(r.v);
      else if (info.kind === 'lot') lotVals.push(r.v);
    }
    const secMaxV = Math.max(1, ...secVals);
    const lotMaxV = Math.max(1, ...lotVals);

    const formatSub = (raw, match, total) => {
      const baseStr = mode.uniform ? '' : mode.fmt(raw);
      if (hasFilter && match !== total) {
        return baseStr
          ? `${match.toLocaleString('de-DE')}/${total.toLocaleString('de-DE')} · ${baseStr}`
          : `${match.toLocaleString('de-DE')}/${total.toLocaleString('de-DE')}`;
      }
      return baseStr;
    };

    for (const [id, r] of computed) {
      const info = positions.get(id);
      if (!info) continue;
      let radius;
      if (info.kind === 'section') {
        radius = mode.uniform ? RADII.section
          : (22 + Math.sqrt(Math.max(0, r.v) / secMaxV) * (60 - 22));
      } else if (info.kind === 'lot') {
        radius = mode.uniform ? RADII.lot
          : (32 + Math.sqrt(Math.max(0, r.v) / lotMaxV) * (72 - 32));
      } else if (info.kind === 'project') {
        radius = RADII.project; // project radius fixed; just attach sub-label
      } else continue;
      map.set(id, {
        r: radius,
        sub: formatSub(r.v, r.match, r.total),
        matchCount: r.match,
        totalCount: r.total,
        faded: hasFilter && r.match === 0,
      });
    }
    return map;
  }, [tree, positions, sizeMode, filters, search]);

  // Whether a given position node passes the active filters/search
  const positionMatches = useCallback((info) => {
    if (info.kind !== 'position' || !info.node.data) return true;
    const matchFn = window.matchPos;
    if (!matchFn) return true;
    return matchFn(info.node.data, filters, search);
  }, [filters, search]);

  // ── Health map: grey (draft) / green (checked + nothing open) / orange (open points).
  //    "Open points" = open tasks + notes not marked erledigt, on the node and its positions.
  const healthMap = useMemo(() => {
    const map = new Map();
    const openFor = (id) => {
      let n = 0;
      if (tasks) n += tasks.getFor(id).filter((t) => !t.done).length;
      if (notes) n += notes.getFor(id).filter((x) => x.status !== 'erledigt').length;
      return n;
    };
    const rate = (status, open) =>
      status === 'entwurf' ? 'grey' :
      (status === 'geprüft' && open === 0) ? 'green' : 'orange';
    sections.forEach((sec) => {
      let open = openFor(sec.id);
      sec.positions.forEach((p) => {
        open += openFor(p.code);
        map.set(`pos:${p.code}`, rate(p.status, openFor(p.code)));
      });
      map.set(sec.id, rate(sec.status, open));
    });
    const agg = (healths) =>
      healths.some((h) => h === 'orange') ? 'orange' :
      healths.some((h) => h === 'green') ? 'green' : 'grey';
    LOTS.forEach((lot) => {
      if (!lot.sectionIds.length) { map.set(lot.id, 'grey'); return; }
      map.set(lot.id, agg(lot.sectionIds.map((id) => map.get(id)).filter(Boolean)));
    });
    map.set('project', agg(LOTS.map((l) => map.get(l.id)).filter(Boolean)));
    return map;
  }, [sections, tasks, notes]);

  const vpFilter = (filters.paket instanceof Set && filters.paket.size) ? filters.paket : null;

  // ── Collapse-all (everything below the project)
  const collapseAll = useCallback(() => {
    const next = {};
    walk(tree, (n, parent, depth) => {
      if (depth >= 1 && (n.children || []).length > 0) next[n.id] = true;
    });
    setCollapsed(next);
  }, [tree]);

  // ── Viewport culling
  const cull = useMemo(() => {
    const margin = 80;
    return {
      wx0: (-margin - view.tx) / view.k,
      wx1: (w + margin - view.tx) / view.k,
      wy0: (-margin - view.ty) / view.k,
      wy1: (h + margin - view.ty) / view.k,
    };
  }, [view, w, h]);
  const inView = (cx, cy, r) =>
    cx + r >= cull.wx0 && cx - r <= cull.wx1 && cy + r >= cull.wy0 && cy - r <= cull.wy1;

  // ── Hover spotlight
  const spotlight = useMemo(() => {
    if (!hovered) return null;
    const conn = new Set();
    const info = positions.get(hovered);
    const docNode = docNodes.find((d) => d.id === hovered);
    if (info && info.node) {
      let cur = info.node;
      while (cur) { conn.add(cur.id); cur = parents.get(cur.id); }
      function descend(n) {
        conn.add(n.id);
        if (collapsed[n.id]) return;
        (n.children || []).forEach(descend);
      }
      descend(info.node);
      docNodes.forEach((d) => { if (d.linkedIds.some((id) => conn.has(id))) conn.add(d.id); });
    } else if (docNode) {
      conn.add(docNode.id);
      docNode.linkedIds.forEach((id) => {
        let cur = positions.get(id)?.node;
        while (cur) { conn.add(cur.id); cur = parents.get(cur.id); }
      });
    } else if (info && info.kind === 'cluster') {
      conn.add(info.id);
      const ofInfo = positions.get(info.ofId);
      let cur = ofInfo?.node;
      while (cur) { conn.add(cur.id); cur = parents.get(cur.id); }
    }
    return conn;
  }, [hovered, positions, docNodes, parents, collapsed]);
  const isDim = (id) => spotlight && !spotlight.has(id);

  // ── Render lists (culled)
  const renderableNodes = useMemo(() => {
    const out = [];
    for (const [, info] of positions) {
      if (!inView(info.cx, info.cy, (RADII[info.kind] || 14) + 24)) continue;
      out.push(info);
    }
    return out;
  }, [positions, cull]);
  const renderableDocs = useMemo(
    () => docNodes.filter((d) => inView(d.cx, d.cy, RADII.doc + 24)),
    [docNodes, cull]);

  // ── Tree edges (culled)
  const treeLinks = useMemo(() => {
    const out = [];
    for (const [id, info] of positions) {
      if (info.kind === 'cluster') {
        const pp = positions.get(info.ofId);
        if (!pp) continue;
        const midx = (info.cx + pp.cx) / 2, midy = (info.cy + pp.cy) / 2;
        const half = Math.hypot(info.cx - pp.cx, info.cy - pp.cy) / 2;
        if (!inView(midx, midy, half + 40)) continue;
        out.push({ a: pp, b: info });
        continue;
      }
      const parent = parents.get(id);
      if (!parent) continue;
      const pp = positions.get(parent.id);
      if (!pp) continue;
      const midx = (info.cx + pp.cx) / 2, midy = (info.cy + pp.cy) / 2;
      const half = Math.hypot(info.cx - pp.cx, info.cy - pp.cy) / 2;
      if (!inView(midx, midy, half + 40)) continue;
      out.push({ a: pp, b: info });
    }
    return out;
  }, [positions, parents, cull]);

  // ── Doc edges drawn only on hover (tight: position→its docs, doc→all its positions)
  const docEdges = useMemo(() => {
    if (!hovered) return [];
    const edges = [];
    const hoveredDoc = docNodes.find((d) => d.id === hovered);
    if (hoveredDoc) {
      hoveredDoc.linkedIds.forEach((pid) => {
        const p = positions.get(pid);
        if (p) edges.push({ a: hoveredDoc, b: p });
      });
      return edges;
    }
    const info = positions.get(hovered);
    if (!info) return edges;
    if (info.kind === 'position') {
      // Just this position's outgoing doc edges
      docNodes.forEach((d) => {
        if (d.linkedIds.includes(hovered)) edges.push({ a: d, b: info });
      });
    } else if (spotlight) {
      // Higher-tier hover: edges from connected docs to in-spotlight positions
      docNodes.forEach((d) => {
        if (!spotlight.has(d.id)) return;
        d.linkedIds.forEach((pid) => {
          if (!spotlight.has(pid)) return;
          const p = positions.get(pid);
          if (p) edges.push({ a: d, b: p });
        });
      });
    }
    return edges;
  }, [hovered, spotlight, docNodes, positions]);

  // ── Zoom/fit
  const fit = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, info] of positions) {
      const r = (RADII[info.kind] || 14) + 24;
      minX = Math.min(minX, info.cx - r); maxX = Math.max(maxX, info.cx + r);
      minY = Math.min(minY, info.cy - r); maxY = Math.max(maxY, info.cy + r);
    }
    docNodes.forEach((d) => {
      const r = RADII.doc + 24;
      minX = Math.min(minX, d.cx - r); maxX = Math.max(maxX, d.cx + r);
      minY = Math.min(minY, d.cy - r); maxY = Math.max(maxY, d.cy + r);
    });
    if (!isFinite(minX)) return;
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const pad = 50;
    const k = Math.max(0.12, Math.min(4, Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setView({ tx: w / 2 - cx * k, ty: h / 2 - cy * k, k });
  };
  const reset = () => setView({ tx: w / 2, ty: h / 2, k: 0.7 });
  const zoomBy = (factor) => setView((v) => {
    const newK = Math.max(0.12, Math.min(4, v.k * factor));
    const realF = newK / v.k;
    const cx = w / 2, cy = h / 2;
    return { tx: cx - (cx - v.tx) * realF, ty: cy - (cy - v.ty) * realF, k: newK };
  });

  // ── Clicks
  const onBubbleClick = (info) => {
    const n = info.node;
    if (!n) return;
    if (n.kind === 'section') {
      // Demo sections have no real positions wired; fall through to collapse-toggle.
      if (n.demo) { toggleCollapse(info.id); return; }
      onPick && onPick(n.id);
    } else if (n.kind === 'position') {
      if (n.demo) return;
      onPick && onPick(n.sectionId, n.code);
    } else {
      toggleCollapse(info.id);
    }
  };
  const onClusterClick = (info) => {
    const parentInfo = positions.get(info.ofId);
    if (!parentInfo) return;
    let cur = parentInfo.node;
    while (cur) {
      if (cur.kind === 'section' && !cur.demo) { onPick && onPick(cur.id); return; }
      cur = parents.get(cur.id);
    }
    toggleCollapse(info.ofId);
  };

  return (
    <div ref={wrapRef}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        cursor: panning ? 'grabbing' : 'grab', userSelect: 'none',
      }}>
      <svg width={w} height={h} style={{ display: 'block', position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dot" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--grid2)" />
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#dot)" />

        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {/* Tree edges */}
          {treeLinks.map((lk, i) => {
            const dim = isDim(lk.a.id) && isDim(lk.b.id);
            return (
              <line key={`tl${i}`}
                x1={lk.a.cx} y1={lk.a.cy} x2={lk.b.cx} y2={lk.b.cy}
                stroke="var(--line2)"
                strokeWidth={1 / Math.max(0.4, view.k)}
                opacity={dim ? 0.08 : 0.45} />);
          })}

          {/* Doc edges (hover only) */}
          {docEdges.map((e, i) => (
            <line key={`de${i}`}
              x1={e.a.cx} y1={e.a.cy} x2={e.b.cx} y2={e.b.cy}
              stroke="var(--blue)" strokeWidth={1.6 / Math.max(0.4, view.k)}
              strokeDasharray={`${5 / view.k} ${3 / view.k}`}
              opacity="0.6" />
          ))}

          {/* Nodes */}
          {renderableNodes.map((info) => {
            const dim = isDim(info.id);
            if (info.kind === 'cluster') {
              return <ClusterNode key={info.id} info={info} k={view.k} dim={dim}
                hovered={hovered === info.id} setHovered={setHovered}
                onClick={() => onClusterClick(info)} />;
            }
            const n = info.node;
            if (info.dotted) {
              return <DotNode key={info.id} info={info} k={view.k} dim={dim}
                hovered={hovered === info.id} setHovered={setHovered}
                onClick={() => onBubbleClick(info)} />;
            }
            const collapsible = (n.children || []).length > 0;
            const openTasks = (info.kind === 'section' && tasks && !n.demo)
              ? tasks.getFor(n.id).filter((t) => !t.done).length : 0;
            const mi = metricInfo.get(info.id);
            const posFiltered = info.kind === 'position' && !positionMatches(info);
            const fadedAny = dim || (mi && mi.faded) || posFiltered;
            return (
              <BubbleNode key={info.id} info={info} k={view.k} dim={fadedAny}
                hovered={hovered === info.id} setHovered={setHovered}
                onClick={() => onBubbleClick(info)}
                collapsible={collapsible}
                isCollapsed={!!collapsed[info.id]}
                childCount={(n.children || []).length}
                onToggleCollapse={() => toggleCollapse(info.id)}
                openTasks={openTasks}
                rOverride={mi?.r}
                hideMode={hideMode}
                health={healthMap.get(info.id)}
                vpFilter={vpFilter}
                subLabel={mi?.sub} />
            );
          })}

          {/* Docs */}
          {renderableDocs.map((d) => (
            <DocNode key={d.id} info={d} k={view.k} dim={isDim(d.id)}
              hovered={hovered === d.id} setHovered={setHovered} />
          ))}
        </g>
      </svg>

      <CanvasControls
        k={view.k} onFit={fit} onReset={reset} onZoom={zoomBy}
        onCollapseAll={collapseAll}
        nodeCount={positions.size + docNodes.length}
        renderCount={renderableNodes.length + renderableDocs.length}
        demoEnabled={demoEnabled} setDemoEnabled={setDemoEnabled} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Node sub-components
// ─────────────────────────────────────────────────────────────

function BubbleNode({ info, k, dim, hovered, setHovered, onClick,
  collapsible, isCollapsed, childCount, onToggleCollapse, openTasks, rOverride, subLabel, hideMode = 'dim', health, vpFilter }) {
  const n = info.node;
  const r = rOverride != null ? rOverride : (RADII[n.kind] || 14);
  const showLabel = k >= (LABEL_K[n.kind] || 0.5);

  // Color by kind + health/status
  let fill = 'var(--white)', stroke = 'var(--line2)';
  if (n.kind === 'project') {
    fill = 'var(--white)'; stroke = 'var(--ink)';
  } else if (health && HEALTH_COLORS[health] && (n.kind === 'section' || n.kind === 'lot')) {
    fill = HEALTH_COLORS[health].fill; stroke = HEALTH_COLORS[health].stroke;
  } else if (n.kind === 'lot') {
    fill = n.empty ? '#f1f4f8' : 'var(--blueS)';
    stroke = n.empty ? 'var(--line2)' : 'var(--blue)';
  } else {
    if (n.status === 'geprüft') { fill = 'var(--greenS)'; stroke = 'var(--greenD)'; }
    else if (n.status === 'offen') { fill = '#fff4dc'; stroke = 'var(--amber)'; }
    else { fill = '#f1f4f8'; stroke = 'var(--mute)'; }
  }
  const interactive = (n.kind === 'section' || n.kind === 'position');

  // VP echo on section/lot bubbles when the paket filter is active
  let vpDots = [];
  if (vpFilter && (n.kind === 'section' || n.kind === 'lot')) {
    const ids = nodeVpIds(n);
    const list = (window.VERGABEPAKETE || []).filter((v) => ids.has(v.id) && vpFilter.has(v.id));
    if (list.length) { stroke = list[0].color; vpDots = list.slice(0, 6); }
  }

  // ── Positions get a specialized treatment: OZ inside, name only on hover.
  if (n.kind === 'position') {
    const vps = (window.positionPakete ? window.positionPakete(n.code) : []) || [];
    let pf = fill, ps = stroke;
    if (health && HEALTH_COLORS[health]) { pf = HEALTH_COLORS[health].fill; ps = HEALTH_COLORS[health].stroke; }
    if (vps.length === 1) { pf = vps[0].soft; ps = vps[0].color; }
    else if (vps.length > 1) { pf = 'var(--white)'; ps = 'var(--dim)'; }
    const dotRow = vps.slice(0, 4);
    const op = dim ? (hideMode === 'hide' ? 0.05 : 0.16) : 1;
    return (
      <g transform={`translate(${info.cx},${info.cy})`}
         style={{ cursor: 'pointer', opacity: op, transition: 'opacity .15s',
           pointerEvents: dim && hideMode === 'hide' ? 'none' : 'auto' }}
         onMouseEnter={() => setHovered(info.id)}
         onMouseLeave={() => setHovered(null)}
         onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
        <circle r={r} fill={pf} stroke={ps}
          strokeWidth={hovered ? 2 : 1.2}
          style={{
            filter: hovered ? 'drop-shadow(0 4px 12px rgba(37,99,235,0.22))' : 'none',
            transition: 'all .15s',
          }} />
        {showLabel && (
          <text textAnchor="middle" y={dotRow.length > 1 ? 0 : 3.5}
            fontFamily="var(--mono)" fontSize="9" fontWeight="600" fill="var(--ink)">
            {n.code}
          </text>
        )}
        {showLabel && dotRow.length > 1 && (
          <g transform={`translate(0,${Math.max(7, r * 0.42)})`}>
            {dotRow.map((v, i) => {
              const gap = 5; const x = (i - (dotRow.length - 1) / 2) * gap;
              return <circle key={v.id} cx={x} cy={0} r={2.1} fill={v.color} stroke="#fff" strokeWidth="0.6" />;
            })}
          </g>
        )}
        {hovered && (() => {
          const label = truncate(n.label, 36);
          const charW = 5.5;
          const pad = 8;
          const lblW = Math.max(60, label.length * charW + pad * 2);
          const lblH = 22;
          return (
            <g transform={`translate(${r + 6},${-lblH / 2})`}>
              <rect x={0} y={0} width={lblW} height={lblH}
                fill="var(--ink)" rx="2" opacity="0.95" />
              <text x={pad} y={lblH / 2 + 3.5}
                fontFamily="var(--mono)" fontSize="10" fill="#fff">
                {label}
              </text>
            </g>
          );
        })()}
      </g>
    );
  }

  const topLabel =
    n.kind === 'project'   ? 'PROJEKT' :
    n.kind === 'lot'       ? `LOS ${n.num || ''}` :
    n.kind === 'section'   ? `§ ${n.code}` :
    n.kind === 'subsection'? n.code :
    n.kind === 'group'     ? n.code : '';
  const mainFontSize =
    n.kind === 'project'   ? 16 :
    n.kind === 'lot'       ? 13 :
    n.kind === 'section'   ? 11 :
    n.kind === 'subsection'? 9 :
    n.kind === 'group'     ? 8 : 7;

  return (
    <g transform={`translate(${info.cx},${info.cy})`}
       style={{ cursor: interactive || collapsible ? 'pointer' : 'default',
         opacity: dim ? 0.16 : 1, transition: 'opacity .15s' }}
       onMouseEnter={() => setHovered(info.id)}
       onMouseLeave={() => setHovered(null)}
       onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      <circle r={r} fill={fill} stroke={stroke}
        strokeWidth={hovered ? 2 : (n.kind === 'project' ? 1.6 : 1.2)}
        style={{
          filter: hovered ? 'drop-shadow(0 4px 14px rgba(37,99,235,0.20))'
            : (n.kind === 'project' ? 'drop-shadow(0 2px 10px rgba(26,37,51,0.07))' : 'none'),
          transition: 'all .15s' }} />

      {showLabel && (
        <>
          <text textAnchor="middle" y={-r * 0.32 - 2}
            fontFamily="var(--mono)" fontSize={Math.max(7, r * 0.2)}
            fill="var(--mute)" letterSpacing="0.5">{topLabel}</text>
          <text textAnchor="middle" y={r * 0.05 + 3}
            fontFamily="var(--sans)" fontSize={mainFontSize}
            fontWeight={n.kind === 'project' ? 700 : 600}
            fill="var(--ink)">{truncate(n.label, 22)}</text>
          {subLabel && (n.kind === 'section' || n.kind === 'lot' || n.kind === 'project') && (
            <text textAnchor="middle" y={r * 0.32 + 11}
              fontFamily="var(--mono)" fontSize={Math.max(7, r * 0.2)}
              fill="var(--dim)">{subLabel}</text>
          )}
        </>
      )}

      {vpDots.length > 0 && showLabel && (
        <g transform={`translate(0,${-r * 0.5})`}>
          {vpDots.map((v, i) => {
            const gap = 6; const x = (i - (vpDots.length - 1) / 2) * gap;
            return <circle key={v.id} cx={x} cy={0} r={2.4} fill={v.color} stroke="#fff" strokeWidth="0.7" />;
          })}
        </g>
      )}

      {openTasks > 0 && (
        <g transform={`translate(${r * 0.72},${-r * 0.72})`}>
          <circle r={Math.max(7, r * 0.32)} fill="var(--amber)" stroke="#fff" strokeWidth="1.6" />
          <text textAnchor="middle" y={3} fontFamily="var(--mono)"
            fontSize={Math.max(8, r * 0.28)} fontWeight="600" fill="#fff">{openTasks}</text>
        </g>
      )}

      {collapsible && (
        <g transform={`translate(${r * 0.72},${r * 0.72})`}
           style={{ cursor: 'pointer' }}
           onMouseDown={(e) => e.stopPropagation()}
           onClick={(e) => { e.stopPropagation(); onToggleCollapse && onToggleCollapse(); }}>
          <title>{isCollapsed ? `${childCount} einblenden` : 'Einklappen'}</title>
          <circle r={Math.max(8, r * 0.3)} fill="var(--white)"
            stroke={isCollapsed ? 'var(--blue)' : 'var(--line2)'} strokeWidth="1.2" />
          {isCollapsed ? (
            <>
              <line x1={-4} y1={0} x2={4} y2={0} stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" />
              <line x1={0} y1={-4} x2={0} y2={4} stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" />
            </>
          ) : (
            <line x1={-4} y1={0} x2={4} y2={0} stroke="var(--dim)" strokeWidth="1.4" strokeLinecap="round" />
          )}
        </g>
      )}
    </g>
  );
}

function DotNode({ info, k, dim, hovered, setHovered, onClick }) {
  const n = info.node;
  const r = 5;
  let fill = 'var(--blue)';
  if (n.status === 'offen') fill = 'var(--amber)';
  else if (n.status === 'entwurf') fill = 'var(--mute)';
  const showLabel = hovered || k >= 1.8;
  return (
    <g transform={`translate(${info.cx},${info.cy})`}
       style={{ cursor: 'pointer', opacity: dim ? 0.16 : 1, transition: 'opacity .15s' }}
       onMouseEnter={() => setHovered(info.id)}
       onMouseLeave={() => setHovered(null)}
       onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      <circle r={hovered ? r + 1.5 : r} fill={fill} stroke="var(--white)" strokeWidth="1" />
      {showLabel && (
        <text textAnchor="middle" y={-r - 4}
          fontFamily="var(--mono)" fontSize="8" fill="var(--ink)"
          style={{ paintOrder: 'stroke', stroke: 'var(--white)', strokeWidth: 2.5 }}>
          {n.code || truncate(n.label, 14)}
        </text>
      )}
    </g>
  );
}

function ClusterNode({ info, k, dim, hovered, setHovered, onClick }) {
  const r = RADII.cluster;
  const showLabel = k >= LABEL_K.cluster;
  const sampleLabel = info.sampleKind === 'position' ? 'POS.'
    : info.sampleKind === 'group' ? 'GR.'
    : info.sampleKind === 'subsection' ? 'UNTER'
    : info.sampleKind === 'section' ? 'ABS.' : 'KIND.';
  return (
    <g transform={`translate(${info.cx},${info.cy})`}
       style={{ cursor: 'pointer', opacity: dim ? 0.16 : 1, transition: 'opacity .15s' }}
       onMouseEnter={() => setHovered(info.id)}
       onMouseLeave={() => setHovered(null)}
       onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      <circle r={r + 6} fill="none" stroke="var(--line2)" strokeDasharray="2 3" opacity="0.55" />
      <circle r={r} fill="var(--paper)" stroke="var(--dim)" strokeWidth={hovered ? 2 : 1.2}
        style={{ filter: hovered ? 'drop-shadow(0 4px 12px rgba(26,37,51,0.10))' : 'none',
          transition: 'all .15s' }} />
      {showLabel && (
        <>
          <text textAnchor="middle" y={-1}
            fontFamily="var(--sans)" fontSize="13" fontWeight="700" fill="var(--ink)">
            {info.count.toLocaleString('de-DE')}
          </text>
          <text textAnchor="middle" y={13}
            fontFamily="var(--mono)" fontSize="8.5" fill="var(--dim)" letterSpacing="0.5">
            {sampleLabel}
          </text>
        </>
      )}
      {hovered && (
        <g transform="translate(0, 30)">
          <rect x="-26" y="-8" width="52" height="16" fill="var(--blue)" rx="2" />
          <text textAnchor="middle" y="3" fontFamily="var(--mono)" fontSize="9"
            fontWeight="600" fill="#fff">Tabelle ↗</text>
        </g>
      )}
    </g>
  );
}

function DocNode({ info, k, dim, hovered, setHovered }) {
  const W = 22, H = 26, fold = 6;
  const stroke = hovered ? 'var(--blue)' : 'var(--line2)';
  const fill = hovered ? 'var(--blueS)' : 'var(--white)';
  const showLabel = k >= LABEL_K.doc;
  return (
    <g transform={`translate(${info.cx},${info.cy})`}
       style={{ cursor: 'default', opacity: dim ? 0.2 : 1, transition: 'opacity .15s' }}
       onMouseEnter={() => setHovered(info.id)}
       onMouseLeave={() => setHovered(null)}>
      <title>{info.node.name} · {info.linkedIds.length} Positionen verknüpft</title>
      <g transform={`translate(${-W / 2},${-H / 2})`}>
        <path d={`M1 1 L${W - fold} 1 L${W - 1} ${fold + 1} L${W - 1} ${H - 1} L1 ${H - 1} Z`}
          fill={fill} stroke={stroke} strokeWidth={hovered ? 1.4 : 1}
          style={{ filter: hovered ? 'drop-shadow(0 2px 8px rgba(37,99,235,0.20))' : 'none' }} />
        <path d={`M${W - fold} 1 L${W - fold} ${fold + 1} L${W - 1} ${fold + 1}`}
          fill="var(--grid)" stroke={stroke} strokeWidth={hovered ? 1.4 : 1} strokeLinejoin="miter" />
        <line x1={4} y1={fold + 6} x2={W - 4} y2={fold + 6} stroke="var(--line)" strokeWidth="1" />
        <line x1={4} y1={fold + 10} x2={W - 4} y2={fold + 10} stroke="var(--line)" strokeWidth="1" />
        <line x1={4} y1={fold + 14} x2={W - 7} y2={fold + 14} stroke="var(--line)" strokeWidth="1" />
      </g>
      {showLabel && (
        <text textAnchor="middle" y={H / 2 + 11}
          fontFamily="var(--mono)" fontSize="9"
          fill={hovered ? 'var(--blueD)' : 'var(--dim)'}>{info.node.name}</text>
      )}
      {hovered && (
        <text textAnchor="middle" y={H / 2 + 23}
          fontFamily="var(--mono)" fontSize="8" fill="var(--blueD)">
          {info.linkedIds.length} Pos.
        </text>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating canvas controls (zoom + fit + demo toggle + counter)
// ─────────────────────────────────────────────────────────────

function CanvasControls({ k, onFit, onReset, onZoom, onCollapseAll, nodeCount, renderCount, demoEnabled, setDemoEnabled }) {
  const btn = {
    height: 28, minWidth: 28, padding: '0 8px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--white)', border: '1px solid var(--line)',
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)',
    cursor: 'pointer', userSelect: 'none', lineHeight: 1,
  };
  const swallow = (e) => e.stopPropagation();
  return (
    <div onMouseDown={swallow} onClick={swallow}
      style={{
        position: 'absolute', bottom: 14, right: 14, zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end',
      }}>
      <div style={{ display: 'inline-flex', gap: 6, boxShadow: '0 4px 14px rgba(26,37,51,0.08)' }}>
        <button title="Alles einklappen" style={btn} onClick={onCollapseAll}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 4 L7 8 L11 4" fill="none" stroke="currentColor"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="2" y1="11" x2="12" y2="11" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <button title="Alles einpassen" style={btn} onClick={onFit}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 5 V1 H5 M9 1 H13 V5 M13 9 V13 H9 M5 13 H1 V9"
            fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button title="Auszoomen" style={btn} onClick={() => onZoom(1 / 1.25)}>−</button>
        <div style={{ ...btn, minWidth: 46, cursor: 'default', color: 'var(--dim)' }}>{Math.round(k * 100)}%</div>
        <button title="Einzoomen" style={btn} onClick={() => onZoom(1.25)}>+</button>
        <button title="Zurücksetzen" style={{ ...btn, fontSize: 9, color: 'var(--dim)' }} onClick={onReset}>1:1</button>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 10px', background: 'rgba(255,255,255,0.92)',
        border: '1px solid var(--grid)',
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)',
      }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'var(--ink)' }}>
          <input type="checkbox" checked={!!demoEnabled}
            onChange={(e) => setDemoEnabled && setDemoEnabled(e.target.checked)}
            style={{ margin: 0 }} />
          <span>Demo: 3 125 Pos. · 5 Tiefen</span>
        </label>
        <span style={{ color: 'var(--line2)' }}>|</span>
        <span>
          <span style={{ color: 'var(--ink)' }}>{renderCount.toLocaleString('de-DE')}</span>
          <span> / {nodeCount.toLocaleString('de-DE')} Knoten</span>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// All-positions table view (graph ↔ table toggle target)
// ─────────────────────────────────────────────────────────────

function AllPositionsTable({ sections, filters, search, onPick }) {
  const matchPos = window.matchPos; // exported from lv-main
  const allRows = useMemo(() => {
    const rows = [];
    sections.forEach((sec) => {
      sec.positions.forEach((p) => {
        if (matchPos && !matchPos(p, filters, search)) return;
        rows.push({ section: sec, p });
      });
    });
    return rows;
  }, [sections, filters, search]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--white)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--panel)', display: 'flex', gap: 12, alignItems: 'center',
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
        <span style={{ letterSpacing: .6, color: 'var(--mute)' }}>ALLE POSITIONEN</span>
        <span style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600 }}>
          {allRows.length.toLocaleString('de-DE')} <span style={{ color: 'var(--mute)', fontWeight: 400 }}>Treffer</span>
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--mute)',
              fontSize: 9, letterSpacing: .6, textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '8px 14px', width: '9%' }}>OZ</th>
              <th style={{ padding: '8px 14px', width: '14%' }}>Abschnitt</th>
              <th style={{ padding: '8px 14px', width: '32%' }}>Bezeichnung</th>
              <th style={{ padding: '8px 14px', width: '11%' }}>Beton</th>
              <th style={{ padding: '8px 14px', width: '8%' }}>Einheit</th>
              <th style={{ padding: '8px 14px', width: '9%', textAlign: 'right' }}>Menge</th>
              <th style={{ padding: '8px 14px', width: '9%', textAlign: 'right' }}>EP €</th>
              <th style={{ padding: '8px 14px', width: '8%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map(({ section, p }) => (
              <tr key={p.code}
                onClick={() => onPick && onPick(section.id, p.code)}
                style={{ borderBottom: '1px solid var(--grid)', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '6px 14px', color: 'var(--dim)' }}>{p.code}</td>
                <td style={{ padding: '6px 14px', color: 'var(--mute)' }}>
                  § {section.code} · <span style={{ color: 'var(--ink)' }}>{section.label}</span>
                </td>
                <td style={{ padding: '6px 14px', color: 'var(--ink)' }}>{p.label}</td>
                <td style={{ padding: '6px 14px', color: 'var(--dim)' }}>{p.beton || '—'}</td>
                <td style={{ padding: '6px 14px', color: 'var(--dim)' }}>{p.einheit}</td>
                <td style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--ink)' }}>
                  {p.menge?.toLocaleString('de-DE')}
                </td>
                <td style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--ink)' }}>
                  {p.ep != null ? p.ep.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '—'}
                </td>
                <td style={{ padding: '6px 14px' }}>
                  {window.Status ? React.createElement(window.Status, { s: p.status }) : p.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

Object.assign(window, {
  Bubbles, AllPositionsTable, SIZE_MODES, LOTS, DOCS,
});
