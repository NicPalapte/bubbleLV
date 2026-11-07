// Eine Seite des Begleitdokuments: Bild (Canvas) und darüber die Textebene von
// PDF.js, in der sich Text auswählen, anstreichen und verknüpfen lässt
// (Entscheidung 0072). Gezeichnet wird erst, wenn die Seite in die Nähe des
// sichtbaren Bereichs kommt — ein Dokument mit 300 Seiten zeichnet nur die paar,
// die man sieht.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { drawRegion, pixelRatio, showDrawing, type PageDrawing } from './pageCanvas';
import { useDocHighlights, rangeIn, type DocHighlightItem } from './docHighlights';
import type { DocMark } from '../../lib/docs/docNotes';
import { locateOnPage } from '../../lib/docs/docNotes';
import type { DocSuggestion } from '../../lib/docs/docSuggest';
import { pdfLib, type OpenedPdf } from '../../lib/docs/pdf';
import { bundleSpots, type Bundle } from '../../lib/docs/linkBundles';

/** So weit außerhalb des sichtbaren Bereichs wird schon gezeichnet. */
const NEAR = '800px 0px';
/** So lange muss der Maßstab oder Bildlauf stehen, bis neu gezeichnet wird. */
const SETTLE_MS = 140;

export interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** Mindestabstand zweier Marken in px, sonst teilen sie sich eine (Maus / Finger). */
const BADGE_GAP = 20;
const BADGE_GAP_TOUCH = 30;

/** Vorschlag mit seinen Zeilenstücken auf der Seite (Entscheidung 0080). */
interface Offer {
  readonly suggestion: DocSuggestion;
  readonly boxes: ReadonlyArray<{ left: number; top: number; width: number; height: number }>;
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
  suggestions,
  onSuggestion,
  overlay,
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
  badge: (marks: readonly DocMark[]) => ReactNode;
  /** Offene Vorschläge auf dieser Seite, gestrichelt unterstrichen. */
  suggestions: readonly DocSuggestion[];
  /** Klick auf einen Vorschlag; `at` ist die Stelle darunter im Fenster. */
  onSuggestion: (suggestion: DocSuggestion, at: { left: number; top: number }) => void;
  /** Ebene über der Seite, z. B. Messungen im Plan (Entscheidung 0095); stabil halten. */
  overlay?: (page: number, size: PageSize, scale: number) => ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detailRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [proxy, setProxy] = useState<PDFPageProxy | null>(null);
  /** Wechselt, wenn die Textebene neu steht. */
  const [version, setVersion] = useState(0);
  const [badges, setBadges] = useState<Bundle<DocMark>[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

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

  // Liegt ein Fenster lange verdeckt, gibt der Browser den Speicher der Zeichenflächen frei;
  // zurück kommen sie schwarz oder leer (Issue #191, PDF im eigenen Fenster). Dann neu zeichnen.
  const drawn = useRef(false);
  const [repaint, setRepaint] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const host = canvas.ownerDocument;
    const again = (): void => setRepaint((value) => value + 1);
    const onVisible = (): void => {
      // Immer neu zeichnen: nicht jeder Browser meldet den verlorenen Speicher über
      // `isContextLost`, die Fläche bleibt dann trotzdem schwarz.
      if (host.visibilityState === 'visible' && drawn.current) again();
    };
    canvas.addEventListener('contextrestored', again);
    host.addEventListener('visibilitychange', onVisible);
    return () => {
      canvas.removeEventListener('contextrestored', again);
      host.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Bild und Textebene zeichnen; neu bei anderem Maßstab. Beim Zoomen erst, wenn der
  // Maßstab kurz steht — bis dahin streckt der Browser das alte Bild.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = textRef.current;
    if (!near || proxy === null || canvas === null || layer === null) return;
    let alive = true;
    let drawing: PageDrawing | null = null;
    let textLayer: { cancel: () => void } | null = null;
    const run = (): void => {
      const viewport = proxy.getViewport({ scale });
      const wanted = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
      const ratio = pixelRatio(viewport.width, viewport.height, wanted);
      setCoarse(ratio < wanted * 0.9);
      drawing = drawRegion(proxy, scale, ratio, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      drawing.promise
        .then((work) => {
          if (!alive) return;
          showDrawing(canvas, work);
          drawn.current = true;
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
    };
    const timer = drawn.current ? window.setTimeout(run, SETTLE_MS) : 0;
    if (!drawn.current) run();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      drawing?.cancel();
      textLayer?.cancel();
    };
  }, [near, proxy, scale, repaint]);

  // Grobes Gesamtbild (großer Plan, hoher Zoom): sichtbaren Ausschnitt scharf darüber.
  useEffect(() => {
    const detail = detailRef.current;
    const frame = box.current;
    if (detail === null) return;
    detail.style.display = 'none';
    if (!near || !coarse || proxy === null || frame === null || root === null) return;
    let alive = true;
    let timer = 0;
    let drawing: PageDrawing | null = null;
    const run = (): void => {
      drawing?.cancel();
      const page = frame.getBoundingClientRect();
      const view = root.getBoundingClientRect();
      const x = Math.max(0, view.left - page.left);
      const y = Math.max(0, view.top - page.top);
      const width = Math.min(page.width, view.right - page.left) - x;
      const height = Math.min(page.height, view.bottom - page.top) - y;
      if (width <= 0 || height <= 0) return;
      const wanted = detail.ownerDocument.defaultView?.devicePixelRatio ?? 1;
      const region = { x, y, width, height };
      drawing = drawRegion(proxy, scale, pixelRatio(width, height, wanted), region);
      drawing.promise
        .then((work) => {
          if (!alive) return;
          showDrawing(detail, work);
          Object.assign(detail.style, {
            display: 'block',
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
          });
        })
        .catch(() => {});
    };
    const later = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, SETTLE_MS);
    };
    later();
    root.addEventListener('scroll', later, { passive: true });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      drawing?.cancel();
      root.removeEventListener('scroll', later);
    };
  }, [near, coarse, proxy, scale, root, repaint]);

  // Weit weg: Speicher freigeben, beim nächsten Mal neu zeichnen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (near || proxy === null || canvas === null) return;
    canvas.width = 0;
    canvas.height = 0;
    drawn.current = false;
    const detail = detailRef.current;
    if (detail !== null) {
      detail.width = 0;
      detail.height = 0;
      detail.style.display = 'none';
    }
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
    const placed: { spot: DocMark; top: number }[] = [];
    for (const mark of marks) {
      if (mark.links.length === 0) continue;
      const start = locateOnPage(text, mark);
      const range = start < 0 ? null : rangeIn(layer, start, start + mark.text.length);
      if (range === null || typeof range.getBoundingClientRect !== 'function') continue;
      placed.push({ spot: mark, top: range.getBoundingClientRect().top - top0 });
    }
    const coarse = frame.ownerDocument.defaultView?.matchMedia?.('(pointer: coarse)').matches;
    setBadges(bundleSpots(placed, coarse === true ? BADGE_GAP_TOUCH : BADGE_GAP));
  }, [marks, version, scale]);

  // Vorschläge: Zeilenstücke der Stelle als Knöpfe über dem Text — antippbar auch am
  // Tablet, wo es kein Hover und keinen Rechtsklick gibt.
  useLayoutEffect(() => {
    const layer = textRef.current;
    const frame = box.current;
    if (layer === null || frame === null || version === 0 || suggestions.length === 0) {
      setOffers((current) => (current.length === 0 ? current : []));
      return;
    }
    const text = layer.textContent ?? '';
    const origin = frame.getBoundingClientRect();
    const next: Offer[] = [];
    for (const suggestion of suggestions) {
      const start = locateOnPage(text, suggestion);
      const range = start < 0 ? null : rangeIn(layer, start, start + suggestion.text.length);
      if (range === null || typeof range.getClientRects !== 'function') continue;
      const boxes = [...range.getClientRects()]
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          left: rect.left - origin.left,
          top: rect.top - origin.top,
          width: rect.width,
          height: rect.height,
        }));
      if (boxes.length > 0) next.push({ suggestion, boxes });
    }
    setOffers(next);
  }, [suggestions, version, scale]);

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
      <canvas
        ref={detailRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ display: 'none' }}
      />
      <div ref={textRef} className="textLayer doc-text" />
      {overlay?.(page, size, scale)}
      {badges.map(({ spots, top }) => (
        <div
          key={`${spots[0].start}-${spots[0].text}`}
          className="absolute right-[4px] z-[2]"
          style={{ top: Math.max(0, top - 2) }}
        >
          {badge(spots)}
        </div>
      ))}
      {offers.map(({ suggestion, boxes }) =>
        boxes.map((rect, i) => (
          <button
            key={`${suggestion.start}-${suggestion.id}-${i}`}
            type="button"
            aria-label={`Vorschlag ${suggestion.text}: verknüpfen?`}
            title="Verknüpfen?"
            onClick={(event) => {
              const own = event.currentTarget.getBoundingClientRect();
              onSuggestion(suggestion, { left: own.left, top: own.bottom + 4 });
            }}
            className={`doc-suggest absolute z-[2] cursor-pointer border-0 border-b-2 border-dashed bg-transparent p-0 ${
              suggestion.source === 'oz' ? 'border-accent' : 'border-amber'
            }`}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        )),
      )}
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
