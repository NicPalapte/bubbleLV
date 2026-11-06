// Geschlossene Linien unter dem Mauszeiger erkennen (Entscheidung 0095): Die Seite einmal
// unsichtbar zeichnen und als Linienmaske merken; beim Überfahren von der Stelle aus füllen.
// Bild statt Vektoren, darum auch für eingescannte Pläne. Nur ein Vorschlag: übernommen
// wird erst mit einem Klick.

import { findRegion, maskFromRgba, thicken, type LineMask, type PlanPoint } from '@core';
import type { PDFPageProxy } from 'pdfjs-dist';
import { drawRegion, MAX_PIXELS } from './pageCanvas';
import type { AreaShape } from '../../lib/docs/planNotes';

export interface PageMask {
  readonly mask: LineMask;
  /** Bildpunkte je Seiten-Einheit. */
  readonly ratio: number;
  /** Fläche der Seite in Bildpunkten. */
  readonly area: number;
}

/** Höchstens zwei Bildpunkte je Seiten-Einheit: ein halber Punkt genau. */
const FINE = 2;

export async function pageMaskOf(proxy: PDFPageProxy): Promise<PageMask | null> {
  const page = proxy.getViewport({ scale: 1 });
  const ratio = Math.min(FINE, Math.sqrt(MAX_PIXELS / (page.width * page.height)));
  const drawn = await drawRegion(proxy, 1, ratio, {
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
  }).promise;
  try {
    const context = drawn.getContext('2d', { willReadFrequently: true });
    if (context === null) return null;
    const image = context.getImageData(0, 0, drawn.width, drawn.height);
    // Ein Bildpunkt dicker: Linien aus Einzelstrichen haben sonst Haarrisse.
    const mask = thicken(maskFromRgba(image.width, image.height, image.data), 1);
    return { mask, ratio, area: image.width * image.height };
  } finally {
    drawn.width = 0;
    drawn.height = 0;
  }
}

export interface Snap {
  readonly points: PlanPoint[];
  readonly shape?: AreaShape;
}

/** Abweichung des Randes vom mittleren Radius, bis zu der es ein Kreis ist. */
const ROUND = 0.06;

/**
 * Geschlossene Fläche um `at` (Seiten-Einheiten), oder `null`. Beim Kreis-Werkzeug wird
 * eine runde Fläche als Kreis zurückgegeben, sonst der Rand als Polygon.
 */
export function snapAt(page: PageMask, at: PlanPoint, wantCircle: boolean): Snap | null {
  const found = findRegion(page.mask, at[0] * page.ratio, at[1] * page.ratio);
  // Offen, winzig (Buchstabe) oder fast die ganze Seite: kein Vorschlag.
  if (found === null || found.open || found.polygon.length < 3) return null;
  if (found.pixels < 200 || found.pixels > page.area * 0.6) return null;
  const points = found.polygon.map(([x, y]): PlanPoint => [x / page.ratio, y / page.ratio]);
  if (wantCircle) {
    const n = points.length;
    const cx = points.reduce((sum, [x]) => sum + x, 0) / n;
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / n;
    const radii = points.map(([x, y]) => Math.hypot(x - cx, y - cy));
    const mean = radii.reduce((sum, r) => sum + r, 0) / n;
    if (n >= 8 && radii.every((r) => Math.abs(r - mean) <= mean * ROUND)) {
      return {
        points: [
          [cx, cy],
          [cx + mean, cy],
        ],
        shape: 'kreis',
      };
    }
  }
  return points.length === 4 ? { points, shape: 'rechteck' } : { points };
}
