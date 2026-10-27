// PDF auf die App ziehen: öffnet es als Begleitdokument im Bereich „Dokument“
// (Entscheidung 0072). Gilt für die ganze Arbeitsfläche, nicht nur für den leeren
// Bereich „Dokument“ — der muss dafür nicht erst offen sein.
//
// Lauscht am Fenster, damit kein Bereich etwas dafür tun muss. Hat ein Bereich den
// Abwurf schon selbst genommen (`defaultPrevented`, z. B. der leere Bereich
// „Dokument“), bleibt es dabei.

import { useEffect, useRef, useState } from 'react';
import { useDocuments } from './DocumentsProvider';

type Over = 'pdf' | 'other' | null;

/** Was gezogen wird: PDF, sicher kein PDF oder (ohne Angabe des Typs) vermutlich PDF. */
function overOf(transfer: DataTransfer | null): Over {
  if (transfer === null || !transfer.types.includes('Files')) return null;
  const files = [...transfer.items].filter((item) => item.kind === 'file');
  // Manche Browser nennen den Typ erst beim Abwerfen — dann wohlwollend „PDF“.
  if (files.length === 0 || files.some((item) => item.type === 'application/pdf')) return 'pdf';
  return files.every((item) => item.type !== '') ? 'other' : 'pdf';
}

export function PdfDrop() {
  const { openFiles } = useDocuments();
  const [over, setOver] = useState<Over>(null);
  const timer = useRef(0);

  useEffect(() => {
    // `dragleave` feuert bei jedem Kind-Element; robuster: Overlay hält, solange
    // `dragover` kommt (der Browser schickt es laufend), und geht kurz danach.
    const hideSoon = (): void => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOver(null), 150);
    };
    const onDragOver = (event: DragEvent): void => {
      const kind = overOf(event.dataTransfer);
      if (kind === null) return;
      // Ohne `preventDefault` öffnete der Browser die Datei und verwürfe die Sitzung.
      event.preventDefault();
      if (event.dataTransfer !== null) {
        event.dataTransfer.dropEffect = kind === 'pdf' ? 'copy' : 'none';
      }
      setOver(kind);
      hideSoon();
    };
    const onDrop = (event: DragEvent): void => {
      if (event.dataTransfer === null || !event.dataTransfer.types.includes('Files')) return;
      window.clearTimeout(timer.current);
      setOver(null);
      if (event.defaultPrevented) return;
      event.preventDefault();
      void openFiles([...event.dataTransfer.files]);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.clearTimeout(timer.current);
    };
  }, [openFiles]);

  if (over === null) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
    >
      <div className="flex flex-col items-center gap-[4px] rounded-[var(--r-md)] bg-surface px-[22px] py-[16px] text-center shadow-[var(--shadow-sm)]">
        <b className="font-display text-[16px] font-semibold text-ink">
          {over === 'pdf' ? 'PDF loslassen' : 'Nur PDF-Dateien'}
        </b>
        <span className="text-[12.5px] text-mute">
          {over === 'pdf'
            ? 'öffnet sich im Bereich „Dokument“'
            : 'Ein anderes LV öffnest du über das Logo-Menü.'}
        </span>
      </div>
    </div>
  );
}
