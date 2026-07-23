// wf-layouts.jsx — the four wireframe layout variations + branding section

// Common: a labeled corner badge for each artboard's annotation
function CornerBadge({ name, num, blurb }) {
  return (
    <div style={{ position:'absolute', top:10, right:10, zIndex:50, textAlign:'right',
      fontFamily:T.mono, color:T.mute, pointerEvents:'none' }}>
      <div style={{ fontSize:9, letterSpacing:.6 }}>VARIANTE {num}</div>
      <div style={{ fontFamily:T.sans, fontSize:13, color:T.ink, fontWeight:600, letterSpacing:-.2 }}>{name}</div>
      <div style={{ fontSize:9, color:T.dim, maxWidth:240, marginTop:2 }}>{blurb}</div>
    </div>
  );
}

// Small floating mini-map (used as accent in Layout 2)
function MiniMap() {
  return (
    <div style={{ position:'absolute', bottom:14, right:14, width:120, height:80,
      background:T.white, border:`1px solid ${T.line}`, padding:6, zIndex:40 }}>
      <div style={{ fontFamily:T.mono, fontSize:8, color:T.mute, letterSpacing:.6,
        marginBottom:3, display:'flex', justifyContent:'space-between' }}>
        <span>ÜBERSICHT</span><span>1:8</span>
      </div>
      <svg width="108" height="55" viewBox="0 0 108 55">
        <rect x="0" y="0" width="50" height="32" fill={T.blueS} stroke={T.blue} strokeWidth=".7"/>
        <rect x="50" y="0" width="34" height="22" fill={T.blueS} stroke={T.blue} strokeWidth=".7"/>
        <rect x="84" y="0" width="24" height="22" fill={T.blueS} stroke={T.blue} strokeWidth=".7"/>
        <rect x="50" y="22" width="34" height="14" fill="#fff4dc" stroke={T.amber} strokeWidth=".7"/>
        <rect x="84" y="22" width="24" height="14" fill={T.blueS} stroke={T.blue} strokeWidth=".7"/>
        <rect x="0" y="32" width="32" height="23" fill="#f1f4f8" stroke={T.mute} strokeWidth=".7"/>
        <rect x="32" y="32" width="30" height="23" fill="#f1f4f8" stroke={T.mute} strokeWidth=".7"/>
        <rect x="62" y="36" width="46" height="19" fill="#fff4dc" stroke={T.amber} strokeWidth=".7"/>
        {/* viewport indicator */}
        <rect x="18" y="6" width="48" height="26" fill="none" stroke={T.ink} strokeWidth="1" strokeDasharray="2 2"/>
      </svg>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// VARIANTE 1 — Klassisch / 3-Spalten
// Tree | Bubble | Properties — standard, dense topbar
// ───────────────────────────────────────────────────────────────
function Layout1() {
  return (
    <Frame>
      <TopBar activeView="bubble" mode="single" />
      <div style={{ display:'flex', flex:1, position:'relative', height:'calc(100% - 80px)' }}>
        <LeftTree />
        <VDivider />
        <div style={{ flex:1, position:'relative', background:T.panel, overflow:'hidden' }}>
          {/* canvas action chips top-left */}
          <div style={{ position:'absolute', top:12, left:12, zIndex:5, display:'flex', gap:6 }}>
            <Chip label="Größe ▸ Anz. Positionen" accent/>
            <Chip label="Sortierung ▸ Volumen ↓"/>
            <Chip label="Layout ▸ Force"/>
          </div>
          {/* zoom controls top-right */}
          <div style={{ position:'absolute', top:12, right:12, zIndex:5, display:'flex',
            border:`1px solid ${T.line}`, background:T.white, fontFamily:T.mono, fontSize:11 }}>
            {['−','100%','+','⛶'].map((g,i)=>(
              <div key={i} style={{ padding:'4px 9px', color:T.dim, borderRight: i<3?`1px solid ${T.line}`:'none' }}>{g}</div>
            ))}
          </div>
          <BubbleView w={680} h={648}/>
        </div>
        <VDivider />
        <RightProps />
      </div>
      <FooterBar extra={<span>BUBBLE · LV-VIEWER v0.4</span>}/>
    </Frame>
  );
}

// ───────────────────────────────────────────────────────────────
// VARIANTE 2 — Kompakt / Icon-Rails
// Both side panels collapsed; full canvas with treemap
// ───────────────────────────────────────────────────────────────
function Layout2() {
  return (
    <Frame>
      <TopBar activeView="tree" mode="single" />
      <div style={{ display:'flex', flex:1, position:'relative', height:'calc(100% - 80px)' }}>
        <LeftTree collapsed/>
        <div style={{ flex:1, position:'relative', background:T.panel, overflow:'hidden' }}>
          {/* secondary toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px',
            borderBottom:`1px solid ${T.line}`, background:T.white, fontFamily:T.mono, fontSize:10, color:T.dim }}>
            <span style={{ letterSpacing:.6, color:T.mute }}>TREEMAP ·</span>
            <span style={{ color:T.ink }}>Flächenverhältnis = Volumen</span>
            <span style={{ color:T.line2 }}>|</span>
            <Chip label="nach Status gruppieren" on/>
            <Chip label="Beton" />
            <Chip label="Exposition" />
            <span style={{ marginLeft:'auto', color:T.mute }}>72 Positionen sichtbar · 0 ausgeblendet</span>
          </div>
          <div style={{ position:'absolute', left:14, top:60, right:14, bottom:14 }}>
            <TreemapView w={1144} h={624}/>
          </div>
          <MiniMap />
        </div>
        <RightProps collapsed/>
      </div>
      <FooterBar/>
    </Frame>
  );
}

// ───────────────────────────────────────────────────────────────
// VARIANTE 3 — Vergleich (LV-A vs LV-B)
// Shared tree (left), two viewports side-by-side, diff in right rail
// ───────────────────────────────────────────────────────────────
function Layout3() {
  return (
    <Frame>
      <TopBar activeView="bubble" mode="compare" breadcrumb={
        <>
          <span>HELLERWIESE</span>
          <span style={{ color:T.line2 }}>/</span>
          <span style={{ color:T.ink, padding:'2px 6px', background:T.blueS, border:`1px solid ${T.blue}` }}>LV_v3.7</span>
          <span style={{ color:T.line2 }}>↔</span>
          <span style={{ color:T.ink, padding:'2px 6px', background:'#fff4dc', border:`1px solid ${T.amber}` }}>LV_v3.5</span>
        </>
      }/>
      <div style={{ display:'flex', flex:1, position:'relative', height:'calc(100% - 80px)' }}>
        <LeftTree />
        <VDivider />
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:T.panel }}>
          {/* Two viewport headers */}
          <div style={{ display:'flex', borderBottom:`1px solid ${T.line}`, background:T.white,
            fontFamily:T.mono, fontSize:10, color:T.dim }}>
            <div style={{ flex:1, padding:'8px 14px', borderRight:`1px solid ${T.line}`, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:8, height:8, background:T.blue, borderRadius:'50%' }}/>
              <span style={{ color:T.ink, fontFamily:T.sans, fontWeight:600, fontSize:11 }}>LV_v3.7</span>
              <span style={{ color:T.mute }}>· aktuell · 72 Pos · 2.214 m³</span>
              <span style={{ marginLeft:'auto' }}>BUBBLE ▾</span>
            </div>
            <div style={{ flex:1, padding:'8px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:8, height:8, background:T.amber, borderRadius:'50%' }}/>
              <span style={{ color:T.ink, fontFamily:T.sans, fontWeight:600, fontSize:11 }}>LV_v3.5</span>
              <span style={{ color:T.mute }}>· Stand 14.05. · 68 Pos · 2.103 m³</span>
              <span style={{ marginLeft:'auto' }}>TREEMAP ▾</span>
            </div>
          </div>
          <div style={{ flex:1, display:'flex' }}>
            <div style={{ flex:1, borderRight:`1px solid ${T.line}`, background:T.panel, position:'relative' }}>
              <BubbleView w={400} h={520}/>
            </div>
            <div style={{ flex:1, background:T.panel, padding:8 }}>
              <TreemapView w={400} h={510}/>
            </div>
          </div>
          {/* Diff strip */}
          <div style={{ borderTop:`1px solid ${T.line}`, background:T.white, padding:'8px 14px',
            display:'flex', alignItems:'center', gap:14, fontFamily:T.mono, fontSize:10 }}>
            <span style={{ color:T.mute, letterSpacing:.6 }}>DIFF</span>
            <span><span style={{ color:T.greenD }}>+4</span> <span style={{ color:T.dim }}>neu</span></span>
            <span><span style={{ color:T.amber }}>~9</span> <span style={{ color:T.dim }}>geändert</span></span>
            <span><span style={{ color:'#c0392b' }}>−2</span> <span style={{ color:T.dim }}>entfernt</span></span>
            <span style={{ marginLeft:'auto', color:T.mute }}>Differenz: +111 m³ · +28.640 €</span>
          </div>
        </div>
        <VDivider />
        <CompareProps/>
      </div>
      <FooterBar extra={<span>VERGLEICHSMODUS · 2 LV</span>}/>
    </Frame>
  );
}

function CompareProps() {
  return (
    <div style={{ width:300, background:T.white, borderLeft:`1px solid ${T.line}`, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.line}` }}>
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.6 }}>POSITION · 03.020</div>
        <div style={{ fontFamily:T.sans, fontSize:14, fontWeight:600, color:T.ink, marginTop:4 }}>
          Außenwand nichttragend
        </div>
        <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, fontFamily:T.mono, fontSize:9, color:T.mute }}>
          <span style={{ color:T.blue }}>v3.7</span> <span>↔</span> <span style={{ color:T.amber }}>v3.5</span>
        </div>
      </div>
      <PanelHd k="Δ1" label="Geänderte Felder" right={<span>3</span>}/>
      <div style={{ padding:'10px 14px', fontFamily:T.mono, fontSize:10 }}>
        <DiffRow l="Menge" a="134 m³" b="112 m³" delta="+22"/>
        <DiffRow l="Beton" a="C30/37" b="C25/30" delta="↑"/>
        <DiffRow l="Exposition" a="XC1" b="XC1, XC3" delta="−XC3"/>
      </div>
      <PanelHd k="Δ2" label="Unverändert" right={<span>11</span>}/>
      <div style={{ padding:'8px 14px', fontFamily:T.mono, fontSize:10, color:T.mute }}>
        <div>Code · Einheit · Dicke · Höhe · Tragend · Normen · …</div>
      </div>
      <PanelHd k="Δ3" label="Kommentare zur Änderung" right={<span>1</span>}/>
      <div style={{ padding:'8px 14px', fontFamily:T.mono, fontSize:10, color:T.dim }}>
        <div style={{ display:'flex', gap:8, padding:'4px 0' }}>
          <div style={{ width:18, height:18, borderRadius:9, background:T.amberS,
            border:`1px solid ${T.amber}`, color:T.amber, fontSize:9,
            display:'flex', alignItems:'center', justifyContent:'center' }}>RH</div>
          <div style={{ flex:1 }}>
            <div style={{ color:T.ink }}>Mengenanpassung n. Statik</div>
            <div style={{ fontSize:9, color:T.mute }}>R. Hoffmann · v3.6 → v3.7</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffRow({ l, a, b, delta }) {
  return (
    <div style={{ padding:'6px 0', borderBottom:`1px dashed ${T.grid2}` }}>
      <div style={{ fontSize:8, color:T.mute, letterSpacing:.5, textTransform:'uppercase' }}>{l}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
        <span style={{ flex:1, color:T.blueD, background:T.blueS, padding:'2px 6px', border:`1px solid ${T.blue}33` }}>{a}</span>
        <span style={{ color:T.mute }}>←</span>
        <span style={{ flex:1, color:T.amber, background:'#fff4dc', padding:'2px 6px', border:`1px solid ${T.amber}33` }}>{b}</span>
        <span style={{ color:T.dim, fontSize:9 }}>{delta}</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// VARIANTE 4 — Werkbank / Dual-Topbar mit Tabelle
// Two-row topbar, table view, stacked property cards
// ───────────────────────────────────────────────────────────────
function Layout4() {
  return (
    <Frame>
      <TopBar activeView="table" mode="single" />
      {/* secondary toolbar row */}
      <div style={{ height:36, background:T.panel, borderBottom:`1px solid ${T.line}`,
        display:'flex', alignItems:'center', padding:'0 14px', gap:12,
        fontFamily:T.mono, fontSize:10, color:T.dim, flexShrink:0 }}>
        <span style={{ letterSpacing:.6, color:T.mute }}>ANSICHT</span>
        <Chip label="Tabelle" on/>
        <Chip label="Gruppieren: Abschnitt"/>
        <Chip label="Dichte: kompakt"/>
        <Chip label="Spalten 7/12 ▾" dashed/>
        <span style={{ color:T.line2 }}>|</span>
        <span style={{ letterSpacing:.6, color:T.mute }}>AKTIONEN</span>
        <Chip label="↑ GAEB"/>
        <Chip label="↓ CSV"/>
        <Chip label="↗ PDF"/>
        <span style={{ marginLeft:'auto', color:T.mute }}>72 / 72 sichtbar · Sortiert nach Code ↑</span>
      </div>
      <div style={{ display:'flex', flex:1, position:'relative', height:'calc(100% - 116px)' }}>
        <LeftTree />
        <VDivider />
        <div style={{ flex:1, overflow:'hidden', background:T.white, position:'relative' }}>
          <TableView w={760} h={612} dense/>
        </div>
        <VDivider />
        <StackedProps/>
      </div>
      <FooterBar/>
    </Frame>
  );
}

function StackedProps() {
  return (
    <div style={{ width:300, background:T.paper, borderLeft:`1px solid ${T.line}`,
      display:'flex', flexDirection:'column', gap:8, padding:8, overflow:'hidden' }}>
      {/* Card 1 — Position summary */}
      <Surface style={{ flexShrink:0 }}>
        <div style={{ padding:'10px 12px', borderBottom:`1px solid ${T.line}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:T.mono, fontSize:9, color:T.mute }}>POS · 03.010 ●</span>
            <Status s="geprüft"/>
          </div>
          <div style={{ fontFamily:T.sans, fontSize:13, fontWeight:600, color:T.ink, marginTop:3 }}>
            Außenwand C30/37 tragend
          </div>
        </div>
        <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 14px',
          fontFamily:T.mono, fontSize:10 }}>
          <PF l="Menge" v="248 m³"/>
          <PF l="EP" v="187,40 €"/>
          <PF l="Beton" v="C30/37"/>
          <PF l="Expo" v="XC1"/>
        </div>
      </Surface>

      {/* Card 2 — Mengen breakdown */}
      <Surface style={{ flexShrink:0 }}>
        <PanelHd k="A" label="Mengen + Kosten" right={<span>↗</span>}/>
        <div style={{ padding:'10px 12px', fontFamily:T.mono, fontSize:10 }}>
          {[['Beton', 248, 187.4, T.blue],
            ['Bewehrung', 24.8, 1240, T.cyan],
            ['Schalung', 1248, 38.6, T.amber]].map(([n,m,p,col],i)=>(
            <div key={i} style={{ padding:'4px 0', borderBottom: i<2?`1px dashed ${T.grid2}`:'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', color:T.dim }}>
                <span>{n}</span><span style={{ color:T.ink }}>{m} · {p} €</span>
              </div>
              <div style={{ marginTop:3, height:2, background:T.grid }}>
                <div style={{ width:`${[62,28,46][i]}%`, height:'100%', background:col }}/>
              </div>
            </div>
          ))}
          <div style={{ marginTop:8, paddingTop:6, borderTop:`1px solid ${T.line}`,
            display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:T.dim }}>GP gesamt</span>
            <span style={{ color:T.ink, fontWeight:600 }}>104.260,80 €</span>
          </div>
        </div>
      </Surface>

      {/* Card 3 — Linked docs */}
      <Surface style={{ flexShrink:0, flex:1, display:'flex', flexDirection:'column' }}>
        <PanelHd k="B" label="Dokumente + Notizen" right={<span>3 · 2</span>}/>
        <div style={{ padding:'8px 12px', fontFamily:T.mono, fontSize:10, color:T.dim, flex:1 }}>
          {['Statik_AW_03.pdf','Plan_03.dwg','Bewehrung_AW.pdf'].map((d,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 0' }}>
              <span style={{ color:T.ink, display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ width:10, height:12, background:T.grid, border:`1px solid ${T.line2}` }}/>
                {d}
              </span>
              <span>↗</span>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// BRAND SECTION — logos + type
// ───────────────────────────────────────────────────────────────
function LogoCard({ children, label, big }) {
  return (
    <div style={{ width: big? 360 : 200, height:160, background:T.white,
      border:`1px solid ${T.line}`, display:'flex', flexDirection:'column',
      backgroundImage:
        `linear-gradient(${T.grid} 1px, transparent 1px),
         linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
      backgroundSize:'16px 16px' }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {children}
      </div>
      <div style={{ padding:'6px 10px', borderTop:`1px solid ${T.line}`, background:T.white,
        fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.5 }}>{label}</div>
    </div>
  );
}

function LogoA() {
  // Primary mark — connected bubbles
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <svg width="76" height="56" viewBox="0 0 76 56">
        <line x1="16" y1="30" x2="42" y2="20" stroke={T.line2} strokeWidth="1"/>
        <line x1="42" y1="20" x2="60" y2="36" stroke={T.line2} strokeWidth="1"/>
        <line x1="16" y1="30" x2="42" y2="42" stroke={T.line2} strokeWidth="1"/>
        <circle cx="42" cy="20" r="7" fill={T.blue}/>
        <circle cx="16" cy="30" r="10" fill="none" stroke={T.blue} strokeWidth="2.4"/>
        <circle cx="60" cy="36" r="5" fill="none" stroke={T.blue} strokeWidth="2.4"/>
      </svg>
      <div>
        <div style={{ fontFamily:T.sans, fontWeight:700, fontSize:32, color:T.ink, letterSpacing:-.6, lineHeight:1 }}>bubble</div>
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.dim, letterSpacing:1.4, marginTop:4 }}>LV-VIEWER</div>
      </div>
    </div>
  );
}

function LogoB() {
  // Alt — single bubble with inset 'b'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="none" stroke={T.ink} strokeWidth="1.8"/>
        <circle cx="14" cy="14" r="4" fill={T.blue}/>
        <text x="22" y="29" textAnchor="middle" fontFamily={T.sans} fontWeight="700" fontSize="20" fill={T.ink}>b</text>
      </svg>
      <div style={{ fontFamily:T.sans, fontWeight:700, fontSize:22, color:T.ink, letterSpacing:-.4 }}>bubble<span style={{ color:T.blue }}>.</span></div>
    </div>
  );
}

function LogoC() {
  // Wordmark only — with o-as-bubble
  return (
    <div style={{ fontFamily:T.sans, fontWeight:700, fontSize:36, color:T.ink, letterSpacing:-.8, display:'inline-flex', alignItems:'center', gap:1 }}>
      b
      <svg width="30" height="30" viewBox="0 0 30 30" style={{ verticalAlign:'middle' }}>
        <circle cx="15" cy="15" r="12" fill="none" stroke={T.blue} strokeWidth="2.4"/>
        <circle cx="10" cy="11" r="2.5" fill={T.blue}/>
      </svg>
      bble
    </div>
  );
}

function LogoMono() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <svg width="20" height="14" viewBox="0 0 26 18">
          <line x1="5" y1="9" x2="14" y2="6" stroke={T.line2} strokeWidth="0.8"/>
          <line x1="14" y1="6" x2="21" y2="12" stroke={T.line2} strokeWidth="0.8"/>
          <line x1="5" y1="9" x2="14" y2="14" stroke={T.line2} strokeWidth="0.8"/>
          <circle cx="14" cy="6" r="2.6" fill={T.ink}/>
          <circle cx="5" cy="9" r="3.6" fill="none" stroke={T.ink} strokeWidth="1.2"/>
          <circle cx="21" cy="12" r="2.0" fill="none" stroke={T.ink} strokeWidth="1.2"/>
        </svg>
        <span style={{ fontFamily:T.sans, fontWeight:700, fontSize:16, color:T.ink }}>bubble</span>
      </div>
      <div style={{ fontFamily:T.mono, fontSize:8, color:T.mute, letterSpacing:1.2 }}>FAVICON · MONO · 16PX</div>
    </div>
  );
}

function TypeCard() {
  return (
    <div style={{ width:680, height:220, background:T.white, border:`1px solid ${T.line}`,
      display:'grid', gridTemplateColumns:'1fr 1fr', padding:18, gap:18 }}>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.8 }}>WORDMARK + ÜBERSCHRIFTEN</div>
        <div style={{ fontFamily:T.sans, fontSize:42, fontWeight:700, color:T.ink, letterSpacing:-.8, marginTop:6, lineHeight:1 }}>Space Grotesk</div>
        <div style={{ fontFamily:T.sans, fontSize:11, color:T.dim, marginTop:8, letterSpacing:.3 }}>
          400 · 500 · <b style={{ color:T.ink }}>600</b> · <b style={{ color:T.ink, fontWeight:700 }}>700</b>
        </div>
        <div style={{ fontFamily:T.sans, fontSize:18, fontWeight:600, color:T.ink, marginTop:14, letterSpacing:-.2 }}>
          Außenwand C30/37 tragend
        </div>
        <div style={{ fontFamily:T.sans, fontSize:11, color:T.dim, marginTop:2 }}>
          Geometrisch, ruhig, technisch — kein Stilbruch zur Mono
        </div>
      </div>
      <div>
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.8 }}>UI · DATEN · CODES</div>
        <div style={{ fontFamily:T.mono, fontSize:38, fontWeight:500, color:T.ink, marginTop:6, lineHeight:1 }}>IBM Plex Mono</div>
        <div style={{ fontFamily:T.mono, fontSize:11, color:T.dim, marginTop:8 }}>
          300 · 400 · <b style={{ color:T.ink }}>500</b>
        </div>
        <div style={{ fontFamily:T.mono, fontSize:13, color:T.ink, marginTop:14 }}>
          03.010 · C30/37 · XC1 · 248 m³
        </div>
        <div style={{ fontFamily:T.mono, fontSize:9, color:T.dim, marginTop:4, letterSpacing:.4 }}>
          Tabellen, Codes, Filter, Statusleisten
        </div>
      </div>
    </div>
  );
}

function PaletteCard() {
  const sw = [
    ['BLUE PRIMARY', T.blue, '#2563EB'],
    ['BLUE SOFT',   T.blueS, '#DBE7FD'],
    ['CYAN',        T.cyan, '#0891B2'],
    ['AMBER · OFFEN', T.amber, '#D97706'],
    ['INK',         T.ink, '#1A2533'],
    ['DIM',         T.dim, '#6B7D92'],
    ['LINE',        T.line, '#C9D4E0'],
    ['PAPER',       T.paper, '#F5F7FA'],
  ];
  return (
    <div style={{ width:300, height:220, background:T.white, border:`1px solid ${T.line}`, padding:14 }}>
      <div style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.8, marginBottom:8 }}>PALETTE</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {sw.map(([n,c,hex],i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:22, height:22, background:c, border:`1px solid ${T.line}` }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.dim, letterSpacing:.4 }}>{n}</div>
              <div style={{ fontFamily:T.mono, fontSize:9, color:T.ink }}>{hex}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Layout1, Layout2, Layout3, Layout4,
  LogoCard, LogoA, LogoB, LogoC, LogoMono, TypeCard, PaletteCard, CornerBadge
});
