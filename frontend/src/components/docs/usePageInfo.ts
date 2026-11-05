// Text oder Plan je Seite schätzen und Maßstäbe aus dem Plankopf lesen (Entscheidung
// 0095). Läuft einmal je Dokument im Hintergrund, Seite für Seite; der Seitentext kommt
// aus dem Zwischenspeicher der PDF-Suche.

import { useEffect, useState } from 'react';
import { guessPageKind, ratiosInText, type PageKind } from '@core';
import type { OpenedPdf } from '../../lib/docs/pdf';

export interface PageInfo {
  /** Geschätzte Seitenart; die Umstellung von Hand steht in den Notizen. */
  readonly guess: PageKind;
  /** Maßstäbe 1:x aus dem Seitentext, häufigste zuerst. */
  readonly ratios: readonly number[];
}

/** So viele Seiten, dann zeigt die Anzeige den Zwischenstand. */
const BATCH = 16;

export function usePageInfo(
  doc: OpenedPdf,
  pageText: (doc: OpenedPdf, page: number) => Promise<string>,
): ReadonlyMap<number, PageInfo> {
  const [info, setInfo] = useState<{ doc: string; pages: ReadonlyMap<number, PageInfo> }>({
    doc: doc.id,
    pages: new Map(),
  });
  useEffect(() => {
    let alive = true;
    const found = new Map<number, PageInfo>();
    const run = async (): Promise<void> => {
      for (let page = 1; page <= doc.pdf.numPages && alive; page += 1) {
        try {
          const proxy = await doc.pdf.getPage(page);
          const view = proxy.getViewport({ scale: 1 });
          const text = await pageText(doc, page);
          found.set(page, {
            guess: guessPageKind({ width: view.width, height: view.height, chars: text.length }),
            ratios: ratiosInText(text),
          });
        } catch {
          // Defekte Seite: gilt als Text, ohne Maßstab.
          found.set(page, { guess: 'text', ratios: [] });
        }
        if (alive && (page % BATCH === 0 || page === doc.pdf.numPages)) {
          setInfo({ doc: doc.id, pages: new Map(found) });
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [doc, pageText]);
  return info.doc === doc.id ? info.pages : NO_INFO;
}

const NO_INFO: ReadonlyMap<number, PageInfo> = new Map();
