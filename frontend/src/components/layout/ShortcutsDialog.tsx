// „Tastenkürzel" aus dem Logo-Menü: alle Tasten auf einen Blick. Seit es keine
// Befehlspalette mehr gibt (Entscheidung 0038), ist das der Ort, an dem man sie
// nachschlagen kann. Die Liste beschreibt, was die Komponenten tatsächlich
// tun (TopBar, ViewerPage, BubbleGraph, DataTable, useDragResize).

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';

interface Kuerzel {
  keys: readonly string[];
  label: string;
}

/** Auf dem Mac heißt die Taste „⌘", sonst „Strg". */
function modKey(): string {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Strg';
}

function groups(mod: string): readonly { title: string; items: readonly Kuerzel[] }[] {
  return [
    {
      title: 'Überall',
      items: [
        { keys: [`${mod} K`, '/'], label: 'Suche' },
        { keys: ['?'], label: 'Diese Übersicht' },
        { keys: ['Esc'], label: 'Auswahl zurücknehmen, Menü schließen' },
      ],
    },
    {
      title: 'Graph',
      items: [
        { keys: ['← → ↑ ↓'], label: 'Durch Positionen und Abschnitte' },
        { keys: ['Enter'], label: 'Position öffnen' },
        { keys: ['F'], label: 'Auf die Auswahl zoomen' },
        { keys: ['Mausrad'], label: 'Zoomen' },
        { keys: ['Shift + Klick'], label: 'In den Vergleich' },
      ],
    },
    {
      title: 'Tabelle',
      items: [
        { keys: ['↑ ↓'], label: 'Zeile wechseln' },
        { keys: ['Bild ↑', 'Bild ↓'], label: 'Seitenweise' },
        { keys: ['Pos 1', 'Ende'], label: 'Erste / letzte Zeile' },
        { keys: ['Enter'], label: 'Position öffnen' },
        { keys: ['Shift + Klick'], label: 'In den Vergleich' },
      ],
    },
    {
      title: 'Fenster',
      items: [
        { keys: ['← → ↑ ↓'], label: 'Größe ändern, wenn der Griff im Fokus ist' },
        { keys: ['↗'], label: 'Tabelle in eigenes Fenster, z. B. zweiter Bildschirm' },
      ],
    },
  ];
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Capture-Phase wie beim Melde-Fenster: Escape schließt nur dieses Fenster.
  useDismiss(dialogRef, true, onClose);

  return createPortal(
    <div
      className="nur-bildschirm fixed inset-0 z-[60] flex items-start justify-center bg-[var(--backdrop)] pt-[8vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Tastenkürzel"
        className="ov-window max-h-[84vh] w-[min(480px,calc(100vw-32px))] overflow-auto"
      >
        <div className="flex h-[44px] items-center border-b border-line pl-[16px] pr-[6px]">
          <b className="flex-1 font-sans text-[14px] font-semibold text-ink">Tastenkürzel</b>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tastenkürzel schließen"
            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-[14px] p-[16px]">
          {groups(modKey()).map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="mb-[6px] font-mono text-[9.5px] font-medium uppercase tracking-[0.6px] text-mute">
                {group.title}
              </h3>
              <dl className="m-0 flex flex-col gap-[4px]">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-[12px]">
                    <dt className="flex w-[150px] shrink-0 flex-wrap gap-[4px]">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded-[5px] border border-line bg-sunken px-[6px] py-[1px] font-mono text-[10.5px] text-ink"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="m-0 font-sans text-[12.5px] text-ink">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
