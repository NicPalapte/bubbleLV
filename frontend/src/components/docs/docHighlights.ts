// Einfärben auf der Textebene einer PDF-Seite mit der CSS Custom Highlight API —
// wie im Langtext (components/common/paint.ts), aber je Browserfenster: das
// Dokument kann in ein zweites Fenster wandern (Entscheidung 0039), und jedes
// Fenster hat seine eigene `CSS.highlights`-Tabelle. Die Regeln `::highlight(…)`
// stehen in index.css und reisen mit den Stilen ins zweite Fenster.

import { useLayoutEffect, type RefObject } from 'react';
import { locateOnPage } from '../../lib/docs/docNotes';

/** Namen der Highlights: Anstreichfarben, Verknüpfung, Suchtreffer, Sprungziel. */
export type DocHighlightName =
  `docpaint-${string}` | 'doclink' | 'docsearch' | 'docsearch-current' | 'docflash';

export interface DocHighlightItem {
  readonly name: DocHighlightName;
  readonly start: number;
  readonly text: string;
}

type HighlightWindow = Window & typeof globalThis;

const registry = new WeakMap<Window, Map<string, Highlight>>();

function highlightIn(win: HighlightWindow, name: string): Highlight | null {
  if (typeof win.CSS === 'undefined' || !('highlights' in win.CSS)) return null;
  if (typeof win.Highlight !== 'function') return null;
  let own = registry.get(win);
  if (own === undefined) {
    own = new Map();
    registry.set(win, own);
  }
  let entry = own.get(name);
  if (entry === undefined) {
    entry = new win.Highlight();
    own.set(name, entry);
    win.CSS.highlights.set(name, entry);
  }
  return entry;
}

/** DOM-Bereich für die Zeichen `start…end` im Textinhalt von `container`. */
export function rangeIn(container: HTMLElement, start: number, end: number): Range | null {
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
 * Färbt `items` auf der Textebene ein. `version` wechselt, sobald die Textebene
 * neu aufgebaut ist — erst dann gibt es die Textknoten.
 */
export function useDocHighlights(
  containerRef: RefObject<HTMLElement | null>,
  items: readonly DocHighlightItem[],
  version: number,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const win = container?.ownerDocument.defaultView as HighlightWindow | null | undefined;
    if (container === null || win == null || items.length === 0) return;
    const text = container.textContent ?? '';
    const added: Array<[Highlight, Range]> = [];
    for (const item of items) {
      const start = locateOnPage(text, item);
      if (start < 0) continue;
      const range = rangeIn(container, start, start + item.text.length);
      const highlight = highlightIn(win, item.name);
      if (range === null || highlight === null) continue;
      highlight.add(range);
      added.push([highlight, range]);
    }
    return () => {
      for (const [highlight, range] of added) highlight.delete(range);
    };
  }, [containerRef, items, version]);
}
