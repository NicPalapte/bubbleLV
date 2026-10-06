// Öffnen und Einrichten des zweiten Fensters (Entscheidung 0039); das Portal
// dorthin ist `ExternalWindow`.

export interface ExternalHost {
  win: Window;
  /** Wurzel im fremden Dokument, in die das Portal rendert. */
  root: HTMLElement;
}

/** Markiert die übernommenen Stile im zweiten Fenster. */
const COPY_ATTR = 'data-bubble-kopie';

/** Je Zieldokument: Quellknoten im Hauptfenster → seine Kopie. */
const copiesByDocument = new WeakMap<Document, Map<Element, HTMLElement>>();

function copyOf(node: Element, to: Document): HTMLElement {
  if (node.tagName === 'LINK') {
    // `href` als Eigenschaft ist absolut — ein relativer Pfad gälte in
    // `about:blank` nicht zuverlässig.
    const link = to.createElement('link');
    link.rel = 'stylesheet';
    link.href = (node as HTMLLinkElement).href;
    link.setAttribute(COPY_ATTR, '');
    return link;
  }
  const style = to.createElement('style');
  style.textContent = node.textContent;
  style.setAttribute(COPY_ATTR, '');
  return style;
}

/**
 * Stylesheets des Hauptfensters ins zweite Fenster — Vite hängt sie in den
 * Kopf. Gleicht nur ab, was sich geändert hat: ein neu gesetztes `<link>` lüde
 * das Stylesheet neu, das Fenster stünde kurz ungestaltet da.
 */
export function syncStyles(from: Document, to: Document): void {
  let copies = copiesByDocument.get(to);
  if (copies === undefined) {
    to.head.querySelectorAll(`[${COPY_ATTR}]`).forEach((node) => node.remove());
    copies = new Map();
    copiesByDocument.set(to, copies);
  }
  const sources = new Set(from.head.querySelectorAll('style, link[rel="stylesheet"]'));
  for (const [source, copy] of copies) {
    if (sources.has(source)) continue;
    copy.remove();
    copies.delete(source);
  }
  for (const source of sources) {
    const copy = copies.get(source);
    if (copy === undefined) {
      const fresh = copyOf(source, to);
      copies.set(source, fresh);
      to.head.append(fresh);
    } else if (source.tagName === 'LINK') {
      const href = (source as HTMLLinkElement).href;
      if ((copy as HTMLLinkElement).href !== href) (copy as HTMLLinkElement).href = href;
    } else if (copy.textContent !== source.textContent) {
      copy.textContent = source.textContent;
    }
  }
}

export function copyTheme(from: Document, to: Document): void {
  const theme = from.documentElement.dataset.theme;
  if (theme === undefined) delete to.documentElement.dataset.theme;
  else to.documentElement.dataset.theme = theme;
}

/**
 * Öffnet (oder übernimmt) das Fenster `name` und bereitet es vor. Muss direkt
 * im Klick laufen — außerhalb einer Nutzergeste blockiert der Browser.
 */
export function openExternalWindow(
  name: string,
  title: string,
  size: { width: number; height: number },
): ExternalHost | null {
  const left = window.screenX + Math.max(0, window.outerWidth - size.width);
  const top = window.screenY + 60;
  const features = `popup,width=${size.width},height=${size.height},left=${left},top=${top}`;
  const win = window.open('', name, features);
  if (win === null) return null;

  const doc = win.document;
  doc.title = title;
  doc.documentElement.lang = document.documentElement.lang;
  copyTheme(document, doc);
  syncStyles(document, doc);
  const root = doc.createElement('div');
  root.className = 'flex h-screen flex-col overflow-hidden bg-paper';
  doc.body.replaceChildren(root);
  doc.body.style.margin = '0';
  win.focus();
  return { win, root };
}
