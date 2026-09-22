// Trefferansicht des Graphen (WP-Q, Schritt 1 und 2; Issue #60): Filter und
// Suche bilden eigene Gruppen-Bubbles, und zwischen Struktur, Isolation und
// geteilter Ansicht lässt sich umschalten — ohne dass Filter, Suche oder
// Auswahl davon etwas mitbekommen.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

// jsdom misst jedes Element mit 0×0 — dann läge der ganze Graph außerhalb des
// Ausschnitts und es würde keine einzige Bubble gezeichnet. Eine feste Canvas-
// Größe macht das Culling überhaupt erst prüfbar.
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
  const input = screen.getByLabelText('GAEB-Datei auswählen');
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(input, {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
}

/** Suchbegriff setzen und warten, bis die entprellte Suche greift. */
async function search(value: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Suche'), { target: { value } });
  await screen.findByRole('radiogroup', { name: 'Trefferansicht' });
}

/** Beschriftungen im Canvas — die Kopfleiste zählt hier bewusst nicht mit. */
function graphText(root: HTMLElement | Document = document): string {
  return [...root.querySelectorAll('[aria-label^="Bubble-Graph"] svg')]
    .map((svg) => svg.textContent ?? '')
    .join(' ');
}

describe('Trefferansicht im Graphen', () => {
  it('bietet den Umschalter erst an, wenn gefiltert wird', async () => {
    await loadAndShowGraph();
    expect(screen.queryByRole('radiogroup', { name: 'Trefferansicht' })).not.toBeInTheDocument();
    await search('Beton');
    expect(screen.getByRole('radiogroup', { name: 'Trefferansicht' })).toBeInTheDocument();
  });

  it('isoliert die Treffer in eigenen Gruppen statt sie nur hervorzuheben', async () => {
    await loadAndShowGraph();
    await search('Beton');

    // Standard ist die Isolation: der Baum zeigt die Treffer, nicht das LV.
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/)).toBeInTheDocument();
    expect(graphText()).toContain('TREFFER');
    expect(graphText()).not.toContain('LOS');

    // …und zurück zur Struktur: das Los steht wieder da.
    fireEvent.click(screen.getByRole('radio', { name: 'STRUKTUR' }));
    expect(graphText()).toContain('LOS');
    expect(graphText()).not.toContain('TREFFER');
  });

  it('lässt Suche und Auswahl beim Umschalten unangetastet', async () => {
    await loadAndShowGraph();
    await search('Beton');
    const treffer = screen.getByText(/TREFFER IN \d+ GRUPPEN/).textContent;

    fireEvent.click(screen.getByRole('radio', { name: 'STRUKTUR' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'ISOLIEREN' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/).textContent).toBe(treffer);
  });

  it('bündelt auf Wunsch nach Gewerk statt nach Abschnitt', async () => {
    await loadAndShowGraph();
    await search('Beton');
    expect(graphText()).toContain('nach Abschnitt');

    fireEvent.click(screen.getByRole('radio', { name: 'GEWERK' }));
    // Dieselben Treffer, andere Bündelung — die Wurzel sagt, welche.
    expect(graphText()).toContain('nach Gewerk');
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/)).toBeInTheDocument();
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('lässt die Pfeiltasten auch an einer Gruppen-Bubble weiterlaufen', async () => {
    await loadAndShowGraph();
    await search('Beton');

    const canvas = screen.getByRole('group', { name: /Bubble-Graph/ });
    // Der Graph sagt den fokussierten Knoten über eine eigene Live-Region an —
    // daran lässt sich die Tastaturnavigation ablesen.
    const ansage = canvas.querySelector('.sr-only') as HTMLElement;
    fireEvent.focus(canvas);
    expect(ansage.textContent).toContain('nach Abschnitt');

    // Hinein in die erste Gruppe …
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    const gruppe = ansage.textContent ?? '';
    expect(gruppe).not.toContain('nach Abschnitt');
    expect(gruppe).not.toBe('');

    // … und zurück. Eine Gruppe klappt nicht zu, also muss die Taste zur
    // Wurzel führen statt ins Leere zu laufen.
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    expect(ansage.textContent).toContain('nach Abschnitt');
  });

  it('zeigt geteilt beide Seiten nebeneinander', async () => {
    await loadAndShowGraph();
    await search('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'GETEILT' }));

    const struktur = screen.getByRole('region', { name: 'Graph — Struktur' });
    const treffer = screen.getByRole('region', { name: 'Graph — Treffer' });
    expect(within(struktur).getByText('STRUKTUR')).toBeInTheDocument();
    // „TREFFER" steht in dieser Hälfte zweimal: als Beschriftung der Hälfte
    // und als Wurzel des Isolations-Baums.
    expect(within(treffer).getAllByText('TREFFER').length).toBeGreaterThan(0);
    expect(graphText(struktur)).toContain('LOS');
    expect(graphText(treffer)).not.toContain('LOS');
    expect(graphText(treffer)).toContain('TREFFER');
  });
});
