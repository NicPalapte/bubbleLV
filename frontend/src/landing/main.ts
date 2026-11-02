// Startseite conocto.app (Entscheidung 0091): Wechselzeile unter dem Logo und die
// 24-s-Animation „Was Conocto kann" in vier Szenen. Bewusst ohne React und ohne
// App-Code: die Seite soll sofort stehen und nur Schriften + dieses Skript laden.
// Drehbuch und Bildaufbau: Mockup „Bubble Startseite" (Nico, 2026-11-02).
//
// Gerendert wird deklarativ: `render(t)` setzt für einen Zeitpunkt t (Sekunden)
// jede Klasse; eine rAF-Uhr schiebt t weiter. Springen, Pause und „Bewegung
// reduzieren" ändern nur t bzw. die Uhr, nie den Ablauf selbst.

import '@conocto/design/fonts';
import '@conocto/design/tokens.css';
import './landing.css';

const NS = 'http://www.w3.org/2000/svg';
const SCENE = 6;
const TOTAL = 24;
const GRAPH_SHIFT = 110;
/** Standbild einer Szene: kurz vor ihrem Ende ist alles sichtbar. */
const REST = 5.9;
const COMMENT = 'Bewehrung mit Statik klären';

function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`Startseite: #${id} fehlt`);
  return el as unknown as T;
}

const tog = (el: Element, cls: string, on: boolean): void => {
  el.classList.toggle(cls, on);
};

interface Section {
  name: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  /** Einheit je Position, in OZ-Reihenfolge. */
  units: string[];
  label: 'above' | 'right';
}

interface Dot {
  si: number;
  k: number;
  unit: string;
  gx: number;
  gy: number;
  mx: number;
  my: number;
  r: number;
  el: SVGCircleElement;
}

// Beispieldaten erfunden (Rohbau, ohne Preise) — keine echte Datei.
const SECTIONS: Section[] = [
  {
    name: '01 Erdarbeiten',
    cx: 130,
    cy: 165,
    r: 55,
    color: 'var(--dot-2)',
    units: ['m²', 'm³', 'm³', 'm³', 'm³', 'm³', 'm²', 'm²', 'St', 'St'],
    label: 'above',
  },
  {
    name: '02 Beton- und Stahlbeton',
    cx: 288,
    cy: 135,
    r: 72,
    color: 'var(--dot-1)',
    units: [
      'm³',
      'm³',
      'm³',
      't',
      'm²',
      'm³',
      'm³',
      'm³',
      'm²',
      'm²',
      'm²',
      'm²',
      't',
      'St',
      'St',
      'St',
    ],
    label: 'above',
  },
  {
    name: '03 Mauerwerk',
    cx: 280,
    cy: 252,
    r: 38,
    color: 'var(--dot-6)',
    units: ['m²', 'm²', 'm²', 'm²', 'm²', 'm²', 'm³', 'St', 'St', 'St'],
    label: 'right',
  },
];
const COLS = ['m³', 'm²', 't', 'St'];
const COL_X = [290, 402, 514, 626];
const ROW_Y = [136, 196, 256];

const TABLE_ROWS: (readonly string[])[] = [
  ['sec', '01 Erdarbeiten'],
  ['01.0010', 'Oberboden abtragen', '1.250', 'm²'],
  ['01.0020', 'Baugrube ausheben, BK 3–5', '2.840', 'm³'],
  ['01.0030', 'Boden verfüllen, verdichten', '960', 'm³', 'A'],
  ['sec', '02 Beton- und Stahlbeton'],
  ['02.0010', 'Sauberkeitsschicht C12/15', '85', 'm³'],
  ['02.0020', 'Bodenplatte C30/37, d = 30 cm', '312', 'm³'],
  ['02.0030', 'Ortbeton Wand C30/37', '267', 'm³', 'S'],
  ['02.0040', 'Betonstahl B500B', '48', 't'],
];
// Mittelpunkt der Zeile „02.0030" in Bühnen-Koordinaten: Fenster-Oberkante 44,
// Kopf 26, Spaltenkopf 19, 6 Zeilen à 23 + 2 Abschnittszeilen à 17.
const ROW_S_Y = 44 + 26 + 19 + 2 * 17 + 5 * 23 + 11.5;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function startStage(): void {
  const groups = byId<SVGGElement>('groups');
  const dotG = byId<SVGGElement>('dots');
  const mx = byId<SVGGElement>('mx');

  // Graph: Abschnitts-Kreise mit Beschriftung, Punkte als Spirale darin.
  const sectionEls = SECTIONS.map((s) => {
    const circle = svg('circle', { class: 'grp-c', cx: s.cx, cy: s.cy, r: s.r });
    const text =
      s.label === 'above'
        ? svg('text', { class: 'grp-l', x: s.cx, y: s.cy - s.r - 7, 'text-anchor': 'middle' })
        : svg('text', { class: 'grp-l', x: s.cx + s.r + 8, y: s.cy + 3 });
    text.append(`${s.name} `);
    const count = svg('tspan', { class: 'n' });
    count.textContent = `· ${s.units.length}`;
    text.append(count);
    groups.append(circle, text);
    return [circle, text];
  });

  const dots: Dot[] = [];
  SECTIONS.forEach((s, si) => {
    const n = s.units.length;
    s.units.forEach((unit, k) => {
      const rr = s.r * 0.76 * Math.sqrt((k + 0.5) / n);
      const a = k * 2.39996 + si;
      const r = 3 + ((k * 37 + si * 11) % 5) * 0.9;
      const el = svg('circle', { class: 'dot', r });
      el.style.fill = s.color;
      el.style.transitionDelay = `${(dots.length % 12) * 18}ms, 0ms`;
      dotG.append(el);
      dots.push({
        si,
        k,
        unit,
        gx: s.cx + rr * Math.cos(a),
        gy: s.cy + rr * Math.sin(a),
        mx: 0,
        my: 0,
        r,
        el,
      });
    });
  });

  // Matrix: Plätze je Zelle (Abschnitt × Einheit), max. 5 Punkte je Reihe.
  SECTIONS.forEach((_, si) =>
    COLS.forEach((u, ci) => {
      const cell = dots.filter((d) => d.si === si && d.unit === u);
      const rows = Math.ceil(cell.length / 5);
      cell.forEach((d, j) => {
        const row = Math.floor(j / 5);
        const m = Math.min(5, cell.length - row * 5);
        d.mx = COL_X[ci] + ((j % 5) - (m - 1) / 2) * 14;
        d.my = ROW_Y[si] + 4 + (row - (rows - 1) / 2) * 14;
      });
    }),
  );
  const find = (si: number, k: number): Dot => {
    const dot = dots.find((d) => d.si === si && d.k === k);
    if (dot === undefined) throw new Error('Startseite: Punkt fehlt');
    return dot;
  };
  const dotA = find(0, 2); // 01.0030
  const dotSel = find(1, 2); // 02.0030 Ortbeton Wand

  const text = (
    cls: string,
    x: number,
    y: number,
    txt: string,
    anchor?: string,
  ): SVGTextElement => {
    const t = svg('text', { class: cls, x, y });
    if (anchor !== undefined) t.setAttribute('text-anchor', anchor);
    t.textContent = txt;
    mx.append(t);
    return t;
  };
  text('mx-ax', 228, 92, 'ABSCHNITT ↓', 'end');
  text('mx-ax', 240, 92, 'EINHEIT →');
  COLS.forEach((u, ci) => text('mx-col', COL_X[ci], 104, u, 'middle'));
  const counts: SVGTextElement[] = [];
  let hot: SVGRectElement | null = null;
  SECTIONS.forEach((s, si) => {
    text('mx-row', 228, ROW_Y[si] + 4, s.name, 'end');
    COLS.forEach((u, ci) => {
      const n = s.units.filter((x) => x === u).length;
      const cell = svg('rect', {
        class: 'mx-cell',
        x: COL_X[ci] - 52,
        y: ROW_Y[si] - 26,
        width: 104,
        height: 52,
        rx: 8,
      });
      cell.style.fill = n > 0 ? `var(--heat-${Math.min(5, n)})` : 'var(--sunken)';
      mx.insertBefore(cell, mx.firstChild);
      if (si === 1 && ci === 0) hot = cell;
      counts.push(text('mx-n', COL_X[ci] + 46, ROW_Y[si] - 14, n > 0 ? String(n) : '–', 'end'));
    });
  });

  // Tabelle
  const tbody = byId<HTMLTableSectionElement>('tbody');
  let rowA: HTMLTableRowElement | null = null;
  let rowS: HTMLTableRowElement | null = null;
  for (const r of TABLE_ROWS) {
    const tr = document.createElement('tr');
    const cell = (content: string, cls?: string): void => {
      const td = document.createElement('td');
      if (cls !== undefined) td.className = cls;
      td.textContent = content;
      tr.append(td);
    };
    if (r[0] === 'sec') {
      tr.className = 'sec';
      cell(r[1]);
      tr.cells[0].colSpan = 4;
    } else {
      cell(r[0]);
      cell(r[1], 'k');
      cell(r[2], 'r');
      cell(r[3]);
    }
    if (r[4] === 'A') rowA = tr;
    if (r[4] === 'S') rowS = tr;
    tbody.append(tr);
  }

  const pinLine = byId<SVGLineElement>('pinline');
  pinLine.setAttribute('x1', String(dotSel.gx));
  pinLine.setAttribute('y1', String(dotSel.gy));
  const ring = byId<SVGCircleElement>('ring');
  const ringA = byId<SVGCircleElement>('ringA');
  ringA.setAttribute('cx', String(dotSel.gx));
  ringA.setAttribute('cy', String(dotSel.gy));
  ringA.setAttribute('r', String(dotSel.r + 3.5));

  const els = {
    graph: byId<SVGGElement>('graph'),
    fn: byId('fn'),
    kpi: byId('kpi'),
    drop: byId('drop'),
    file: byId('file'),
    local: byId('local'),
    tbl: byId('tbl'),
    card: byId('card'),
    chip: byId('chip'),
    pin: byId('pin'),
    cur: byId('cur'),
    mk: byId('mk'),
    mkT: byId('mk-t'),
    cm: byId('cm'),
    cmT: byId('cm-t'),
    kPos: byId('k-pos'),
    kAbs: byId('k-abs'),
    kHw: byId('k-hw'),
    hN1: byId('h-n1'),
    hN2: byId('h-n2'),
    hM: byId('h-m'),
    hF: byId('h-f'),
    hO: byId('h-o'),
    cN: byId('c-n'),
    cM: byId('c-m'),
    cF: byId('c-f'),
    cO: byId('c-o'),
  };
  const steps = [...document.querySelectorAll<HTMLButtonElement>('.step')];
  const de = (n: number): string => n.toLocaleString('de-DE');

  function render(t: number): void {
    const sc = Math.floor(t / SCENE) % 4;
    const lt = t - sc * SCENE;
    const loaded = sc > 0 || lt >= 1.6;

    // Szene 1: Datei fliegt in die Ablage, Kennzahlen zählen hoch.
    tog(els.drop, 'hide', !(sc === 0 && lt < 1.7));
    tog(els.file, 'in', sc === 0 && lt >= 0.6 && lt < 1.6);
    tog(els.file, 'gone', sc === 0 && lt >= 1.6);
    tog(els.fn, 'hide', !loaded);
    tog(els.kpi, 'hide', !(sc > 0 || lt >= 1.8));
    const p = sc > 0 ? 1 : Math.max(0, Math.min(1, (lt - 1.8) / 0.8));
    els.kPos.textContent = de(Math.round(36 * p));
    els.kAbs.textContent = de(Math.round(3 * p));
    els.kHw.textContent = de(Math.round(3 * p));
    tog(els.local, 'hide', !(sc === 0 && lt >= 3.0));

    // Graph
    els.graph.style.transform = `translate(${sc === 0 ? GRAPH_SHIFT : 0}px, 0px)`;
    const groupsOn = (sc === 0 && lt >= 1.9) || sc === 1 || sc === 2;
    sectionEls.forEach((pair) => pair.forEach((e) => tog(e, 'hide', !groupsOn)));
    const inMatrix = sc === 3 && lt >= 0.6;
    const filterOn = sc === 2 && lt >= 2.4;
    dots.forEach((d, i) => {
      const visible = sc > 0 || lt >= 2.0 + i * 0.025;
      const scale = inMatrix ? Math.min(1, 5.5 / d.r) : 1;
      d.el.style.transform = inMatrix
        ? `translate(${d.mx}px, ${d.my}px) scale(${scale})`
        : `translate(${d.gx}px, ${d.gy}px)`;
      tog(d.el, 'hide', !visible);
      tog(d.el, 'dim', filterOn && d.unit !== 'm³');
    });

    // Szene 2: eine Auswahl für Graph und Tabelle.
    let selDot: Dot | null = null;
    if (sc === 1 && lt >= 1.2) selDot = lt >= 3.2 ? dotSel : dotA;
    if (sc === 2) selDot = dotSel;
    if (selDot !== null) {
      ring.style.transform = `translate(${selDot.gx}px, ${selDot.gy}px)`;
      ring.setAttribute('r', String(selDot.r + 5));
    }
    tog(ring, 'hide', selDot === null);
    if (rowA !== null) tog(rowA, 'sel', sc === 1 && lt >= 1.2 && lt < 3.2);
    if (rowS !== null) tog(rowS, 'sel', sc === 1 && lt >= 3.2);

    // Zeiger (Koordinaten der Bühne 760 × 300 in Prozent)
    let cur: [number, number] | null = null;
    if (sc === 1 && lt >= 0.3 && lt < 4.4) cur = lt < 2.2 ? [dotA.gx, dotA.gy] : [560, ROW_S_Y];
    const [cx, cy] = cur ?? [600, 250];
    els.cur.style.left = `${cx / 7.6}%`;
    els.cur.style.top = `${cy / 3}%`;
    tog(els.cur, 'hide', cur === null);
    tog(els.cur, 'click', sc === 1 && ((lt >= 1.2 && lt < 1.7) || (lt >= 3.2 && lt < 3.7)));

    // Fenster
    tog(els.tbl, 'hide', sc !== 1);
    tog(els.card, 'hide', sc !== 2);

    // Szene 3: Hervorheben, Filtern, Prüfen, Marker und Kommentar.
    const on = (at: number): boolean => sc === 2 && lt >= at;
    tog(els.hN1, 'on', on(0.8));
    tog(els.hN2, 'on', on(0.8));
    tog(els.cN, 'hide', !on(0.8));
    tog(els.hM, 'on', on(1.3));
    tog(els.cM, 'hide', !on(1.3));
    tog(els.hF, 'on', on(1.8));
    tog(els.cF, 'hide', !on(1.8));
    tog(els.chip, 'hide', !filterOn);
    const pinOn = on(3.2);
    tog(els.pin, 'hide', !pinOn);
    tog(pinLine, 'hide', !pinOn);
    tog(ringA, 'hide', !pinOn);
    tog(els.hO, 'on', pinOn);
    tog(els.cO, 'hide', !pinOn);
    tog(els.mk, 'on', on(4.0));
    els.mkT.textContent = on(4.0) ? '⚑ Wichtig' : '⚑ Markieren';
    const chars =
      sc === 2
        ? Math.max(0, Math.min(COMMENT.length, Math.floor(((lt - 4.4) / 1.1) * COMMENT.length)))
        : 0;
    els.cmT.textContent = COMMENT.slice(0, chars);
    tog(els.cm, 'hide', !on(4.3));

    // Szene 4: Matrix
    tog(mx, 'hide', !(sc === 3 && lt >= 1.0));
    counts.forEach((c) => tog(c, 'hide', !(sc === 3 && lt >= 1.8)));
    if (hot !== null) tog(hot, 'hot', sc === 3 && lt >= 2.4);

    // Reiter mit Fortschrittsbalken
    steps.forEach((b, i) => {
      b.setAttribute('aria-current', i === sc ? 'true' : 'false');
      const bar = b.querySelector<HTMLElement>('.bar-p');
      if (bar !== null) bar.style.width = i === sc ? `${(lt / SCENE) * 100}%` : '0';
    });
  }

  // Uhr. Bei „Bewegung reduzieren" steht jede Szene als Standbild, Wechsel nur über die Reiter.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseBtn = byId<HTMLButtonElement>('pause');
  let t = 0;
  let last = performance.now();
  let hover = false;
  let stopped = false;
  const setStopped = (value: boolean): void => {
    stopped = value;
    pauseBtn.textContent = value ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', value ? 'Animation abspielen' : 'Animation anhalten');
  };
  if (reduce.matches) {
    t = REST;
    setStopped(true);
  }
  const stage = byId('stage');
  // Außerhalb des Bildschirms ruht die Bühne: kein Zeitfortschritt, kein Rendern.
  let onScreen = true;
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
    }).observe(stage);
  }
  let lastT = -1;
  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (onScreen) {
      if (!hover && !stopped) t = (t + dt) % TOTAL;
      if (t !== lastT) render(t);
      lastT = t;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  stage.addEventListener('mouseenter', () => {
    hover = true;
  });
  stage.addEventListener('mouseleave', () => {
    hover = false;
  });
  pauseBtn.addEventListener('click', () => setStopped(!stopped));
  steps.forEach((b) =>
    b.addEventListener('click', () => {
      t = Number(b.dataset.i) * SCENE + (stopped || reduce.matches ? REST : 0);
    }),
  );
}

/** Wechselzeile unter dem Logo: alle 3 s kippt die Zeile nach oben weg, die nächste kommt. */
function startRotator(): void {
  const lines = [...document.querySelectorAll<HTMLElement>('#rot span')];
  // Bei „Bewegung reduzieren" bleibt die erste Zeile stehen.
  if (lines.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let index = 0;
  window.setInterval(() => {
    const current = lines[index];
    const next = lines[(index + 1) % lines.length];
    current.classList.remove('on');
    current.classList.add('out');
    next.classList.remove('out');
    // Neue Zeile erst unten parken, dann hochdrehen.
    next.style.transition = 'none';
    next.style.transform = 'rotateX(-90deg)';
    void next.offsetWidth;
    next.style.transition = '';
    next.style.transform = '';
    next.classList.add('on');
    index = (index + 1) % lines.length;
    window.setTimeout(() => current.classList.remove('out'), 700);
  }, 3000);
}

startStage();
startRotator();
