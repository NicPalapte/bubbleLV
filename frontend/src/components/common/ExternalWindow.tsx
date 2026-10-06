// Zweites Browserfenster für eine Fläche der App — gedacht für den zweiten
// Bildschirm (Entscheidung 0039). Kein eigenes Dokument mit eigener App: das
// Fenster ist ein leeres `about:blank` derselben Herkunft, in das React per
// Portal rendert. Dadurch gilt derselbe Zustand (Filter, Auswahl, Vergleich)
// ohne Abgleich, und keine Fachdaten verlassen den Browser.
//
// Grenzen: ein Reload der Hauptseite verwirft den Zustand und schließt das
// Fenster mit; der Browser kann das Öffnen blockieren (dann `null`).

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HostWindowContext } from './hostWindow';
import { copyTheme, syncStyles, type ExternalHost } from './externalWindowHost';
import { subscribeTheme } from '../../lib/theme';

/** Wie oft nachgesehen wird, ob das Fenster zu ist — `pagehide` kommt nicht immer. */
const CLOSED_POLL_MS = 500;

export function ExternalWindow({
  host,
  onClosed,
  children,
}: {
  host: ExternalHost;
  /** Das Fenster wurde von Hand geschlossen. */
  onClosed: () => void;
  children: ReactNode;
}) {
  const closedRef = useRef(onClosed);
  useEffect(() => {
    closedRef.current = onClosed;
  }, [onClosed]);
  // Schließen erst nach dem Abbau: StrictMode baut Effekte einmal ab und
  // sofort wieder auf — ein direktes `close()` schlösse das Fenster dabei.
  const pendingClose = useRef<{ win: Window; timer: number } | null>(null);

  useEffect(() => {
    const { win } = host;
    if (pendingClose.current?.win === win) window.clearTimeout(pendingClose.current.timer);
    pendingClose.current = null;

    const closed = (): void => closedRef.current();
    const poll = window.setInterval(() => {
      if (win.closed) closed();
    }, CLOSED_POLL_MS);
    const closeWithMain = (): void => win.close();

    // Nachgeladene oder (im Entwicklungsmodus) geänderte Stile mitnehmen.
    const styles = new MutationObserver(() => syncStyles(document, win.document));
    styles.observe(document.head, { childList: true, subtree: true, characterData: true });
    const stopTheme = subscribeTheme(() => copyTheme(document, win.document));
    copyTheme(document, win.document);

    win.addEventListener('pagehide', closed);
    window.addEventListener('pagehide', closeWithMain);
    return () => {
      window.clearInterval(poll);
      styles.disconnect();
      stopTheme();
      win.removeEventListener('pagehide', closed);
      window.removeEventListener('pagehide', closeWithMain);
      pendingClose.current = { win, timer: window.setTimeout(() => win.close(), 0) };
    };
  }, [host]);

  return createPortal(
    <HostWindowContext.Provider value={host.win}>{children}</HostWindowContext.Provider>,
    host.root,
  );
}
