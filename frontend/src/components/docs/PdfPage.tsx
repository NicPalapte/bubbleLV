// Eine Seite des Begleitdokuments: Bild (Canvas) und darüber die Textebene von
// PDF.js, in der sich Text auswählen, anstreichen und verknüpfen lässt
// (Entscheidung 0072). Gezeichnet wird erst, wenn die Seite in die Nähe des
// sichtbaren Bereichs kommt — ein Dokument mit 300 Seiten zeichnet nur die paar,
// die man sieht.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { useDocHighlights, rangeIn, type DocHighlightItem } from './docHighlights';
import type { DocMark } from '../../lib/docs/docNotes';
import { locateOnPage } from '../../lib/docs/docNotes';
import { pdfLib, type OpenedPdf } from '../../lib/docs/pdf';

/** So weit außerhalb des sichtbaren Bereichs wird schon gezeichnet. */
const NEAR = '800px 0px';

export interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** Lage einer verknüpften Stelle auf der Seite, für die Marke am Rand. */
interface Badge {
  readonly mark: DocMark;
  readonly top: number;
}

function PdfPageView({
  doc,
  page,
  scale,
  size,
  root,
  marks,
  extra,
  reveal,
  onSize,
  scrollBy,
  badge,
}: {
  doc: OpenedPdf;
  page: number;
  scale: number;
  /** Größe bei Maßstab 1; bis die Seite gemessen ist, die der ersten Seite. */
  size: PageSize;
  root: HTMLElement | null;
  marks: readonly DocMark[];
  /** Suchtreffer und Sprungziel auf dieser Seite. */
  extra: readonly DocHighlightItem[];
  /** Stelle, die nach dem Zeichnen ins Bild soll; `nonce` macht sie wiederholbar. */
  reveal: { start: number; text: string; nonce: number } | null;
  /** Verschiebt den Bildlauf um `dy` px — die Seite selbst kennt nur ihren Rahmen. */
  scrollBy: (dy: number) => void;
  onSize: (page: number, size: PageSize) => void;
  badge: (mark: DocMark) => ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [proxy, setProxy] = useState<PDFPageProxy | null>(null);
  /** Wechselt, wenn die Textebene neu steht. */
  const [version, setVersion] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const el = box.current;
    if (el === null || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.some((entry) => entry.isIntersecting)),
      { root, rootMargin: NEAR },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || proxy !== null) return;
    let alive = true;
    doc.pdf.getPage(page).then(
      (loaded) => {
        if (!alive) return;
        const view = loaded.getViewport({ scale: 1 });
        onSize(page, { width: view.width, height: view.height });
        setProxy(loaded);
      },
      // Dokument während des Ladens geschlossen oder Seite defekt: Seite bleibt leer.
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [near, proxy, doc, page, onSize]);

  // Bild und Textebene zeichnen; neu bei anderem Maßstab.
  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = textRef.current;
    if (!near || proxy === null || canvas === null || layer === null) return;
    let alive = true;
    let task: RenderTask | null = null;
    let textLayer: { cancel: () => void } | null = null;
    const viewport = proxy.getViewport({ scale });
    const ratio = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    // Im zweiten Fenster (Entscheidung 0039) fehlen dort die Schriften, die PDF.js
    // im Hauptfenster anmeldet — dann bliebe das Bild leer. Deshalb dort auf einer
    // Fläche des Hauptfensters zeichnen und das fertige Bild hinüberkopieren.
    const foreign = canvas.ownerDocument !== document;
    const work = foreign ? document.createElement('canvas') : canvas;
    work.width = canvas.width;
    work.height = canvas.height;
    task = proxy.render({
      canvas: work,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    });
    task.promise
      .then(() => {
        if (alive && foreign) canvas.getContext('2d')?.drawImage(work, 0, 0);
      })
      .catch(() => {
        // Abgebrochen (neuer Maßstab, Seite weg) — kein Fehler für Menschen.
      });
    void pdfLib().then(({ TextLayer }) => {
      if (!alive) return;
      layer.replaceChildren();
      const text = new TextLayer({
        textContentSource: proxy.streamTextContent(),
        container: layer,
        viewport,
      });
      textLayer = text;
      text
        .render()
        .then(() => {
          if (alive) setVersion((value) => value + 1);
        })
        .catch(() => {});
    });
    return () => {
      alive = false;
      task?.cancel();
      textLayer?.cancel();
    };
  }, [near, proxy, scale]);

  // Weit weg: Speicher freigeben, beim nächsten Mal neu zeichnen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (near || proxy === null || canvas === null) return;
    canvas.width = 0;
    canvas.height = 0;
    textRef.current?.replaceChildren();
    proxy.cleanup();
  }, [near, proxy]);

  const items = useMemo<DocHighlightItem[]>(
    () => [
      ...marks.map((mark): DocHighlightItem => ({
        name: mark.paint === null ? 'doclink' : `docpaint-${mark.paint}`,
        start: mark.start,
        text: mark.text,
      })),
      ...extra,
    ],
    [marks, extra],
  );
  useDocHighlights(textRef, items, version);

  // Marken am Rand für verknüpfte Stellen: Höhe der Stelle auf der Seite.
  useLayoutEffect(() => {
    const layer = textRef.current;
    const frame = box.current;
    if (layer === null || frame === null || version === 0) return;
    const text = layer.textContent ?? '';
    const top0 = frame.getBoundingClientRect().top;
    const next: Badge[] = [];
    for (const mark of marks) {
      if (mark.links.length === 0) continue;
      const start = locateOnPage(text, mark);
      const range = start < 0 ? null : rangeIn(layer, start, start + mark.text.length);
      if (range === null || typeof range.getBoundingClientRect !== 'function') continue;
      next.push({ mark, top: range.getBoundingClientRect().top - top0 });
    }
    setBadges(next);
  }, [marks, version, scale]);

  // Sprungziel ins Bild holen, sobald die Textebene steht.
  useLayoutEffect(() => {
    const layer = textRef.current;
    if (reveal === null || layer === null || version === 0 || root === null) return;
    const text = layer.textContent ?? '';
    const start = locateOnPage(text, reveal);
    const range = start < 0 ? null : rangeIn(layer, start, start + reveal.text.length);
    if (range === null || typeof range.getBoundingClientRect !== 'function') return;
    const rect = range.getBoundingClientRect();
    const view = root.getBoundingClientRect();
    scrollBy(rect.top - view.top - view.height / 3);
  }, [reveal, version, root, scrollBy]);

  const width = Math.floor(size.width * scale);
  const height = Math.floor(size.height * scale);
  return (
    <div
      ref={box}
      data-page={page}
      aria-label={`Seite ${page}`}
      className="doc-page relative mx-auto bg-white shadow-[var(--shadow-sm)]"
      style={{
        width,
        height,
        ['--total-scale-factor' as string]: String(scale),
        ['--scale-round-x' as string]: '1px',
        ['--scale-round-y' as string]: '1px',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute left-0 top-0"
        style={{ width, height, visibility: proxy === null ? 'hidden' : 'visible' }}
      />
      <div ref={textRef} className="textLayer doc-text" />
      {badges.map(({ mark, top }) => (
        <div
          key={`${mark.start}-${mark.text}`}
          className="absolute right-[4px] z-[2]"
          style={{ top: Math.max(0, top - 2) }}
        >
          {badge(mark)}
        </div>
      ))}
      {proxy === null && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[#8e8e93]">
          Seite {page}
        </span>
      )}
    </div>
  );
}

/** Gekapselt: beim Scrollen ändert sich nur die Seitenanzeige, nicht jede Seite. */
export const PdfPage = memo(PdfPageView);
