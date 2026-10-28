// Vorschläge im Begleitdokument (Entscheidung 0080): OZ und Mengen aus dem LV
// erscheinen gestrichelt; verknüpft wird erst nach „Verknüpfen“, „Nein“ merkt sich
// die Ablehnung. Seitentext erfunden, LV aus den öffentlichen Fixtures.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF mit festem Seitentext,
// und die Seite zeigt statt Bild und Textebene nur Knöpfe für ihre Vorschläge.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { DocSuggestion } from '../../src/lib/docs/docSuggest';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const SEITEN = [
  'Nach Pos. 1.2.20 sind 7.200 m³ Boden zu lösen.',
  'Zusätzlich 783,03 m³ Beton für die Bodenplatte.',
];

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({
  PdfPage: ({
    suggestions,
    onSuggestion,
  }: {
    suggestions: readonly DocSuggestion[];
    onSuggestion: (item: DocSuggestion, at: { left: number; top: number }) => void;
  }) =>
    suggestions.map((item) => (
      <button
        key={`${item.start}-${item.id}`}
        type="button"
        onClick={() => onSuggestion(item, { left: 10, top: 10 })}
      >
        {`Vorschlag ${item.text}`}
      </button>
    )),
}));

function scheinPdf(): OpenedPdf {
  const pdf = {
    numPages: SEITEN.length,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [{ str: SEITEN[page - 1] }] }),
      }),
  };
  return { id: 'abc123def456', name: 'baubeschreibung.pdf', pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeAppMitPdf(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
  openPdf.mockResolvedValue(scheinPdf());
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: [new File(['%PDF'], 'baubeschreibung.pdf', { type: 'application/pdf' })] },
  });
  // Langsame CI-Rechner: Bereich und Vorschläge brauchen dort mehrere Sekunden.
  await screen.findByRole('group', { name: 'Vorschläge' }, { timeout: 8000 });
}

describe('Vorschläge im Dokument', { timeout: 20000 }, () => {
  it('OZ mit Menge zum Vergleich, verknüpft erst nach Klick', async () => {
    await ladeAppMitPdf();
    const schalter = screen.getByRole('group', { name: 'Vorschläge' });
    await waitFor(() => expect(within(schalter).getByText(/OZ 1/)).toBeInTheDocument());
    expect(within(schalter).getByText(/Mengen 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag 1.2.20' }));
    const leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('001.002.0020')).toBeInTheDocument();
    expect(within(leiste).getByText('PDF 7.200 m³ · LV 7.200 m3')).toBeInTheDocument();

    // „Position zeigen“ wählt die Position, die Leiste bleibt zum Entscheiden offen.
    expect(screen.getByText('Keine Auswahl')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Position zeigen ›' }));
    await waitFor(() => expect(screen.queryByText('Keine Auswahl')).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' })).toBeInTheDocument();

    fireEvent.click(within(leiste).getByRole('button', { name: 'Verknüpfen' }));
    expect(screen.queryByRole('dialog', { name: 'Vorschlag verknüpfen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vorschlag 1.2.20' })).toBeNull();
    // Alle OZ-Vorschläge erledigt: ihr Schalter verschwindet, der für Mengen bleibt.
    expect(within(schalter).queryByText(/OZ/)).toBeNull();
    expect(within(schalter).getByText(/Mengen 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag 783,03 m³' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nein' }));
    expect(screen.queryByRole('group', { name: 'Vorschläge' })).toBeNull();
  });

  it('„Nein“ blendet den Vorschlag aus, der Schalter blendet eine Art aus', async () => {
    await ladeAppMitPdf();
    const menge = await screen.findByRole('button', { name: 'Vorschlag 783,03 m³' });
    fireEvent.click(menge);
    const leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('Menge passt zu')).toBeInTheDocument();
    expect(within(leiste).getByText('001.003.0040')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Nein' }));
    expect(screen.queryByRole('button', { name: 'Vorschlag 783,03 m³' })).toBeNull();

    const schalter = screen.getByRole('group', { name: 'Vorschläge' });
    const oz = within(schalter).getByRole('button', { name: /OZ/ });
    fireEvent.click(oz);
    expect(oz).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Vorschlag 1.2.20' })).toBeNull();
    fireEvent.click(oz);
    expect(await screen.findByRole('button', { name: 'Vorschlag 1.2.20' })).toBeInTheDocument();
  });
});
