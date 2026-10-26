// PDF direkt hinzufügen (Entscheidung 0072): über das Logo-Menü oder per Ziehen auf
// die App. Der Bereich „Dokument“ öffnet sich dabei von selbst.
//
// PDF.js läuft in jsdom nicht; `openPdf` meldet hier darum immer einen Lesefehler.
// Das reicht: Der Bereich muss schon offen sein, damit man die Meldung sieht.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

const pdf = (name: string): File => new File(['%PDF-1.4'], name, { type: 'application/pdf' });

/** Ziehen und Abwerfen am Fenster, wie der Browser es meldet. */
function wirf(files: File[]): void {
  const dataTransfer = {
    types: ['Files'],
    files,
    items: files.map((file) => ({ kind: 'file', type: file.type })),
    dropEffect: 'none',
  };
  for (const type of ['dragover', 'drop']) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    fireEvent(window, event);
  }
}

const dokumentBereich = (): HTMLElement | null =>
  screen.queryByRole('region', { name: 'Dokument — Bereich' });

describe('PDF hinzufügen', () => {
  beforeEach(async () => {
    const { PdfOpenError } = await import('../../src/lib/docs/pdf');
    openPdf.mockReset();
    openPdf.mockRejectedValue(new PdfOpenError('Test: kein lesbares PDF.'));
  });

  it('öffnet über das Logo-Menü den Dateidialog und danach den Bereich „Dokument“', async () => {
    await ladeApp();
    expect(dokumentBereich()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Über diese App' }));
    const zeile = screen.getByRole('button', { name: 'PDF hinzufügen…' });
    const auswahl = screen.getByLabelText<HTMLInputElement>('PDF auswählen');
    const klick = vi.spyOn(auswahl, 'click');
    fireEvent.click(zeile);
    expect(klick).toHaveBeenCalled();

    fireEvent.change(auswahl, { target: { files: [pdf('baubeschreibung.pdf')] } });
    await waitFor(() => expect(dokumentBereich()).not.toBeNull());
    expect(openPdf).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('alert')).toHaveTextContent('Test: kein lesbares PDF.');
  });

  it('öffnet ein auf die App gezogenes PDF, andere Dateien nicht', async () => {
    await ladeApp();

    wirf([new File(['x'], 'anderes.x83', { type: 'application/octet-stream' })]);
    expect(openPdf).not.toHaveBeenCalled();
    expect(dokumentBereich()).toBeNull();

    wirf([pdf('gutachten.pdf')]);
    await waitFor(() => expect(openPdf).toHaveBeenCalledTimes(1));
    expect(dokumentBereich()).not.toBeNull();
  });
});
