// Eine Suche für LV und PDFs (Entscheidung 0077): Der Begriff aus der Suchleiste läuft
// durch alle offenen PDFs, die Liste unter der Suchleiste zeigt Treffer je Quelle.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF mit festem Seitentext,
// und die Seiten selbst werden nicht gezeichnet.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const SEITEN = [
  'Abdichtung der Kellerwände mit Bitumendickbeschichtung.',
  'Bodenplatte aus WU-Beton.',
  'Übergang Bitumendickbeschichtung zu WU-Beton mit Fugenblech.',
];

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({ PdfPage: () => null }));

function scheinPdf(name: string): OpenedPdf {
  const pdf = {
    numPages: SEITEN.length,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [{ str: SEITEN[page - 1] }] }),
      }),
  };
  return { id: 'abc123def456', name, pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

async function oeffnePdf(name: string): Promise<void> {
  openPdf.mockResolvedValue(scheinPdf(name));
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: [new File(['%PDF'], name, { type: 'application/pdf' })] },
  });
  await screen.findByRole('textbox', { name: 'Suchen in LV und Dokumenten' });
}

describe('Eine Suche für LV und PDFs', () => {
  it('zeigt Treffer je Quelle unter der Suchleiste und springt ins PDF', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');

    const suche = screen.getByRole('textbox', { name: 'Suche' });
    fireEvent.focus(suche);
    fireEvent.change(suche, { target: { value: 'bitumendick' } });

    const liste = await screen.findByRole('group', { name: 'Treffer je Quelle' });
    expect(within(liste).getByText('Leistungsverzeichnis')).toBeInTheDocument();
    await waitFor(() => expect(within(liste).getByText('S. 1 · 3')).toBeInTheDocument());

    // Das Suchfeld im Dokument zeigt denselben Begriff und zählt die Treffer.
    const imDokument = screen.getByRole('textbox', { name: 'Suchen in LV und Dokumenten' });
    expect(imDokument).toHaveValue('bitumendick');
    expect(await screen.findByText('1/2')).toBeInTheDocument();

    fireEvent.click(
      within(liste).getByRole('button', { name: 'baubeschreibung.pdf: zur ersten Fundstelle' }),
    );
    expect(screen.queryByRole('group', { name: 'Treffer je Quelle' })).toBeNull();
  });

  it('übernimmt Tippen im Dokument in die Suchleiste', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    const imDokument = screen.getByRole('textbox', { name: 'Suchen in LV und Dokumenten' });
    fireEvent.change(imDokument, { target: { value: 'Fugenblech' } });
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveValue('Fugenblech'),
    );
  });

  it('zeigt ohne PDF keine Liste', async () => {
    await ladeApp();
    const suche = screen.getByRole('textbox', { name: 'Suche' });
    fireEvent.focus(suche);
    fireEvent.change(suche, { target: { value: 'beton' } });
    await new Promise((done) => setTimeout(done, 400));
    expect(screen.queryByRole('group', { name: 'Treffer je Quelle' })).toBeNull();
  });
});
