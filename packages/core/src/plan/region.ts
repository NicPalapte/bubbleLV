// Fläche per Antippen finden (Entscheidung 0095): Von einem Punkt aus füllen, bis dunkle
// Linien kommen, und den Rand als Polygon zurückgeben. Arbeitet auf einem Bild (Maske),
// darum für Vektor- und eingescannte Pläne gleich. Reine Rechnung, kein PDF, kein DOM.

import type { PlanPoint } from './measure';

/** Schwarz-Weiß-Bild: 1 = Linie, 0 = frei. Zeilenweise, `width × height`. */
export interface LineMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface FoundRegion {
  /** Rand in Bildpunkten (Mitte der Randpunkte), vereinfacht. */
  readonly polygon: PlanPoint[];
  /** Gefüllte Bildpunkte. */
  readonly pixels: number;
  /** Die Füllung erreicht den Bildrand: keine geschlossene Fläche im Ausschnitt. */
  readonly open: boolean;
}

/** Hell genug, um als frei zu gelten (0–255); Linien in Farbe sind meist dunkler. */
const LIGHT = 170;

/** Bildpunkte (RGBA, wie `ImageData.data`) zu einer Linienmaske. */
export function maskFromRgba(width: number, height: number, rgba: ArrayLike<number>): LineMask {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 1) {
    const at = i * 4;
    if (rgba[at + 3] < 128) continue;
    const light = 0.299 * rgba[at] + 0.587 * rgba[at + 1] + 0.114 * rgba[at + 2];
    if (light < LIGHT) data[i] = 1;
  }
  return { width, height, data };
}

/** Linien um `radius` Bildpunkte verdicken: schließt Haarrisse zwischen Strichen. */
export function thicken(mask: LineMask, radius: number): LineMask {
  if (radius <= 0) return mask;
  const { width, height } = mask;
  // Erst waagerecht, dann senkrecht: ein Quadrat statt eines Kreises, schnell genug.
  const row = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    let last = -Infinity;
    for (let x = 0; x < width; x += 1) {
      if (mask.data[y * width + x] === 1) last = x;
      if (x - last <= radius) row[y * width + x] = 1;
    }
    last = Infinity;
    for (let x = width - 1; x >= 0; x -= 1) {
      if (mask.data[y * width + x] === 1) last = x;
      if (last - x <= radius) row[y * width + x] = 1;
    }
  }
  const out = new Uint8Array(width * height);
  for (let x = 0; x < width; x += 1) {
    let last = -Infinity;
    for (let y = 0; y < height; y += 1) {
      if (row[y * width + x] === 1) last = y;
      if (y - last <= radius) out[y * width + x] = 1;
    }
    last = Infinity;
    for (let y = height - 1; y >= 0; y -= 1) {
      if (row[y * width + x] === 1) last = y;
      if (last - y <= radius) out[y * width + x] = 1;
    }
  }
  return { width, height, data: out };
}

/**
 * Von (`x`, `y`) aus füllen und den äußeren Rand nachfahren. `null`, wenn der Punkt auf
 * einer Linie liegt. Löcher (Text, Stützen im Raum) bleiben unbeachtet: es zählt der Rand.
 */
export function findRegion(
  mask: LineMask,
  x: number,
  y: number,
  tolerance = 1.5,
): FoundRegion | null {
  const { width, height, data } = mask;
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height || data[sy * width + sx] === 1) {
    return null;
  }
  const filled = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;
  stack[top++] = sy * width + sx;
  filled[sy * width + sx] = 1;
  let pixels = 0;
  let open = false;
  while (top > 0) {
    const at = stack[--top];
    pixels += 1;
    const px = at % width;
    const py = (at - px) / width;
    if (px === 0 || py === 0 || px === width - 1 || py === height - 1) open = true;
    const near = [
      px > 0 ? at - 1 : -1,
      px < width - 1 ? at + 1 : -1,
      py > 0 ? at - width : -1,
      py < height - 1 ? at + width : -1,
    ];
    for (const next of near) {
      if (next < 0 || filled[next] === 1 || data[next] === 1) continue;
      filled[next] = 1;
      stack[top++] = next;
    }
  }
  const outline = traceOutline(filled, width, height);
  return { polygon: simplify(outline, tolerance), pixels, open };
}

/** Äußerer Rand der gefüllten Fläche (Moore-Nachbarschaft), im Uhrzeigersinn. */
function traceOutline(filled: Uint8Array, width: number, height: number): PlanPoint[] {
  let start = -1;
  for (let i = 0; i < filled.length; i += 1) {
    if (filled[i] === 1) {
      start = i;
      break;
    }
  }
  if (start < 0) return [];
  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && filled[y * width + x] === 1;
  // Nachbarn im Uhrzeigersinn, beginnend links.
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];
  const x0 = start % width;
  const y0 = (start - x0) / width;
  const out: PlanPoint[] = [];
  let x = x0;
  let y = y0;
  // Der Startpunkt ist der erste von oben links: links von ihm ist frei. Gesucht wird im
  // Uhrzeigersinn ab dem Nachbarn, von dem wir kamen (radiale Suche).
  let from = 0;
  let firstDir = -1;
  const limit = filled.length * 4;
  for (let step = 0; step < limit; step += 1) {
    let found = -1;
    for (let k = 1; k <= 8; k += 1) {
      const dir = (from + k) % 8;
      if (inside(x + dirs[dir][0], y + dirs[dir][1])) {
        found = dir;
        break;
      }
    }
    if (found < 0) return [[x0 + 0.5, y0 + 0.5]]; // einzelner Bildpunkt
    // Wieder am Start und gleicher erster Schritt: einmal herum (Kriterium nach Jacob).
    if (x === x0 && y === y0) {
      if (firstDir === found) break;
      if (firstDir < 0) firstDir = found;
    }
    out.push([x + 0.5, y + 0.5]);
    x += dirs[found][0];
    y += dirs[found][1];
    from = (found + 4) % 8;
  }
  return out;
}

/** Douglas-Peucker für einen geschlossenen Linienzug. */
export function simplify(points: readonly PlanPoint[], tolerance: number): PlanPoint[] {
  if (points.length < 4) return [...points];
  // Am weitesten vom Start entfernten Punkt als zweiten Anker nehmen, dann beide Hälften.
  const [ax, ay] = points[0];
  let far = 0;
  let best = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i][0] - ax, points[i][1] - ay);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const first = simplifyOpen(points.slice(0, far + 1), tolerance);
  const second = simplifyOpen([...points.slice(far), points[0]], tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

function simplifyOpen(points: readonly PlanPoint[], tolerance: number): PlanPoint[] {
  if (points.length <= 2) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop() ?? [0, 0];
    const [x1, y1] = points[a];
    const [x2, y2] = points[b];
    const length = Math.hypot(x2 - x1, y2 - y1);
    let far = -1;
    let best = tolerance;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = points[i];
      const d =
        length === 0
          ? Math.hypot(px - x1, py - y1)
          : Math.abs((x2 - x1) * (y1 - py) - (x1 - px) * (y2 - y1)) / length;
      if (d > best) {
        best = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}
