// wf-panels.jsx — re-usable Tree + Properties + TopBar panels

// ─────────────────────────────────────────────────────────────
// LEFT TREE
// ─────────────────────────────────────────────────────────────
function LeftTree({ collapsed=false }) {
  if (collapsed) {
    return (
      <div style={{ width:44, background:T.white, borderRight:`1px solid ${T.line}`,
        display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', gap:4 }}>
        {['☰','◐','◔','◑','◕','◯','⌗','✦'].map((g,i)=>(
          <div key={i} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
            color: i===2?T.blue:T.dim, background: i===2?T.blueS:'transparent',
            border: i===2?`1px solid ${T.blue}`:'1px solid transparent',
            fontFamily:T.mono, fontSize:14 }}>{g}</div>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ fontFamily:T.mono, fontSize:8, color:T.mute,
          writingMode:'vertical-rl', textOrientation:'mixed', letterSpacing:1.6, padding:6 }}>
          BAUM ▸ AUSKLAPPEN
        </div>
      </div>
    );
  }
  return (
    <div style={{ width:248, background:T.white, borderRight:`1px solid ${T.line}`,
      display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'10px 12px 8px', borderBottom:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:T.sans, fontSize:11, fontWeight:600, color:T.ink, letterSpacing:-.1 }}>Struktur</span>
          <span style={{ fontFamily:T.mono, fontSize:9, color:T.mute }}>72 POS · 7 ABS</span>
        </div>
        <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6,
          border:`1px solid ${T.line}`, padding:'4px 8px', background:T.panel }}>
          <span style={{ color:T.mute, fontSize:11 }}>⌕</span>
          <span style={{ color:T.mute, fontFamily:T.mono, fontSize:10 }}>Im Baum suchen…</span>
          <span style={{ marginLeft:'auto', color:T.mute, fontFamily:T.mono, fontSize:9,
            border:`1px solid ${T.line}`, padding:'0 4px' }}>⌘K</span>
        </div>
      </div>
      <div style={{ flex:1, overflow:'hidden', paddingTop:4 }}>
        <TreeRow depth={0} code="LV" label="Bauvorhaben Hellerwiese" open={true} sel={false}/>
        <TreeRow depth={1} code="01" label="Erdarbeiten" open={false} count={6} status="geprüft"/>
        <TreeRow depth={1} code="02" label="Bodenplatte" open={true}  count={14} status="geprüft" sel={false}/>
        <TreeRow depth={2} code="02.010" label="Bodenplatte C30/37 d=30cm" leaf count={1} status="geprüft"/>
        <TreeRow depth={2} code="02.020" label="Sauberkeitsschicht C12/15" leaf count={1} status="geprüft"/>
        <TreeRow depth={2} code="02.030" label="Zulage Körnung 0/16"      leaf count={1} status="offen"/>
        <TreeRow depth={1} code="03" label="Außenwände" open={true} count={21} status="offen" sel={false}/>
        <TreeRow depth={2} code="03.010" label="Außenwand C30/37 tragend" leaf sel={true} status="geprüft"/>
        <TreeRow depth={2} code="03.020" label="Außenwand nichttragend" leaf status="offen"/>
        <TreeRow depth={2} code="03.030" label="Außenwand SB2 C30/37" leaf status="offen"/>
        <TreeRow depth={1} code="04" label="Innenwände & Stützen" open={false} count={18} status="offen"/>
        <TreeRow depth={1} code="05" label="Decken" open={false} count={9} status="geprüft"/>
        <TreeRow depth={1} code="06" label="Treppen" open={false} count={3} status="entwurf"/>
        <TreeRow depth={1} code="07" label="Dach" open={false} count={2} status="entwurf"/>
        <TreeRow depth={1} code="08" label="Sonstiges" open={false} count={5} status="offen"/>
      </div>
      <div style={{ padding:'8px 12px', borderTop:`1px solid ${T.line}`, fontFamily:T.mono,
        fontSize:9, color:T.mute, display:'flex', justifyContent:'space-between' }}>
        <span>+ Abschnitt</span>
        <span>SORT ▾</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT PROPERTIES PANEL
// ─────────────────────────────────────────────────────────────
function RightProps({ collapsed=false, w=320 }) {
  if (collapsed) {
    return (
      <div style={{ width:44, background:T.white, borderLeft:`1px solid ${T.line}`,
        display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', gap:6 }}>
        {[
          ['ⓘ','Metadaten', true],
          ['◇','Beton', false],
          ['€','Mengen', false],
          ['↗','Dokumente', false],
          ['✎','Kommentare', false],
        ].map(([g,t,on],i)=>(
          <div key={i} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
            color: on?T.blue:T.dim, background: on?T.blueS:'transparent',
            border: on?`1px solid ${T.blue}`:'1px solid transparent', fontFamily:T.mono, fontSize:14 }}>{g}</div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ width:w, background:T.white, borderLeft:`1px solid ${T.line}`,
      display:'flex', flexDirection:'column', flexShrink:0 }}>
      {/* Header */}
      <div style={{ padding:'12px 14px 10px', borderBottom:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.6 }}>POSITION · 03.010</span>
          <Status s="geprüft"/>
        </div>
        <div style={{ fontFamily:T.sans, fontSize:15, fontWeight:600, color:T.ink, lineHeight:1.3 }}>
          Außenwand C30/37 tragend
        </div>
        <div style={{ marginTop:6, display:'flex', gap:5, flexWrap:'wrap' }}>
          <Chip label="C30/37" accent/>
          <Chip label="XC1" />
          <Chip label="tragend" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${T.line}`, background:T.panel,
        fontFamily:T.mono, fontSize:9, letterSpacing:.6, color:T.dim, textTransform:'uppercase' }}>
        {['Übersicht','Beton','Mengen','Docs','Notizen'].map((t,i)=>(
          <div key={i} style={{ padding:'7px 10px', borderRight:`1px solid ${T.line}`, cursor:'pointer',
            color: i===0?T.blue:T.dim, borderBottom: i===0?`2px solid ${T.blue}`:'2px solid transparent',
            marginBottom:-1, background: i===0?T.white:'transparent' }}>{t}</div>
        ))}
      </div>

      <div style={{ flex:1, overflow:'hidden' }}>
        {/* Metadata */}
        <PanelHd k="01" label="Metadaten"/>
        <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', fontFamily:T.mono, fontSize:10 }}>
          <PF l="Code" v="03.010"/>
          <PF l="Einheit" v="m³"/>
          <PF l="Menge" v="248,00"/>
          <PF l="Dicke" v="15–25 cm"/>
          <PF l="Höhe" v="3–4 m"/>
          <PF l="Tragend" v="Ja"/>
        </div>

        {/* Beton */}
        <PanelHd k="02" label="Betonspezifikation"/>
        <div style={{ padding:'10px 14px', fontFamily:T.mono, fontSize:10 }}>
          <PF l="Festigkeit" v="C30/37"/>
          <PF l="Expositionsklassen" v="XC1"/>
          <PF l="Normen" v="DIN EN 206-1 · DIN 1045-2"/>
          <PF l="Besonderheiten" v="—"/>
        </div>

        {/* Mengen */}
        <PanelHd k="03" label="Mengen + Kosten" right={<span>€</span>}/>
        <div style={{ padding:'10px 14px', fontFamily:T.mono, fontSize:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', color:T.dim, padding:'3px 0' }}>
            <span>EP brutto</span><span style={{ color:T.ink }}>187,40 €/m³</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', color:T.dim, padding:'3px 0' }}>
            <span>GP</span><span style={{ color:T.ink }}>46.475,20 €</span></div>
          <div style={{ marginTop:6, height:4, background:T.grid }}>
            <div style={{ width:'62%', height:'100%', background:`linear-gradient(90deg,${T.blue},${T.cyan})` }}/>
          </div>
          <div style={{ marginTop:4, color:T.mute, fontSize:9, letterSpacing:.4 }}>62 % DES ABSCHNITTS</div>
        </div>

        {/* Docs */}
        <PanelHd k="04" label="Verknüpfte Dokumente" right={<span>3</span>}/>
        <div style={{ padding:'8px 14px', fontFamily:T.mono, fontSize:10, color:T.dim }}>
          {['Statik_AW_03.pdf', 'Plan_03.dwg', 'Bewehrung_AW.pdf'].map((d,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0' }}>
              <span style={{ display:'flex', gap:7, alignItems:'center' }}>
                <span style={{ width:14, height:18, border:`1px solid ${T.line2}`, display:'inline-block',
                  background:'repeating-linear-gradient(180deg,'+T.grid+' 0 2px,transparent 2px 4px)' }}/>
                <span style={{ color:T.ink }}>{d}</span>
              </span>
              <span style={{ color:T.mute }}>↗</span>
            </div>
          ))}
        </div>

        {/* Comments */}
        <PanelHd k="05" label="Kommentare" right={<span>2</span>}/>
        <div style={{ padding:'8px 14px 12px', fontFamily:T.mono, fontSize:10, color:T.dim }}>
          <div style={{ display:'flex', gap:8, padding:'4px 0' }}>
            <div style={{ width:18, height:18, borderRadius:9, background:T.blueS,
              border:`1px solid ${T.blue}`, color:T.blueD, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center' }}>MK</div>
            <div style={{ flex:1 }}>
              <div style={{ color:T.ink }}>WA-Beton fehlt in Position</div>
              <div style={{ fontSize:9, color:T.mute }}>M. Köhler · vor 2 Tagen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PF({ l, v }) {
  return (
    <div>
      <div style={{ fontSize:8, color:T.mute, letterSpacing:.5, textTransform:'uppercase' }}>{l}</div>
      <div style={{ color:T.ink, marginTop:1 }}>{v}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP BAR (medium density)
// ─────────────────────────────────────────────────────────────
function TopBar({ activeView='bubble', mode='single', breadcrumb }) {
  return (
    <div style={{ height:52, background:T.white, borderBottom:`1px solid ${T.line}`,
      display:'flex', alignItems:'stretch', flexShrink:0, position:'relative', zIndex:5 }}>
      {/* Logo */}
      <div style={{ padding:'0 16px', display:'flex', alignItems:'center', borderRight:`1px solid ${T.line}` }}>
        <BubbleLogo size={20}/>
      </div>
      {/* Project / breadcrumb */}
      <div style={{ padding:'0 14px', display:'flex', alignItems:'center', gap:8,
        borderRight:`1px solid ${T.line}`, color:T.dim, fontFamily:T.mono, fontSize:10 }}>
        {breadcrumb || (
          <>
            <span>HELLERWIESE</span>
            <span style={{ color:T.line2 }}>/</span>
            <span style={{ color:T.ink }}>LV_v3.7</span>
            <span style={{ color:T.line2 }}>▾</span>
          </>
        )}
      </div>
      {/* Search */}
      <div style={{ padding:'0 12px', display:'flex', alignItems:'center', gap:8, flex:'0 1 320px',
        borderRight:`1px solid ${T.line}` }}>
        <span style={{ color:T.mute, fontSize:12 }}>⌕</span>
        <span style={{ color:T.mute, fontFamily:T.mono, fontSize:10, flex:1 }}>Positionen, Codes, Beton…</span>
        <span style={{ color:T.mute, fontFamily:T.mono, fontSize:9, border:`1px solid ${T.line}`, padding:'1px 5px' }}>/</span>
      </div>
      {/* Filters */}
      <div style={{ padding:'0 12px', display:'flex', alignItems:'center', gap:6, flex:1, overflow:'hidden' }}>
        <span style={{ fontFamily:T.mono, fontSize:8, color:T.mute, letterSpacing:.6, marginRight:2 }}>FILTER</span>
        <Chip label="Status: geprüft" on/>
        <Chip label="Beton: C30/37" />
        <Chip label="XC1" />
        <Chip label="tragend" />
        <Chip label="+ Filter" dashed/>
      </div>
      {/* View toggle */}
      <div style={{ padding:'0 10px', display:'flex', alignItems:'center', gap:4,
        borderLeft:`1px solid ${T.line}` }}>
        {[
          ['bubble','◯','Bubble'],
          ['tree','⛢','Treemap'],
          ['sun','◐','Sunburst'],
          ['table','⛶','Tabelle'],
        ].map(([id,g,l])=>{
          const on = activeView===id;
          return (
            <div key={id} title={l} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
              color: on?T.blueD:T.dim, background: on?T.blueS:'transparent',
              border: on?`1px solid ${T.blue}`:`1px solid transparent`, fontFamily:T.mono, fontSize:13 }}>{g}</div>
          );
        })}
      </div>
      {/* Mode toggle: single / compare */}
      <div style={{ padding:'0 10px', display:'flex', alignItems:'center', gap:0,
        borderLeft:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', border:`1px solid ${T.line}` }}>
          <span style={{ padding:'4px 8px', fontFamily:T.mono, fontSize:9,
            color: mode==='single'?T.blueD:T.dim, background: mode==='single'?T.blueS:T.white,
            borderRight:`1px solid ${T.line}` }}>SOLO</span>
          <span style={{ padding:'4px 8px', fontFamily:T.mono, fontSize:9,
            color: mode==='compare'?T.blueD:T.dim, background: mode==='compare'?T.blueS:T.white }}>VERGLEICH</span>
        </div>
      </div>
      {/* Profile */}
      <div style={{ padding:'0 14px', display:'flex', alignItems:'center', gap:10,
        borderLeft:`1px solid ${T.line}` }}>
        <span style={{ fontSize:13, color:T.dim }}>⌕</span>
        <span style={{ fontSize:13, color:T.dim }}>⏻</span>
        <div style={{ width:26, height:26, borderRadius:'50%', background:T.blueS,
          border:`1px solid ${T.blue}`, color:T.blueD, fontFamily:T.mono, fontSize:9,
          display:'flex', alignItems:'center', justifyContent:'center' }}>JT</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FOOTER STATUS STRIP
// ─────────────────────────────────────────────────────────────
function FooterBar({ extra }) {
  return (
    <div style={{ height:28, background:T.white, borderTop:`1px solid ${T.line}`,
      display:'flex', alignItems:'center', padding:'0 12px', gap:16,
      fontFamily:T.mono, fontSize:9, color:T.mute, flexShrink:0, letterSpacing:.4 }}>
      <span><b style={{ color:T.ink, fontWeight:500 }}>72</b> POSITIONEN</span>
      <span><b style={{ color:T.ink, fontWeight:500 }}>7</b> ABSCHNITTE</span>
      <span><b style={{ color:T.ink, fontWeight:500 }}>2.214</b> M³</span>
      <span><b style={{ color:T.ink, fontWeight:500 }}>412.380</b> €</span>
      <span style={{ marginLeft:'auto' }}>{extra}</span>
      <span>SYNC · vor 12 s</span>
      <span style={{ color:T.greenD }}>● ONLINE</span>
    </div>
  );
}

Object.assign(window, { LeftTree, RightProps, TopBar, FooterBar, PF });
