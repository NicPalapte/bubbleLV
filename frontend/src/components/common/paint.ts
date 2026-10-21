// Eigene Anstreichungen im Langtext (Entscheidung 0063): Auswahl lesen, Stelle
// wiederfinden und mit der CSS Custom Highlight API einfärben. Die API färbt
// Textbereiche, ohne das DOM umzubauen — Suchtreffer und Fundstellen in
// `Highlighted` bleiben unberührt. Browser ohne die API zeigen nur die Liste.

import { useLayoutEffect, type RefObject } from 'react';
import { PAINTS, type Highlight, type Paint } from '../../lib/annotations';

/** Längere Auswahl ist kein Anstreichen mehr, sondern Kopieren. */
const MAX_LENGTH = 2000;

/**
 * Text, wie der Langtext ihn anzeigt: `**…**` ohne Sternchen (`Highlighted`).
 * Darauf beziehen sich `Highlight.start` und die Auswahl.
 */
export function shownText(longText: string): string {
  return longText.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/** Stelle der Anstreichung im Text, -1 wenn ihr Text dort nicht (mehr) vorkommt. */
export function locate(text: string, mark: Pick<Highlight, 'start' | 'text'>): number {
  if (text.slice(mark.start, mark.start + mark.text.length) === mark.text) return mark.start;
  return text.indexOf(mark.text);
}

export interface PaintTarget {
  start: number;
  text: string;
  /** Lage im Fenster (Auswahl-Rechteck), unter der die Leiste erscheint. */
  left: number;
  top: number;
}

/** Liest die aktuelle Auswahl samt Stelle im Text, wenn sie ganz in `container` liegt. */
export function paintSelection(container: HTMLElement): PaintTarget | null {
  const selection = container.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  const raw = range.toString();
  // Leerraum am Rand gehört nicht zur Anstreichung.
  const text = raw.trim();
  if (text === '' || text.length > MAX_LENGTH) return null;
  const before = container.ownerDocument.createRange();
  before.setStart(container, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length + (raw.length - raw.trimStart().length);
  // jsdom kennt kein Range-Rechteck; dann unter dem Langtext.
  const rect =
    typeof range.getBoundingClientRect === 'function'
      ? range.getBoundingClientRect()
      : container.getBoundingClientRect();
  return { start, text, left: rect.left, top: rect.bottom + 6 };
}

/** Ein `Highlight` je Farbe, geteilt von allen offenen Langtexten. */
const registry = new Map<Paint, globalThis.Highlight>();

function highlightOf(paint: Paint): globalThis.Highlight | null {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return null;
  let entry = registry.get(paint);
  if (entry === undefined) {
    entry = new globalThis.Highlight();
    registry.set(paint, entry);
    CSS.highlights.set(`paint-${paint}`, entry);
  }
  return entry;
}

/** DOM-Bereich für die Zeichen `start…end` im Textinhalt von `container`. */
function rangeOf(container: HTMLElement, start: number, end: number): Range | null {
  const doc = container.ownerDocument;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!started && start < offset + length) {
      range.setStart(node, start - offset);
      started = true;
    }
    if (started && end <= offset + length) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

/**
 * Färbt die Anstreichungen im Langtext ein. Läuft nach jedem Rendern, das den
 * Langtext neu aufbaut (Suche, Fundstellen-Legende): `deps` nennt diese Auslöser.
 */
export function usePaintHighlights(
  containerRef: RefObject<HTMLElement | null>,
  marks: readonly Highlight[],
  deps: readonly unknown[],
): void {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null || marks.length === 0) return;
    const text = container.textContent ?? '';
    const added: Array<[globalThis.Highlight, Range]> = [];
    for (const paint of PAINTS) {
      const highlight = highlightOf(paint);
      if (highlight === null) return;
      for (const mark of marks) {
        if (mark.paint !== paint) continue;
        const start = locate(text, mark);
        if (start < 0) continue;
        const range = rangeOf(container, start, start + mark.text.length);
        if (range === null) continue;
        highlight.add(range);
        added.push([highlight, range]);
      }
    }
    return () => {
      for (const [highlight, range] of added) highlight.delete(range);
    };
    // `deps` sind die Auslöser für ein neu aufgebautes DOM, nicht Werte im Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, marks, ...deps]);
}
