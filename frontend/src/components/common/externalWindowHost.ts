// Öffnen und Einrichten des zweiten Fensters (Entscheidung 0039); das Portal
// dorthin ist `ExternalWindow`.

export interface ExternalHost {
  win: Window;
  /** Wurzel im fremden Dokument, in die das Portal rendert. */
  root: HTMLElement;
}

/** Markiert die übernommenen Stile, damit ein Abgleich sie ersetzen kann. */
const COPY_ATTR = 'data-bubble-kopie';

/** Stylesheets des Hauptfensters ins zweite Fenster — Vite hängt sie in den Kopf. */
export function copyStyles(from: Document, to: Document): void {
  to.head.querySelectorAll(`[${COPY_ATTR}]`).forEach((node) => node.remove());
  from.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    let copy: HTMLElement;
    if (node.tagName === 'LINK') {
      // `href` als Eigenschaft ist absolut — ein relativer Pfad gälte in
      // `about:blank` nicht zuverlässig.
      const link = to.createElement('link');
      link.rel = 'stylesheet';
      link.href = (node as HTMLLinkElement).href;
      copy = link;
    } else {
      copy = to.createElement('style');
      copy.textContent = node.textContent;
    }
    copy.setAttribute(COPY_ATTR, '');
    to.head.append(copy);
  });
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
  copyStyles(document, doc);
  const root = doc.createElement('div');
  root.className = 'flex h-screen flex-col overflow-hidden bg-paper';
  doc.body.replaceChildren(root);
  doc.body.style.margin = '0';
  win.focus();
  return { win, root };
}
