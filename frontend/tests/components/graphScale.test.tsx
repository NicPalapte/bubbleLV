// Größe, Anteil und Sprung im Graphen (WP-Q, Schritt 3–5; Issue #51):
// Abschnitte zeigen ihren Anteil am Ganzen, der Größenmodus „Menge" steht nur
// zur Wahl, wo Mengen vergleichbar sind, und aus der Auswahlkarte führt ein
// Weg in die Tabellenzeile.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

// jsdom misst jedes Element mit 0×0 — dann läge der ganze Graph außerhalb des
// Ausschnitts und es würde keine einzige Bubble gezeichnet.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function rect(): DOMRect {
    return {
      width: 1200,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

async function loadAndShowGraph(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/** Reiter „Filter" im Seitenfenster: dort stehen Darstellung und Facetten. */
function oeffneFilter(): void {
  fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
}

function graphText(): string {
  return [...document.querySelectorAll('[aria-label^="Bubble-Graph"] svg')]
    .map((svg) => svg.textContent ?? '')
    .join(' ');
}

describe('Größe und Anteil', () => {
  it('schreibt den Anteil am Ganzen an die Abschnitte', async () => {
    await loadAndShowGraph();
    // Im Modus „Anz. Positionen" ist der Anteil die Positionszahl am LV.
    expect(graphText()).toMatch(/\d+ %/);
  });

  it('sperrt den Modus „Menge", solange mehrere Einheiten im Spiel sind', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    const modi = screen.getByRole('radiogroup', { name: 'Größe der Bubbles' });
    const menge = within(modi).getByRole('radio', { name: /MENGE/ });
    expect(menge).toBeDisabled();
    expect(menge.getAttribute('title')).toContain('nur innerhalb einer Einheit');
  });
});

describe('Menge in der Isolation', () => {
  it('gibt den Gruppen unterschiedliche Größen, nicht allen dieselbe', async () => {
    await loadAndShowGraph();

    // Auf eine Einheit filtern — erst dann ist der Mengenvergleich zulässig.
    oeffneFilter();
    fireEvent.click(within(screen.getByRole('region', { name: 'Einheit' })).getByTitle('m³'));

    const modi = await screen.findByRole('radiogroup', { name: 'Größe der Bubbles' });
    const menge = within(modi).getByRole('radio', { name: /MENGE/ });
    expect(menge).not.toBeDisabled();
    fireEvent.click(menge);

    // Isolation an, nach Gewerk bündeln.
    fireEvent.click(screen.getByRole('radio', { name: 'nur Treffer' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Gewerk' }));

    // Die Gruppen-Bubbles der Isolation sind Abschnitts-Bubbles. Ohne eigene
    // Mengenkarte fiele jede auf den Basisradius zurück — alle gleich groß.
    const radien = [
      ...document.querySelectorAll(
        '[aria-label^="Bubble-Graph"] svg circle[fill="var(--bub-section)"]',
      ),
    ].map((circle) => Number(circle.getAttribute('r')));
    expect(radien.length).toBeGreaterThan(1);
    expect(new Set(radien).size).toBeGreaterThan(1);
  });
});

describe('Sprung in die Tabelle', () => {
  it('führt von der Auswahlkarte in die Tabelle', async () => {
    await loadAndShowGraph();

    // Eine Bubble anklicken öffnet die Auswahlkarte (Issue #30) …
    const bubble = screen.getByText('Bauhauptgewerke');
    fireEvent.click(bubble.closest('g') as SVGGElement);
    const knopf = await screen.findByRole('button', { name: 'In der Tabelle zeigen' });

    // … und von dort führt der Knopf in die Tabelle — als Fenster über dem
    // Graphen, auf genau diesen Abschnitt.
    fireEvent.click(knopf);
    const fenster = within(
      screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' }),
    );
    expect(fenster.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.getAllByText(/Bauhauptgewerke/).length).toBeGreaterThan(0);
  });
});
