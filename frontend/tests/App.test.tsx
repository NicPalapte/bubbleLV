import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function fixtureFile(name: string): File {
  return new File([readFileSync(resolve(FIXTURE_DIR, name))], name);
}

async function loadFixture(name: string): Promise<void> {
  const input = screen.getByLabelText('GAEB-Datei auswählen');
  fireEvent.change(input, { target: { files: [fixtureFile(name)] } });
}

describe('Viewer', () => {
  it('zeigt vor dem Import die Datei-Ablage und keine Fachdaten', () => {
    render(<App />);
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
    expect(screen.getAllByText('Kein LV geladen').length).toBeGreaterThan(0);
  });

  it('lädt eine echte GAEB-Datei und zeigt Baum und Filter', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');

    await waitFor(() =>
      expect(screen.queryByText('GAEB-Datei hierher ziehen')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('FILTER')).toBeInTheDocument();
    expect(screen.getByText(/Übersicht ·/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Positionsart/ })).toBeInTheDocument();
  });

  it('drillt aus dem Baum in die Positionstabelle', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Erstes Los aufklappen, dann den ersten Abschnitt wählen.
    const [lot] = within(screen.getByRole('tree')).getAllByRole('treeitem');
    fireEvent.click(lot);

    const table = await screen.findByRole('table', { name: 'Positionen' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.trim().replace(/\s+[↑↓]$/, ''));
    expect(headers).toContain('Bezeichnung');
    expect(headers).toContain('Positionsart');
    expect(headers).toContain('Bauteiltyp');
    // Erste Position der Beispieldatei ist in der Tabelle sichtbar.
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);
  });

  it('filtert die Tabelle über die Suche', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    const [lot] = within(screen.getByRole('tree')).getAllByRole('treeitem');
    fireEvent.click(lot);
    const table = await screen.findByRole('table', { name: 'Positionen' });
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Suche'), {
      target: { value: 'zzz-kein-treffer-zzz' },
    });
    await waitFor(() =>
      expect(screen.getByText('Keine Positionen entsprechen den Filtern.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('zeigt eine verständliche Fehlermeldung bei nicht unterstützter GAEB-Version', async () => {
    render(<App />);
    await loadFixture('unsupported-version.x83');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/wird nicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
  });
});
