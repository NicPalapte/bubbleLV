// Auswahl im Langtext für „Begriff lernen" (Entscheidung 0053, LearnPopover.tsx).

/** Längere Auswahl ist kein Begriff mehr, sondern ein Absatz. */
const MAX_LENGTH = 80;

export interface LearnTarget {
  text: string;
  /** Lage im Fenster (Auswahl-Rechteck), unter der das Feld erscheint. */
  left: number;
  top: number;
}

/** Liest die aktuelle Auswahl, wenn sie ganz in `container` liegt. */
export function selectionIn(container: HTMLElement): LearnTarget | null {
  const selection = container.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  const text = selection.toString().replace(/\s+/g, ' ').trim();
  if (text === '' || text.length > MAX_LENGTH) return null;
  // jsdom kennt kein Range-Rechteck; dann unter dem Langtext.
  const rect =
    typeof range.getBoundingClientRect === 'function'
      ? range.getBoundingClientRect()
      : container.getBoundingClientRect();
  return { text, left: rect.left, top: rect.bottom + 6 };
}
