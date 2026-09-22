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
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
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
    const modi = screen.getByRole('radiogroup', { name: 'Größe der Bubbles' });
    const menge = within(modi).getByRole('radio', { name: /MENGE/ });
    expect(menge).toBeDisabled();
    expect(menge.getAttribute('title')).toContain('nur innerhalb einer Einheit');
  });
});

describe('Sprung in die Tabelle', () => {
  it('führt von der Auswahlkarte in die Tabelle', async () => {
    await loadAndShowGraph();

    // Eine Bubble anklicken öffnet die Auswahlkarte (Issue #30) …
    const bubble = screen.getByText('Bauhauptgewerke');
    fireEvent.click(bubble.closest('g') as SVGGElement);
    const knopf = await screen.findByRole('button', { name: 'IN DER TABELLE ZEIGEN' });

    // … und von dort führt der Knopf in die Tabelle, auf genau diesen Abschnitt.
    fireEvent.click(knopf);
    expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('table', { name: 'Positionen' })).toBeInTheDocument();
    expect(screen.getAllByText(/Bauhauptgewerke/).length).toBeGreaterThan(0);
  });
});
