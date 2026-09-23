// Kommandopalette in der App (WP-P, Schritt 1). Die Abnahme aus dem Plan:
// „Strg/Cmd + K: zu OZ springen, Filter setzen, Ansicht wechseln."

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
}

function palette(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Kommandopalette' });
}

function feld(): HTMLElement {
  return screen.getByLabelText('Befehl oder OZ');
}

function tippe(text: string): void {
  fireEvent.change(feld(), { target: { value: text } });
}

/**
 * Strg + K auf dem Fenster — so kommt die Palette im Betrieb hoch.
 *
 * Das leere `act` davor ist nicht Zierde: der Listener hängt in einem
 * `useEffect`, und React führt den **nach** dem Commit aus. `waitFor` sieht
 * das fertige DOM schon vorher — ein Tastendruck in genau diesem Moment läuft
 * ins Leere. Im Browser ist das ein Bruchteil einer Millisekunde und niemandem
 * zumutbar zu treffen; im Test traf es jeden zweiten Lauf.
 */
async function strgK(): Promise<void> {
  await act(async () => {});
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
}

describe('Kommandopalette · öffnen und schließen', () => {
  it('kommt mit Strg + K und geht mit Escape', async () => {
    await ladeApp();
    expect(screen.queryByRole('dialog', { name: 'Kommandopalette' })).toBeNull();

    await strgK();
    expect(feld()).toHaveFocus();

    fireEvent.keyDown(palette(), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Kommandopalette' })).toBeNull();
  });

  it('lässt sich auch über den Chip in der Kopfleiste öffnen', async () => {
    await ladeApp();
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /Befehle/ }));
    expect(palette()).toBeInTheDocument();
  });

  it('beginnt jedes Mal leer', async () => {
    await ladeApp();
    await strgK();
    tippe('Matrix');
    fireEvent.keyDown(palette(), { key: 'Escape' });
    await strgK();
    expect(feld()).toHaveValue('');
  });
});

describe('Kommandopalette · Ansicht wechseln', () => {
  it('wechselt mit Enter in die getippte Ansicht', async () => {
    await ladeApp();
    await strgK();
    tippe('Matrix');
    fireEvent.keyDown(palette(), { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Matrix' })).toHaveAttribute('aria-checked', 'true'),
    );
    // Und die Palette ist danach weg.
    expect(screen.queryByRole('dialog', { name: 'Kommandopalette' })).toBeNull();
  });

  it('geht mit den Pfeiltasten durch die Treffer', async () => {
    await ladeApp();
    await strgK();
    tippe('a');
    const erste = within(palette()).getAllByRole('option')[0];
    fireEvent.keyDown(palette(), { key: 'ArrowDown' });
    expect(within(palette()).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(erste).toHaveAttribute('aria-selected', 'false');
  });
});

describe('Kommandopalette · Filter setzen', () => {
  it('setzt einen Facettenwert — derselbe Filter wie über die Chips', async () => {
    await ladeApp();
    await strgK();
    tippe('Einheit m');
    const zeile = within(palette()).getAllByRole('option')[0];
    const beschriftung = zeile.textContent ?? '';
    fireEvent.click(zeile);

    // Der gesetzte Filter steht danach in der Kopfleiste.
    await waitFor(() => {
      const leiste = within(screen.getByRole('banner'));
      expect(leiste.getByRole('button', { name: /Einheit/ })).toHaveTextContent(/\d/);
    });
    expect(beschriftung).toContain('Einheit');
  });
});

describe('Kommandopalette · zu einer Position springen', () => {
  it('findet die Position über ihre OZ und öffnet sie in der Tabelle', async () => {
    await ladeApp();
    await strgK();
    tippe('001.004.0030');

    const zeile = within(palette()).getAllByRole('option')[0];
    expect(zeile).toHaveTextContent('001.004.0030');
    fireEvent.click(zeile);

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    expect(screen.getAllByText('001.004.0030').length).toBeGreaterThan(0);
  });

  it('sagt es, wenn nichts passt, statt eine leere Liste zu zeigen', async () => {
    await ladeApp();
    await strgK();
    tippe('gibtesnichtimlv');
    expect(within(palette()).getByText('Kein Befehl')).toBeInTheDocument();
  });
});
