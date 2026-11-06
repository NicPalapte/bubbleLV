// Fläche per Antippen (Entscheidung 0095): Ausschnitt der Seite unsichtbar zeichnen, von
// der getippten Stelle aus füllen und den Rand als Vorschlag zurückgeben. Der Mensch
// übernimmt ihn mit „Fertig“ oder verwirft ihn — Conocto legt nichts selbst an.

import { findRegion, maskFromRgba, thicken, type PlanPoint } from '@core';
import type { PDFPageProxy } from 'pdfjs-dist';
import { drawRegion, MAX_PIXELS, type Region } from './pageCanvas';

export type AreaGuess =
  | { readonly ok: true; readonly points: PlanPoint[] }
  | { readonly ok: false; readonly reason: string };

/** Bildpunkte je Seiten-Einheit im ersten Versuch: halber Punkt genau. */
const FINE = 2;
/** Erster Versuch: so weit um die Stelle herum (Seiten-Einheiten). */
const REACH = 700;

async function tryRegion(
  proxy: PDFPageProxy,
  at: PlanPoint,
  region: Region,
  ratio: number,
): Promise<{ points: PlanPoint[]; open: boolean } | null> {
  const drawn = await drawRegion(proxy, 1, ratio, region).promise;
  try {
    const context = drawn.getContext('2d', { willReadFrequently: true });
    if (context === null) return null;
    const image = context.getImageData(0, 0, drawn.width, drawn.height);
    // Ein Bildpunkt dicker: Linien aus Einzelstrichen haben sonst Haarrisse.
    const mask = thicken(maskFromRgba(image.width, image.height, image.data), 1);
    const found = findRegion(mask, (at[0] - region.x) * ratio, (at[1] - region.y) * ratio);
    if (found === null) return null;
    return {
      open: found.open,
      points: found.polygon.map(([x, y]): PlanPoint => [
        x / ratio + region.x,
        y / ratio + region.y,
      ]),
    };
  } finally {
    drawn.width = 0;
    drawn.height = 0;
  }
}

/** Fläche um `at` (Seiten-Einheiten) finden: erst nah und fein, dann die ganze Seite. */
export async function detectArea(proxy: PDFPageProxy, at: PlanPoint): Promise<AreaGuess> {
  const page = proxy.getViewport({ scale: 1 });
  const x = Math.max(0, at[0] - REACH);
  const y = Math.max(0, at[1] - REACH);
  const near: Region = {
    x,
    y,
    width: Math.min(page.width, at[0] + REACH) - x,
    height: Math.min(page.height, at[1] + REACH) - y,
  };
  const whole: Region = { x: 0, y: 0, width: page.width, height: page.height };
  const coarse = Math.min(FINE, Math.sqrt(MAX_PIXELS / (page.width * page.height)));
  const isWhole = near.width >= page.width && near.height >= page.height;
  const tries: Array<[Region, number]> = isWhole
    ? [[whole, coarse]]
    : [
        [near, FINE],
        [whole, coarse],
      ];
  for (const [region, ratio] of tries) {
    const found = await tryRegion(proxy, at, region, ratio);
    if (found === null) return { ok: false, reason: 'Auf einer Linie getippt' };
    if (!found.open && found.points.length >= 3) return { ok: true, points: found.points };
  }
  return { ok: false, reason: 'Keine geschlossene Fläche gefunden (Öffnung, z. B. Tür?)' };
}
