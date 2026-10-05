// Kreispackung für die Gruppen im Graphen (docs/decisions/0035-graph-gliederung.md).
//
// Verfahren: Frontkette nach Wang et al. (2006), wie `packSiblings` in d3-hierarchy
// (ISC-Lizenz) — jeder neue Kreis legt sich an zwei benachbarte Kreise der
// Außenkette; schneidet er einen weiteren, rückt die Kette nach. Fast linear in der
// Praxis, damit auch einige hundert Abschnitte je Los ohne Wartezeit liegen. Eine
// eigene Umsetzung statt der Bibliothek, weil nur diese eine Funktion gebraucht wird.

export interface Circle {
  r: number;
  x: number;
  y: number;
}

interface ChainNode {
  c: Circle;
  next: ChainNode;
  prev: ChainNode;
}

/** Legt `c` außen an `a` und `b` an (beide berühren `c`). */
function place(b: Circle, a: Circle, c: Circle): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 === 0) {
    c.x = a.x + c.r;
    c.y = a.y;
    return;
  }
  const a2 = (a.r + c.r) ** 2;
  const b2 = (b.r + c.r) ** 2;
  if (a2 > b2) {
    const x = (d2 + b2 - a2) / (2 * d2);
    const y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
    c.x = b.x - x * dx - y * dy;
    c.y = b.y - x * dy + y * dx;
  } else {
    const x = (d2 + a2 - b2) / (2 * d2);
    const y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
    c.x = a.x + x * dx - y * dy;
    c.y = a.y + x * dy + y * dx;
  }
}

function intersects(a: Circle, b: Circle): boolean {
  const dr = a.r + b.r - 1e-6;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

/** Abstand² des gewichteten Mittelpunkts von `node` und seinem Nachfolger zum Ursprung. */
function score(node: ChainNode): number {
  const a = node.c;
  const b = node.next.c;
  const ab = a.r + b.r;
  const x = (a.x * b.r + b.x * a.r) / ab;
  const y = (a.y * b.r + b.y * a.r) / ab;
  return x * x + y * y;
}

function link(c: Circle): ChainNode {
  const node = { c } as ChainNode;
  node.next = node;
  node.prev = node;
  return node;
}

/**
 * Packt die Kreise dicht um den Ursprung (setzt `x`/`y`, ändert `r` nicht) und
 * liefert den Radius eines Kreises um den Ursprung, der alle umschließt. Die
 * Reihenfolge bestimmt die Lage: der erste Kreis liegt innen.
 */
export function packCircles(circles: readonly Circle[]): number {
  const n = circles.length;
  if (n === 0) return 0;
  const first = circles[0];
  first.x = 0;
  first.y = 0;
  if (n > 1) {
    const second = circles[1];
    first.x = -second.r;
    second.x = first.r;
    second.y = 0;
  }
  if (n > 2) {
    place(circles[1], circles[0], circles[2]);
    let a = link(circles[0]);
    let b = link(circles[1]);
    const c0 = link(circles[2]);
    a.next = c0.prev = b;
    b.next = a.prev = c0;
    c0.next = b.prev = a;

    pack: for (let i = 3; i < n; i++) {
      const circle = circles[i];
      place(a.c, b.c, circle);
      const c = link(circle);
      let j = b.next;
      let k = a.prev;
      let sj = b.c.r;
      let sk = a.c.r;
      do {
        if (sj <= sk) {
          if (intersects(j.c, c.c)) {
            b = j;
            a.next = b;
            b.prev = a;
            i--;
            continue pack;
          }
          sj += j.c.r;
          j = j.next;
        } else {
          if (intersects(k.c, c.c)) {
            a = k;
            a.next = b;
            b.prev = a;
            i--;
            continue pack;
          }
          sk += k.c.r;
          k = k.prev;
        }
      } while (j !== k.next);

      c.prev = a;
      c.next = b;
      a.next = c;
      b.prev = c;
      b = c;
      let best = score(a);
      let node = c.next;
      while (node !== b) {
        const s = score(node);
        if (s < best) {
          a = node;
          best = s;
        }
        node = node.next;
      }
      b = a.next;
    }
  }
  return recenter(circles);
}

/**
 * Schiebt die Packung so, dass die Mitte ihres Rahmens im Ursprung liegt, und
 * liefert den umschließenden Radius. Kein exakter kleinster Umkreis — der Rahmen
 * genügt, die Hülle hat ohnehin einen Rand.
 */
function recenter(circles: readonly Circle[]): number {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of circles) {
    x0 = Math.min(x0, c.x - c.r);
    x1 = Math.max(x1, c.x + c.r);
    y0 = Math.min(y0, c.y - c.r);
    y1 = Math.max(y1, c.y + c.r);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let radius = 0;
  for (const c of circles) {
    c.x -= cx;
    c.y -= cy;
    radius = Math.max(radius, Math.hypot(c.x, c.y) + c.r);
  }
  return radius;
}
