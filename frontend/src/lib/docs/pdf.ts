// Begleitdokument als PDF öffnen (Entscheidung 0072). PDF.js (pdfjs-dist) liest die
// Datei im Browser, in einem eigenen Worker; nichts verlässt den Browser. Geladen
// wird PDF.js erst beim ersten Dokument, damit es den Start der App nicht bremst.
//
// Die Datei wird nicht gespeichert — nur ihre Kennung (SHA-256 der Bytes, wie die
// Datei-ID des LV) und ihr Name, damit Notizen nach einem Reload zur selben Datei
// finden.

import { fileIdOf } from '@core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { DOC_ID_LENGTH } from './docNotes';

/** Größer wird es im Browser zäh; Pläne als PDF liegen meist weit darunter. */
export const MAX_PDF_BYTES = 200 * 1024 * 1024;

/** Datei ist kein lesbares PDF oder zu groß. Die Meldung ist für Menschen. */
export class PdfOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfOpenError';
  }
}

export interface OpenedPdf {
  readonly id: string;
  readonly name: string;
  readonly pdf: PDFDocumentProxy;
}

/** PDF nach Typ oder Endung — manche Systeme liefern beim Ziehen keinen Typ mit. */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

type PdfJs = typeof import('pdfjs-dist');

let pdfjs: Promise<PdfJs> | null = null;

// Die „legacy"-Fassung: die normale setzt brandneue JavaScript-Funktionen voraus
// (z. B. `Map.getOrInsertComputed`) und bricht in etwas älteren Browsern ab.
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<PdfJs>,
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjs;
}

/** Kennung eines Dokuments: die ersten Zeichen des SHA-256 seiner Bytes. */
export async function docIdOf(bytes: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle !== undefined) {
    try {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      let hex = '';
      for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
      return hex.slice(0, DOC_ID_LENGTH);
    } catch {
      // Ohne sicheren Kontext fehlt `subtle` oder wirft — dann die eigene Rechnung.
    }
  }
  return fileIdOf(bytes).slice(0, DOC_ID_LENGTH);
}

/** Hat die Datei die Kennung eines PDF? Prüft nur den Anfang, nicht den Rest. */
export function looksLikePdf(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength));
  const text = String.fromCharCode(...head);
  return text.includes('%PDF-');
}

/** Öffnet eine PDF-Datei. Wirft `PdfOpenError`, wenn das nicht geht. */
export async function openPdf(file: File): Promise<OpenedPdf> {
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfOpenError('Die Datei ist größer als 200 MB.');
  }
  const bytes = await file.arrayBuffer();
  if (!looksLikePdf(bytes)) throw new PdfOpenError('Die Datei ist kein PDF.');
  const id = await docIdOf(bytes);
  const lib = await loadPdfJs();
  try {
    // PDF.js reicht den Puffer an seinen Worker weiter; die Kennung steht vorher fest.
    const pdf = await lib.getDocument({
      data: new Uint8Array(bytes),
      enableXfa: false,
    }).promise;
    return { id, name: file.name, pdf };
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PdfOpenError('Das PDF ist mit einem Passwort geschützt.');
    }
    throw new PdfOpenError('Das PDF lässt sich nicht lesen.');
  }
}

/** PDF.js-Bausteine für Seiten: Textebene und Ausgabeskalierung. */
export function pdfLib(): Promise<PdfJs> {
  return loadPdfJs();
}
