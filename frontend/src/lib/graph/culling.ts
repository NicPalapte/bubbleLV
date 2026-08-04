// Viewport-Culling — günstiger Bounding-Box-Test, damit große LVs (Richtung
// ~10k Positionen) nur die tatsächlich sichtbaren Knoten zeichnen.
// Portiert aus dem `cull`/`inView`-Paar in design/claude-design/lv-graph.jsx.

export interface Viewport {
  /** Verschiebung und Zoom der Weltkoordinaten auf die Canvas. */
  tx: number;
  ty: number;
  k: number;
  width: number;
  height: number;
}

export interface CullBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const CULL_MARGIN = 80;

export function cullBounds(view: Viewport, margin = CULL_MARGIN): CullBounds {
  return {
    x0: (-margin - view.tx) / view.k,
    x1: (view.width + margin - view.tx) / view.k,
    y0: (-margin - view.ty) / view.k,
    y1: (view.height + margin - view.ty) / view.k,
  };
}

export function isInView(bounds: CullBounds, cx: number, cy: number, radius: number): boolean {
  return (
    cx + radius >= bounds.x0 &&
    cx - radius <= bounds.x1 &&
    cy + radius >= bounds.y0 &&
    cy - radius <= bounds.y1
  );
}
