// Miniatur der ersten Seite eines PDFs für die Übersicht (Entscheidung 0094). Einmal je
// Dokument gezeichnet und als Bild-Adresse gemerkt; nichts verlässt den Browser.

import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Breite der Miniatur in CSS-Pixeln; gezeichnet wird doppelt so fein. */
export const THUMB_WIDTH = 168;

const cache = new WeakMap<PDFDocumentProxy, Promise<string | null>>();

async function draw(pdf: PDFDocumentProxy): Promise<string | null> {
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (2 * THUMB_WIDTH) / base.width });
    // Immer im Hauptfenster zeichnen: im zweiten Fenster fehlen die Schriften von PDF.js
    // (siehe PdfPage). Die fertige Adresse taugt in jedem Fenster.
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL('image/png');
  } catch {
    // Seite nicht lesbar oder Zeichnen nicht möglich: die Karte zeigt dann nur den Namen.
    return null;
  }
}

/** Bild-Adresse der ersten Seite, `null` wenn sie sich nicht zeichnen lässt. */
export function thumbnailOf(pdf: PDFDocumentProxy): Promise<string | null> {
  let shot = cache.get(pdf);
  if (shot === undefined) {
    shot = draw(pdf);
    cache.set(pdf, shot);
  }
  return shot;
}
