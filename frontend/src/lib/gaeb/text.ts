// Textextraktion aus GAEB-Textelementen (tgMLText & Co.): der Inhalt steckt in
// verschachtelten <p>/<span>/<br>-Knoten, Textergänzungen zusätzlich in
// <TextComplement>-Blöcken. Formatierung (style/class) ist für Anzeige, Suche
// und Klassifizierung irrelevant und wird verworfen.

const NODE_TEXT = 3;
const NODE_CDATA = 4;
const NODE_ELEMENT = 1;

/** Elemente, deren Inhalt einen eigenen Absatz bildet. */
const BLOCK_ELEMENTS = new Set(['p', 'div', 'ComplCaption', 'ComplBody', 'ComplTail']);

function walk(node: Node, out: string[]): void {
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === NODE_TEXT || child.nodeType === NODE_CDATA) {
      out.push(child.nodeValue ?? '');
      continue;
    }
    if (child.nodeType !== NODE_ELEMENT) continue;

    const el = child as Element;
    if (el.localName === 'br') {
      out.push('\n');
      continue;
    }
    // <image> transportiert nur Binärdaten/Verweise, kein Text.
    if (el.localName === 'image') continue;

    walk(el, out);
    if (BLOCK_ELEMENTS.has(el.localName)) out.push('\n');
  }
}

function normalize(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Mehrzeiliger Text mit erhaltenen Absätzen (Langtext, Hinweistexte). */
export function extractText(el: Element | null): string {
  if (el === null) return '';
  const out: string[] = [];
  walk(el, out);
  return normalize(out.join(''));
}

/** Einzeiliger Text (Kurztext, Bereichsbezeichnung) — Umbrüche werden zu Leerzeichen. */
export function extractInlineText(el: Element | null): string {
  return extractText(el).replace(/\s+/g, ' ').trim();
}
