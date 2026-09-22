// Ansicht „Vergleich" (WP-N): Positionen sammeln, nebeneinanderlegen,
// Unterschiede sehen — und wieder zurück in den Zusammenhang.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

async function ladeTabelle(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Tabelle' }));
}

/** Die Kopfzeile der Ansicht als Text — Zahl und Wort stehen getrennt im Markup. */
function kopfzeile(): string {
  return screen.getByText(/nebeneinander/).textContent ?? '';
}

/** Zeilen der Positionstabelle, in der gezeichneten Reihenfolge. */
function tabellenzeilen(): HTMLElement[] {
  const table = screen.getByRole('table', { name: 'Positionen' });
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('aria-selected') !== null);
}

describe('Vergleich', () => {
  it('steht leer da, solange nichts gewählt ist', async () => {
    await ladeTabelle();
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getByText(/Keine Position im Vergleich/)).toBeInTheDocument();
  });

  it('sammelt Positionen per Strg-Klick und legt sie nebeneinander', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });

    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(kopfzeile()).toContain('2 Positionen nebeneinander');
    // Eine Zeile je Merkmal, eine Spalte je Position.
    expect(screen.getByRole('rowheader', { name: 'MENGE' })).toBeInTheDocument();
  });

  it('zeigt auf Wunsch nur die Zeilen, die sich unterscheiden', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    const alle = screen.getAllByRole('row').length;
    fireEvent.click(screen.getByRole('radio', { name: 'Nur Unterschiede' }));
    const nurDiffs = screen.getAllByRole('row').length;
    expect(nurDiffs).toBeLessThan(alle);
    // Was stehen bleibt, ist auch als Unterschied markiert.
    for (const row of screen.getAllByRole('row')) {
      expect(row.getAttribute('data-differs')).toBe('true');
    }
  });

  it('nimmt eine Position auf Klick wieder heraus', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    fireEvent.click(screen.getAllByRole('button', { name: /aus dem Vergleich nehmen/ })[0]);
    expect(kopfzeile()).toContain('1 Position nebeneinander');
    expect(
      screen.getByText(/Eine zweite Position macht daraus einen Vergleich/),
    ).toBeInTheDocument();
  });

  it('führt aus jeder Spalte zurück in die Tabelle', async () => {
    await ladeTabelle();
    fireEvent.click(tabellenzeilen()[0], { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'IN DER TABELLE' })[0]);
    expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('table', { name: 'Positionen' })).toBeInTheDocument();
  });

  it('lässt den Filter und die Auswahl unangetastet', async () => {
    await ladeTabelle();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(screen.getByLabelText('Suche')).toHaveValue('Beton'));
    fireEvent.click(tabellenzeilen()[0], { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });
});
