// Hinweisschilder im Graphen (docs/decisions/0035-graph-gliederung.md).
//
// Die Schilder liegen in Bildschirmkoordinaten über dem Graphen: gleiche
// Schriftgröße bei jedem Zoom. Platzierung gierig — „beachten" zuerst, dann von
// oben nach unten; je Schild werden acht Lagen um die Bubble probiert, die erste
// freie gewinnt. Findet ein Schild keinen Platz (andere Schilder, Fenster, Rand,
// fremde Hinweis-Ringe), entfällt es; der Ring an der Bubble bleibt.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PinAnchor {
  id: string;
  /** Mitte der Bubble auf dem Schirm. */
  sx: number;
  sy: number;
  /** Radius des Hinweis-Rings auf dem Schirm. */
  rr: number;
  label: string;
  strong: boolean;
}

export interface PlacedPin {
  anchor: PinAnchor;
  box: Rect;
  /** Linie vom Ring zum Schild. */
  line: { x1: number; y1: number; x2: number; y2: number };
}

export const PIN_HEIGHT = 22;
/** Mehr Schilder prüft niemand — die Platzsuche bleibt auch bei 10k Positionen billig. */
export const MAX_PIN_CANDIDATES = 400;

/** Breite eines Schilds bei 10px-Monospace. */
export function pinWidth(label: string): number {
  return label.length * 6.2 + 18;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function placePins(
  anchors: readonly PinAnchor[],
  stage: { width: number; height: number },
  blocked: readonly Rect[],
): PlacedPin[] {
  const visible = anchors
    .filter((a) => a.sx > 0 && a.sy > 0 && a.sx < stage.width && a.sy < stage.height)
    .sort((a, b) => Number(b.strong) - Number(a.strong) || a.sy - b.sy || a.sx - b.sx)
    .slice(0, MAX_PIN_CANDIDATES);
  // Die Ringe der Hinweis-Bubbles selbst bleiben frei.
  const rings: Rect[] = visible.map((a) => ({
    x: a.sx - a.rr - 2,
    y: a.sy - a.rr - 2,
    w: 2 * a.rr + 4,
    h: 2 * a.rr + 4,
  }));
  const placed: Rect[] = [];
  const out: PlacedPin[] = [];
  const h = PIN_HEIGHT;

  for (const a of visible) {
    const w = pinWidth(a.label);
    const g = a.rr + 14;
    const candidates: ReadonlyArray<readonly [number, number]> = [
      [g, -g - h],
      [-g - w, -g - h],
      [g, g],
      [-g - w, g],
      [-w / 2, -g - h - 14],
      [-w / 2, g + 10],
      [g + 10, -h / 2],
      [-g - 10 - w, -h / 2],
    ];
    for (const [ox, oy] of candidates) {
      const box = { x: a.sx + ox, y: a.sy + oy, w, h };
      if (box.x < 4 || box.y < 4) continue;
      if (box.x + w > stage.width - 4 || box.y + h > stage.height - 4) continue;
      if (placed.some((b) => overlaps(box, b))) continue;
      if (blocked.some((b) => overlaps(box, b))) continue;
      if (rings.some((b) => overlaps(box, b))) continue;
      placed.push({ x: box.x - 3, y: box.y - 3, w: w + 6, h: h + 6 });
      const tx = Math.max(box.x, Math.min(a.sx, box.x + w));
      const ty = Math.max(box.y, Math.min(a.sy, box.y + h));
      const angle = Math.atan2(ty - a.sy, tx - a.sx);
      out.push({
        anchor: a,
        box,
        line: {
          x1: a.sx + Math.cos(angle) * a.rr,
          y1: a.sy + Math.sin(angle) * a.rr,
          x2: tx,
          y2: ty,
        },
      });
      break;
    }
  }
  return out;
}
