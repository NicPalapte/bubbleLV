// Seitenbild zeichnen, ohne dass es schwarz wird (Entscheidung 0095). Browser zeichnen
// eine Zeichenfläche über ihrer Größengrenze schwarz (Safari am iPad schon ab 16 Mio.
// Bildpunkten). Große Pläne bekommen deshalb ein gröberes Gesamtbild und darüber ein
// scharfes Bild nur vom sichtbaren Ausschnitt. Gezeichnet wird immer auf eine neue
// Fläche; erst das fertige Bild ersetzt das alte — kein leeres Bild beim Zoomen.

import type { PDFPageProxy } from 'pdfjs-dist';

/** Höchstens so viele Bildpunkte je Zeichenfläche. */
export const MAX_PIXELS = 8_000_000;

/** Ausschnitt einer Seite in CSS-Pixeln beim aktuellen Maßstab. */
export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Bildpunkte je CSS-Pixel: so scharf wie der Bildschirm, aber unter `MAX_PIXELS`. */
export function pixelRatio(width: number, height: number, wanted: number): number {
  const area = Math.max(1, width * height);
  return Math.max(0.05, Math.min(wanted, Math.sqrt(MAX_PIXELS / area)));
}

export interface PageDrawing {
  readonly promise: Promise<HTMLCanvasElement>;
  readonly cancel: () => void;
}

/** Ausschnitt `region` der Seite bei Maßstab `scale` auf eine neue Fläche zeichnen. */
export function drawRegion(
  proxy: PDFPageProxy,
  scale: number,
  ratio: number,
  region: Region,
): PageDrawing {
  const viewport = proxy.getViewport({ scale });
  // Immer im Hauptfenster zeichnen: im zweiten Fenster (Entscheidung 0039) fehlen die
  // Schriften, die PDF.js hier anmeldet.
  const work = document.createElement('canvas');
  work.width = Math.max(1, Math.floor(region.width * ratio));
  work.height = Math.max(1, Math.floor(region.height * ratio));
  const task = proxy.render({
    canvas: work,
    viewport,
    transform: [ratio, 0, 0, ratio, -region.x * ratio, -region.y * ratio],
  });
  return {
    promise: task.promise.then(() => work),
    cancel: () => {
      task.cancel();
      work.width = 0;
      work.height = 0;
    },
  };
}

/** Fertiges Bild in die sichtbare Fläche kopieren und die Arbeitsfläche freigeben. */
export function showDrawing(target: HTMLCanvasElement, drawn: HTMLCanvasElement): void {
  target.width = drawn.width;
  target.height = drawn.height;
  target.getContext('2d')?.drawImage(drawn, 0, 0);
  drawn.width = 0;
  drawn.height = 0;
}
