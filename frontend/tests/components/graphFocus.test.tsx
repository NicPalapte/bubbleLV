// Trefferansicht des Graphen (WP-Q, Schritt 1 und 2; Issue #60): Filter und
// Suche bilden eigene Gruppen-Bubbles, und zwischen dem gesamten Graphen und
// der Isolation lässt sich umschalten — ohne dass Filter, Suche oder Auswahl
// davon etwas mitbekommen.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

/** In die Isolation schalten — Einstieg ist der ganze Graph. */
function isolieren(): void {
  fireEvent.click(screen.getByRole('radio', { name: 'ISOLATION' }));
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

    // Einstieg ist der ganze Graph — das Los steht da, keine Trefferzahl.
    expect(graphText()).toContain('LOS');
    expect(screen.queryByText(/TREFFER IN \d+ GRUPPEN/)).not.toBeInTheDocument();

    isolieren();
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/)).toBeInTheDocument();
    expect(graphText()).toContain('TREFFER');
    expect(graphText()).not.toContain('LOS');

    // …und zurück zum gesamten Graphen: das Los steht wieder da.
    fireEvent.click(screen.getByRole('radio', { name: 'GESAMTER GRAPH' }));
    expect(graphText()).toContain('LOS');
    expect(graphText()).not.toContain('TREFFER');
  });

  it('lässt Suche und Auswahl beim Umschalten unangetastet', async () => {
    await loadAndShowGraph();
    await search('Beton');
    isolieren();
    const treffer = screen.getByText(/TREFFER IN \d+ GRUPPEN/).textContent;

    fireEvent.click(screen.getByRole('radio', { name: 'GESAMTER GRAPH' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'ISOLATION' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/).textContent).toBe(treffer);
  });

  it('bündelt auf Wunsch nach Gewerk statt nach Abschnitt', async () => {
    await loadAndShowGraph();
    await search('Beton');
    isolieren();
    expect(graphText()).toContain('nach Abschnitt');

    fireEvent.click(screen.getByRole('radio', { name: 'GEWERK' }));
    // Dieselben Treffer, andere Bündelung — die Wurzel sagt, welche.
    expect(graphText()).toContain('nach Gewerk');
    expect(screen.getByText(/TREFFER IN \d+ GRUPPEN/)).toBeInTheDocument();
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('sagt es, wenn ein Filter gar nichts trifft', async () => {
    await loadAndShowGraph();
    await search('zzz-kein-treffer-zzz');

    // Im gesamten Graphen steht die Aussage schlicht da.
    expect(screen.getByText(/KEINE TREFFER$/)).toBeInTheDocument();

    // In der Isolation gibt es nichts zu isolieren — der Graph zeigt weiter
    // das ganze LV, und die Kopfleiste sagt warum.
    isolieren();
    expect(screen.getByText(/KEINE TREFFER — NICHTS ZU ISOLIEREN/)).toBeInTheDocument();
    expect(screen.queryByText(/TREFFER IN \d+ GRUPPEN/)).not.toBeInTheDocument();
    expect(graphText()).toContain('LOS');
  });

  it('zeigt den Umschalter „Nicht-Treffer" nur, wo er etwas bewirkt', async () => {
    await loadAndShowGraph();
    // Die Filterleiste erscheint erst mit einer gesetzten Facette.
    fireEvent.click(screen.getByRole('button', { name: /Einheit ▾/ }));
    fireEvent.click(await screen.findByTitle('m³'));
    fireEvent.keyDown(document.body, { key: 'Escape' });

    // Im ganzen Graphen entscheidet er, ob Nicht-Treffer gedämpft oder
    // weggelassen werden.
    expect(await screen.findByRole('radiogroup', { name: 'Nicht-Treffer' })).toBeInTheDocument();

    // In der Isolation gibt es keine Nicht-Treffer — also auch keine Wahl.
    isolieren();
    expect(screen.queryByRole('radiogroup', { name: 'Nicht-Treffer' })).not.toBeInTheDocument();

    // Der Überblick rechnet ohnehin nur mit Treffern.
    fireEvent.click(screen.getByRole('radio', { name: 'Überblick' }));
    expect(screen.queryByRole('radiogroup', { name: 'Nicht-Treffer' })).not.toBeInTheDocument();

    // In der Tabelle blendet der Baum aus bzw. dämpft — dort steht er wieder.
    fireEvent.click(screen.getByRole('radio', { name: 'Tabelle' }));
    expect(screen.getByRole('radiogroup', { name: 'Nicht-Treffer' })).toBeInTheDocument();
  });

  it('lässt die Pfeiltasten auch an einer Gruppen-Bubble weiterlaufen', async () => {
    await loadAndShowGraph();
    await search('Beton');
    isolieren();

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
});
