// wf-shell.jsx — shared blueprint-wireframe primitives for Bubble LV-Viewer
// Technical, light, monospace, thin lines. Blue accent.

const T = {
  paper: '#f5f7fa',
  panel: '#fbfcfd',
  white: '#ffffff',
  grid:  '#e4ecf4',
  grid2: '#d6e0ec',
  line:  '#c9d4e0',
  line2: '#a9bbcf',
  ink:   '#1a2533',
  dim:   '#6b7d92',
  mute:  '#97a6ba',
  blue:  '#2563eb',
  blueS: '#dbe7fd',
  blueD: '#1d4ed8',
  cyan:  '#0891b2',
  amber: '#d97706',
  amberS:'#fde8c4',
  greenS:'#cdebd8',
  greenD:'#0f8a4c',
  mono:  "'IBM Plex Mono', ui-monospace, monospace",
  sans:  "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
};

// Small annotated label like a blueprint callout: number + caption
function Anno({ n, label, x, y, w = 'auto', align = 'left' }) {
  return (
    <div style={{ position:'absolute', left:x, top:y, width:w, textAlign:align,
      fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.4, textTransform:'uppercase',
      display:'flex', alignItems:'center', gap:6, pointerEvents:'none' }}>
      <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:14, height:14, border:`1px solid ${T.line2}`, borderRadius:'50%',
        fontFamily:T.mono, fontSize:8, color:T.dim, background:T.white }}>{n}</span>
      <span>{label}</span>
    </div>
  );
}

// Logo mark: 3 connected bubbles (graph) + wordmark
function BubbleLogo({ size=18, color=T.blue, mono=false }) {
  const ink = mono ? T.ink : color;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:T.sans, color:T.ink }}>
      <svg width={size+8} height={size} viewBox="0 0 26 18" style={{ display:'block' }}>
        <line x1="5" y1="9" x2="14" y2="6" stroke={T.line2} strokeWidth="0.8"/>
        <line x1="14" y1="6" x2="21" y2="12" stroke={T.line2} strokeWidth="0.8"/>
        <line x1="5" y1="9" x2="14" y2="14" stroke={T.line2} strokeWidth="0.8"/>
        <circle cx="14" cy="6"  r="2.6" fill={ink}/>
        <circle cx="5"  cy="9"  r="3.6" fill="none" stroke={ink} strokeWidth="1.2"/>
        <circle cx="21" cy="12" r="2.0" fill="none" stroke={ink} strokeWidth="1.2"/>
      </svg>
      <span style={{ fontFamily:T.sans, fontWeight:700, fontSize: size-3, letterSpacing:-0.2, color:T.ink }}>bubble</span>
    </div>
  );
}

// Tiny status pill
function Status({ s }) {
  const map = {
    'geprüft': { bg:T.greenS, fg:T.greenD, dot:T.greenD },
    'offen':   { bg:T.amberS, fg:T.amber, dot:T.amber },
    'entwurf': { bg:'#eef2f7', fg:T.dim, dot:T.mute },
  };
  const c = map[s] || map['entwurf'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'1px 7px 1px 5px',
      border:`1px solid ${c.fg}33`, background:c.bg, color:c.fg,
      fontFamily:T.mono, fontSize:9, lineHeight:'14px', borderRadius:2 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }}/>
      {s}
    </span>
  );
}

// Chip — used in topbar filters / toggle groups
function Chip({ label, on=false, accent=false, icon, dashed=false }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
      border: dashed ? `1px dashed ${T.line2}` : `1px solid ${on?T.blue:T.line}`,
      background: on ? T.blueS : T.white,
      color: on ? T.blueD : T.dim,
      fontFamily:T.mono, fontSize:10, lineHeight:'14px', borderRadius:2, whiteSpace:'nowrap',
      ...(accent ? { borderColor:T.blue, color:T.blueD } : {})
    }}>
      {icon}{label}
    </span>
  );
}

// Section header inside a panel
function PanelHd({ k, label, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'9px 12px', borderBottom:`1px solid ${T.line}`, background:T.panel }}>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        {k!=null && <span style={{ fontFamily:T.mono, fontSize:9, color:T.mute, letterSpacing:.5 }}>§{k}</span>}
        <span style={{ fontFamily:T.sans, fontSize:11, fontWeight:600, color:T.ink, letterSpacing:-.1 }}>{label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:T.mute, fontFamily:T.mono, fontSize:9 }}>
        {right}
      </div>
    </div>
  );
}

// Drag handle / resize divider between panels
function VDivider() {
  return (
    <div style={{ width:5, background:T.paper, borderLeft:`1px solid ${T.line}`, borderRight:`1px solid ${T.line}`,
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'col-resize', flexShrink:0 }}>
      <div style={{ width:1, height:24, background:T.line2 }}/>
    </div>
  );
}

// Page frame: outer chrome at 1320×820 with optional blueprint grid
function Frame({ children, w=1320, h=820 }) {
  return (
    <div style={{ width:w, height:h, background:T.paper, position:'relative',
      fontFamily:T.mono, fontSize:11, color:T.ink, overflow:'hidden',
      backgroundImage:
        `linear-gradient(${T.grid} 1px, transparent 1px),
         linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
      backgroundSize:'24px 24px', backgroundPosition:'-1px -1px'
    }}>
      {children}
    </div>
  );
}

// Surface card with thin line border (no rounded corners — technical)
function Surface({ children, style }) {
  return (
    <div style={{ background:T.white, border:`1px solid ${T.line}`, ...style }}>
      {children}
    </div>
  );
}

// Tree row
function TreeRow({ depth=0, code, label, count, open, sel, leaf, status }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      padding:`4px 10px 4px ${10 + depth*14}px`,
      borderLeft: sel ? `2px solid ${T.blue}` : '2px solid transparent',
      background: sel ? T.blueS : 'transparent',
      fontFamily:T.mono, fontSize:11, color: sel ? T.blueD : T.ink, lineHeight:'18px', cursor:'pointer' }}>
      {!leaf
        ? <span style={{ width:10, color:T.mute, fontSize:9 }}>{open ? '▾' : '▸'}</span>
        : <span style={{ width:10, color:T.mute, fontSize:9 }}>·</span>}
      <span style={{ color:T.mute, fontSize:10, minWidth: leaf ? 44 : 22 }}>{code}</span>
      <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        fontWeight: !leaf?500:400 }}>{label}</span>
      {status && <span style={{ width:6, height:6, borderRadius:'50%',
        background: status==='geprüft'?T.greenD: status==='offen'?T.amber:T.mute }}/>}
      {count!=null && <span style={{ color:T.mute, fontSize:9, fontFamily:T.mono }}>{count}</span>}
    </div>
  );
}

// ------------------------------------------------------------------
// SVG view modes (purely indicative — wireframe placeholders)
// ------------------------------------------------------------------

function BubbleView({ w, h }) {
  // section bubbles in a soft layout
  const nodes = [
    { x:.30, y:.45, r:78, code:'02', label:'Bodenplatte', n:14, st:'geprüft' },
    { x:.55, y:.32, r:92, code:'03', label:'Außenwände', n:21, st:'offen' },
    { x:.74, y:.55, r:64, code:'05', label:'Decken',     n:9,  st:'geprüft' },
    { x:.42, y:.72, r:46, code:'01', label:'Erdarbeiten',n:6,  st:'geprüft' },
    { x:.78, y:.78, r:38, code:'04', label:'Stützen',    n:4,  st:'offen' },
    { x:.18, y:.70, r:30, code:'06', label:'Treppen',    n:3,  st:'entwurf' },
    { x:.66, y:.82, r:24, code:'07', label:'Dach',       n:2,  st:'entwurf' },
  ];
  return (
    <svg width={w} height={h} style={{ display:'block' }}>
      <defs>
        <pattern id="dot" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill={T.grid2}/>
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#dot)" />
      {/* connector lines */}
      {nodes.map((a,i)=> nodes.slice(i+1).map((b,j)=>{
        if(Math.abs(i-(i+j+1))>2) return null;
        return <line key={i+'-'+j} x1={a.x*w} y1={a.y*h} x2={b.x*w} y2={b.y*h}
          stroke={T.line} strokeWidth="0.8" strokeDasharray="2 3" />;
      }))}
      {nodes.map((n,i)=>{
        const fill = n.st==='geprüft'? T.blueS : n.st==='offen'? '#fff4dc' : '#f1f4f8';
        const stroke = n.st==='geprüft'? T.blue : n.st==='offen'? T.amber : T.mute;
        return (
          <g key={i} transform={`translate(${n.x*w},${n.y*h})`}>
            <circle r={n.r} fill={fill} stroke={stroke} strokeWidth="1.2"/>
            <text textAnchor="middle" y={-4} fontFamily={T.mono} fontSize="10" fill={T.mute}>{n.code}</text>
            <text textAnchor="middle" y={10} fontFamily={T.sans} fontSize="13" fontWeight="600" fill={T.ink}>{n.label}</text>
            <text textAnchor="middle" y={26} fontFamily={T.mono} fontSize="9" fill={T.dim}>{n.n} Pos.</text>
          </g>
        );
      })}
    </svg>
  );
}

function TreemapView({ w, h }) {
  // Pre-calculated treemap-ish rectangles (volume weighted)
  const cells = [
    { x:0, y:0, w:.45, h:.62, code:'03', label:'Außenwände', n:21, st:'offen' },
    { x:.45, y:0, w:.32, h:.40, code:'02', label:'Bodenplatte', n:14, st:'geprüft' },
    { x:.77, y:0, w:.23, h:.40, code:'05', label:'Decken', n:9, st:'geprüft' },
    { x:.45, y:.40, w:.31, h:.30, code:'04', label:'Stützen', n:4, st:'offen' },
    { x:.76, y:.40, w:.24, h:.30, code:'01', label:'Erdarbeiten', n:6, st:'geprüft' },
    { x:0, y:.62, w:.30, h:.38, code:'06', label:'Treppen', n:3, st:'entwurf' },
    { x:.30, y:.62, w:.28, h:.38, code:'07', label:'Dach', n:2, st:'entwurf' },
    { x:.58, y:.70, w:.42, h:.30, code:'08', label:'Sonstiges', n:5, st:'offen' },
  ];
  return (
    <svg width={w} height={h} style={{ display:'block', background:T.white }}>
      {cells.map((c,i)=>{
        const fill = c.st==='geprüft'? T.blueS : c.st==='offen'? '#fff4dc' : '#f1f4f8';
        const stroke = c.st==='geprüft'? T.blue : c.st==='offen'? T.amber : T.mute;
        const px = c.x*w, py=c.y*h, pw=c.w*w-2, ph=c.h*h-2;
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height={ph} fill={fill} stroke={stroke} strokeWidth="1"/>
            <text x={px+10} y={py+18} fontFamily={T.mono} fontSize="10" fill={T.mute}>{c.code}</text>
            <text x={px+10} y={py+36} fontFamily={T.sans} fontSize="14" fontWeight="600" fill={T.ink}>{c.label}</text>
            <text x={px+10} y={py+52} fontFamily={T.mono} fontSize="9" fill={T.dim}>{c.n} Positionen</text>
          </g>
        );
      })}
    </svg>
  );
}

function SunburstView({ w, h }) {
  const cx = w/2, cy=h/2, r1=70, r2=130, r3=190;
  const segs = [
    { a:0,   b:60,  l:'01', fill:T.blueS, stroke:T.blue },
    { a:60,  b:170, l:'02', fill:T.blueS, stroke:T.blue },
    { a:170, b:260, l:'03', fill:'#fff4dc', stroke:T.amber },
    { a:260, b:320, l:'04', fill:'#fff4dc', stroke:T.amber },
    { a:320, b:360, l:'05', fill:T.blueS, stroke:T.blue },
  ];
  const arc = (a,b,r0,r1)=>{
    const A=(x)=>(x-90)*Math.PI/180;
    const x0=cx+r0*Math.cos(A(a)), y0=cy+r0*Math.sin(A(a));
    const x1=cx+r1*Math.cos(A(a)), y1=cy+r1*Math.sin(A(a));
    const x2=cx+r1*Math.cos(A(b)), y2=cy+r1*Math.sin(A(b));
    const x3=cx+r0*Math.cos(A(b)), y3=cy+r0*Math.sin(A(b));
    const big = b-a>180?1:0;
    return `M${x0},${y0} L${x1},${y1} A${r1},${r1} 0 ${big} 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 ${big} 0 ${x0},${y0} Z`;
  };
  // inner positions within each section (just a quick fan)
  const inner=[];
  segs.forEach(s=>{
    const span=s.b-s.a, n=3+Math.floor(span/40);
    for(let i=0;i<n;i++){
      const a=s.a+i*span/n, b=s.a+(i+1)*span/n-1;
      inner.push({a,b,r0:r2,r1:r3,fill:'#fff',stroke:s.stroke});
    }
  });
  return (
    <svg width={w} height={h} style={{ display:'block', background:T.white }}>
      <circle cx={cx} cy={cy} r={r1} fill={T.panel} stroke={T.line}/>
      <text x={cx} y={cy-4} textAnchor="middle" fontFamily={T.sans} fontSize="13" fontWeight="700" fill={T.ink}>LV</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontFamily={T.mono} fontSize="9" fill={T.dim}>72 Pos.</text>
      {segs.map((s,i)=>(
        <g key={i}>
          <path d={arc(s.a,s.b,r1,r2)} fill={s.fill} stroke={s.stroke} strokeWidth="1"/>
          <text x={cx + ((r1+r2)/2)*Math.cos((((s.a+s.b)/2)-90)*Math.PI/180)}
                y={cy + ((r1+r2)/2)*Math.sin((((s.a+s.b)/2)-90)*Math.PI/180)+4}
                textAnchor="middle" fontFamily={T.mono} fontSize="11" fontWeight="600" fill={T.ink}>{s.l}</text>
        </g>
      ))}
      {inner.map((s,i)=>(
        <path key={i} d={arc(s.a,s.b,s.r0,s.r1)} fill={s.fill} stroke={s.stroke} strokeWidth="0.8"/>
      ))}
    </svg>
  );
}

function TableView({ w, h, dense=false }) {
  const rows = [
    ['02.010', 'Bodenplatte C30/37 d=30cm', 'C30/37', 'XC2,XD1', 'm³', '420', 'geprüft'],
    ['02.020', 'Sauberkeitsschicht C12/15', 'C12/15', '—', 'm³', '42', 'geprüft'],
    ['02.030', 'Zulage Körnung 0/16', 'C30/37', '—', 'm³', '42', 'offen'],
    ['03.010', 'Außenwand C30/37 tragend', 'C30/37', 'XC1', 'm³', '248', 'geprüft'],
    ['03.020', 'Außenwand nichttragend', 'C30/37', 'XC1', 'm³', '134', 'offen'],
    ['03.030', 'Außenwand SB2 C30/37', 'C30/37', 'XC1,XC3', 'm³', '96', 'offen'],
    ['04.010', 'Wände EG–3.OG C30/37', 'C30/37', 'XC1', 'm³', '312', 'geprüft'],
    ['04.020', 'Wände/Brüstungen HS-Zement', 'C30/37', 'XC3,XD1', 'm³', '178', 'entwurf'],
    ['04.030', 'Stahlbetonstützen C35/45', 'C35/45', 'XC1,XC3', 'm³', '44', 'geprüft'],
    ['05.010', 'Decke EG C30/37 d=22cm', 'C30/37', 'XC1', 'm³', '380', 'geprüft'],
    ['05.020', 'Decke OG C30/37 d=20cm', 'C30/37', 'XC1', 'm³', '360', 'geprüft'],
    ['06.010', 'Treppe EG → 1.OG', 'C30/37', 'XC1', 'St', '4', 'entwurf'],
  ];
  const cols = ['Code', 'Bezeichnung', 'Beton', 'Exposition', 'Einheit', 'Menge', 'Status'];
  const widths = ['10%','40%','11%','13%','7%','9%','10%'];
  return (
    <div style={{ width:w, height:h, background:T.white, overflow:'hidden', fontFamily:T.mono, fontSize:11 }}>
      <div style={{ display:'flex', borderBottom:`1px solid ${T.line2}`, background:T.panel,
        position:'sticky', top:0, fontSize:9, letterSpacing:.6, textTransform:'uppercase', color:T.dim }}>
        {cols.map((c,i)=>(
          <div key={i} style={{ flex:`0 0 ${widths[i]}`, padding:'9px 10px', borderRight:`1px solid ${T.line}` }}>{c} ▾</div>
        ))}
      </div>
      {rows.map((r,i)=>(
        <div key={i} style={{ display:'flex', borderBottom:`1px solid ${T.grid2}`,
          background: i%2? T.panel : T.white,
          ...(i===3 ? { background: T.blueS } : {}) }}>
          {r.map((cell,j)=>(
            <div key={j} style={{ flex:`0 0 ${widths[j]}`, padding: dense?'6px 10px':'9px 10px',
              borderRight:`1px solid ${T.grid2}`, color: j===0?T.dim: j===1?T.ink:T.dim,
              fontWeight: j===0?500: j===1?500:400,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {j===6 ? <Status s={cell}/> : cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { T, Anno, BubbleLogo, Status, Chip, PanelHd, VDivider, Frame, Surface,
  TreeRow, BubbleView, TreemapView, SunburstView, TableView });
