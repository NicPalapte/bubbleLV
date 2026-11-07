// Mehrere PDFs im Bereich „Dokument“ (Entscheidung 0094): Liste statt Auswahlliste,
// Übersicht mit Miniaturen, mehrere Dateien auch im leeren Bereich (Issue #211).
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert Schein-PDFs, Seiten werden nicht gezeichnet.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({ PdfPage: () => null }));

const SEITEN: Readonly<Record<string, number>> = {
  'baubeschreibung.pdf': 3,
  'lageplan.pdf': 1,
  'gutachten.pdf': 12,
};

function scheinPdf(file: File): OpenedPdf {
  const pdf = {
    numPages: SEITEN[file.name] ?? 1,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: () =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [] }),
      }),
  };
  return { id: `id-${file.name}`.padEnd(12, '0'), name: file.name, pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
}

const pdf = (name: string): File => new File(['%PDF'], name, { type: 'application/pdf' });

function oeffne(names: string[]): void {
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: names.map(pdf) },
  });
}

describe('Mehrere PDFs', () => {
  beforeEach(() => {
    openPdf.mockReset();
    openPdf.mockImplementation((file: File) => Promise.resolve(scheinPdf(file)));
  });

  it('zeigt nach mehreren Dateien die Übersicht und öffnet per Klick zum Lesen', async () => {
    await ladeApp();
    oeffne(['baubeschreibung.pdf', 'lageplan.pdf', 'gutachten.pdf']);

    const liste = await screen.findByRole('list', { name: 'Offene Dokumente' });
    const karten = () =>
      within(liste)
        .getAllByRole('button')
        .filter((knopf) => !knopf.hasAttribute('aria-label'));
    expect(karten()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Übersicht · 3' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Sortieren' }), {
      target: { value: 'name' },
    });
    expect(karten().map((karte) => karte.title)).toEqual([
      'baubeschreibung.pdf',
      'gutachten.pdf',
      'lageplan.pdf',
    ]);

    fireEvent.click(within(liste).getByTitle('lageplan.pdf'));
    expect(
      await screen.findByRole('button', { name: 'Dokument wählen: lageplan.pdf' }),
    ).toHaveTextContent('2 von 3');
    expect(screen.queryByRole('list', { name: 'Offene Dokumente' })).toBeNull();
  });

  it('wechselt über die Dokumentliste, ✕ führt zur Übersicht, entfernt nur dort', async () => {
    await ladeApp();
    oeffne(['baubeschreibung.pdf']);
    oeffne(['gutachten.pdf']);
    const knopf = await screen.findByRole('button', { name: 'Dokument wählen: gutachten.pdf' });

    fireEvent.click(knopf);
    const dialog = screen.getByRole('dialog', { name: 'Offene Dokumente' });
    const zeile = within(dialog).getByRole('button', { name: /baubeschreibung\.pdf/ });
    expect(zeile).toHaveTextContent('3');
    fireEvent.click(zeile);
    expect(
      screen.getByRole('button', { name: 'Dokument wählen: baubeschreibung.pdf' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zur Übersicht' }));
    const liste = await screen.findByRole('list', { name: 'Offene Dokumente' });
    expect(screen.getByRole('button', { name: 'Übersicht · 2' })).toBeInTheDocument();

    fireEvent.click(within(liste).getByRole('button', { name: 'gutachten.pdf entfernen' }));
    expect(await screen.findByRole('button', { name: 'Übersicht · 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lesen' }));
    expect(screen.queryByRole('list', { name: 'Offene Dokumente' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Dokument wählen: baubeschreibung.pdf' }),
    ).toBeInTheDocument();
  });

  it('öffnet im leeren Bereich alle gewählten Dateien, nicht nur die erste', async () => {
    await ladeApp();
    fireEvent.click(screen.getByRole('button', { name: /^Ansicht/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dokument' }));
    const bereich = await screen.findByRole('region', { name: 'Dokument — Bereich' });

    fireEvent.change(within(bereich).getByLabelText('PDF öffnen'), {
      target: { files: [pdf('baubeschreibung.pdf'), pdf('lageplan.pdf')] },
    });
    await waitFor(() => expect(openPdf).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('list', { name: 'Offene Dokumente' })).toBeInTheDocument();
  });
});

describe('Ganzes Dokument verknüpfen (Issue #191)', () => {
  beforeEach(() => {
    openPdf.mockReset();
    openPdf.mockImplementation((file: File) => Promise.resolve(scheinPdf(file)));
  });

  it('verknüpft das PDF ohne Textstelle mit einer Position', async () => {
    await ladeApp();
    oeffne(['baubeschreibung.pdf']);
    fireEvent.click(await screen.findByRole('button', { name: 'Dokument verknüpfen' }));
    const dialog = screen.getByRole('dialog', { name: 'Mit Position verknüpfen' });
    fireEvent.change(within(dialog).getByPlaceholderText('OZ oder Text suchen'), {
      target: { value: '0010' },
    });
    fireEvent.click(within(dialog).getAllByRole('checkbox')[0]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verknüpfen' }));
    expect(
      await screen.findByRole('button', { name: 'Dokument verknüpft · 1' }),
    ).toBeInTheDocument();
    // Blättern durch die Stellen bleibt aus: das ganze Dokument ist keine Stelle.
    expect(screen.queryByRole('group', { name: 'Eigene Stellen' })).toBeNull();
  });
});
