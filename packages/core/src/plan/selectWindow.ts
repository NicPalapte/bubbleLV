// Auswahl per Fenster wie im CAD (Nico, 06.11.2026): von links nach rechts aufgezogen
// zählt nur, was ganz drin liegt; von rechts nach links alles, was das Fenster berührt.
// Rein geometrisch in einer Ebene — gilt so für Pläne und später für den BIM-Viewer
// (dort in Bildschirmkoordinaten).

import type { PlanPoint } from './measure';

export type WindowMode = 'inside' | 'crossing';

export interface SelectWindow {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Gezogen von links nach rechts: „inside“, sonst „crossing“. */
export function windowModeOf(start: PlanPoint, end: PlanPoint): WindowMode {
  return end[0] >= start[0] ? 'inside' : 'crossing';
}

/** Fenster aus zwei Ecken, gleich in welcher Richtung gezogen. */
export function windowOf(a: PlanPoint, b: PlanPoint): SelectWindow {
  return {
    x0: Math.min(a[0], b[0]),
    y0: Math.min(a[1], b[1]),
    x1: Math.max(a[0], b[0]),
    y1: Math.max(a[1], b[1]),
  };
}

/** Form zum Auswählen: Punkte, Linienzug oder geschlossene Fläche. */
export interface SelectShape {
  readonly points: readonly PlanPoint[];
  /** Fläche: Rand geschlossen, Fenster in der Fläche berührt sie. */
  readonly closed: boolean;
  /** Nur einzelne Punkte (z. B. Stück), keine Linie dazwischen. */
  readonly loose?: boolean;
}

const inWindow = (w: SelectWindow, [x, y]: PlanPoint): boolean =>
  x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1;

function cross(a: PlanPoint, b: PlanPoint, c: PlanPoint): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsMeet(a: PlanPoint, b: PlanPoint, c: PlanPoint, d: PlanPoint): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function pointInPolygon([x, y]: PlanPoint, polygon: readonly PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Liegt die Form nach `mode` im Fenster? */
export function hitsWindow(w: SelectWindow, shape: SelectShape, mode: WindowMode): boolean {
  const { points } = shape;
  if (points.length === 0) return false;
  if (mode === 'inside') return points.every((point) => inWindow(w, point));
  if (points.some((point) => inWindow(w, point))) return true;
  const corners: PlanPoint[] = [
    [w.x0, w.y0],
    [w.x1, w.y0],
    [w.x1, w.y1],
    [w.x0, w.y1],
  ];
  if (shape.loose === true) return false;
  const segments = points.length > 1 ? points.length - (shape.closed ? 0 : 1) : 0;
  for (let i = 0; i < segments; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let k = 0; k < 4; k += 1) {
      if (segmentsMeet(a, b, corners[k], corners[(k + 1) % 4])) return true;
    }
  }
  // Fenster ganz in einer Fläche: berührt sie auch.
  return shape.closed && points.length >= 3 && pointInPolygon(corners[0], points);
}

/** Kennungen aller Formen, die das Fenster trifft. */
export function selectInWindow<T extends SelectShape & { readonly id: string }>(
  w: SelectWindow,
  shapes: readonly T[],
  mode: WindowMode,
): string[] {
  return shapes.filter((shape) => hitsWindow(w, shape, mode)).map((shape) => shape.id);
}
