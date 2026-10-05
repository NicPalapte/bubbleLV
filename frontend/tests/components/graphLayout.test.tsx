// Gliederung des Graphen (docs/decisions/0035-graph-gliederung.md): „nach LV"
// und „frei" im Seitenfenster unter „Filter" → „Darstellung", Größe und
// Hinweise an der Steuerung unten rechts — ohne dass Filter, Suche oder Auswahl
// davon etwas mitbekommen.

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

function oeffneFilter(): void {
  fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
}

/** Suchbegriff setzen und warten, bis die entprellte Suche greift. */
async function search(value: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Suche'), { target: { value } });
  await screen.findByRole('radiogroup', { name: 'Nicht-Treffer' });
}

function graph(): HTMLElement {
  return screen.getByRole('group', { name: /Bubble-Graph/ });
}

/** Beschriftungen im Canvas — Kopfleiste und Fenster zählen nicht mit. */
function graphText(): string {
  return [...graph().querySelectorAll('svg')].map((svg) => svg.textContent ?? '').join(' ');
}

describe('Gliederung im Graphen', () => {
  it('beginnt „nach LV" mit einem Kreis je Abschnitt', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    expect(screen.getByRole('radio', { name: 'nach LV' })).toBeChecked();
    expect(graph().querySelectorAll('[data-group]').length).toBeGreaterThan(1);
    expect(graph().querySelectorAll('[data-tier="position"]').length).toBeGreaterThan(0);
    // Ohne „frei" gibt es keine Zeilen und Spalten zu wählen.
    expect(screen.queryByRole('radiogroup', { name: 'Zeilen' })).not.toBeInTheDocument();
  });

  it('ordnet „frei" nach Merkmalen und macht einen neuen Filter zur Spalte', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    fireEvent.click(screen.getByRole('radio', { name: 'frei' }));
    expect(screen.getByRole('radiogroup', { name: 'Zeilen' })).toBeInTheDocument();
    // Zeilen nach Einheit: die Gruppen tragen die Einheit als Titel.
    expect(graphText()).toContain('m³');
    expect(graphText()).not.toContain('→');

    const gewerk = within(screen.getByRole('region', { name: 'Gewerk' }));
    fireEvent.click(gewerk.getAllByRole('button', { pressed: false })[0]);

    const spalten = within(screen.getByRole('radiogroup', { name: 'Spalten' }));
    await waitFor(() => expect(spalten.getByRole('radio', { name: 'Gewerk' })).toBeChecked());
    // Die Matrix beschriftet ihre Achsen.
    expect(graphText()).toContain('Gewerk →');
    expect(graphText()).toContain('Einheit ↓');
  });

  it('lässt Suche und Auswahl beim Umschalten unangetastet', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    await search('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'frei' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'nach LV' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('sagt es, wenn ein Filter gar nichts trifft', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    await search('zzz-kein-treffer-zzz');
    expect(screen.getByText(/^Keine Treffer$/)).toBeInTheDocument();
  });

  it('lässt Nicht-Treffer beim Ausblenden aus dem Graphen fallen', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    const vorher = graph().querySelectorAll('[data-tier="position"]').length;
    expect(screen.queryByRole('radiogroup', { name: 'Nicht-Treffer' })).not.toBeInTheDocument();
    await search('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'ausblenden' }));
    const nachher = graph().querySelectorAll('[data-tier="position"]').length;
    expect(nachher).toBeGreaterThan(0);
    expect(nachher).toBeLessThan(vorher);
  });
});

describe('Steuerung am Graphen', () => {
  it('sperrt „Preis" bei einer Datei ohne Preise', async () => {
    await loadAndShowGraph();
    const groesse = within(screen.getByRole('radiogroup', { name: 'Größe der Positionen' }));
    expect(groesse.getByRole('radio', { name: 'Preis' })).toBeDisabled();
    expect(groesse.getByRole('radio', { name: 'Menge' })).toBeChecked();
  });

  it('blendet Ringe und Schilder mit „⚠ Hinweise" aus und wieder ein', async () => {
    await loadAndShowGraph();
    const schalter = screen.getByRole('button', { name: '⚠ Hinweise' });
    expect(schalter).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(schalter);
    expect(schalter).toHaveAttribute('aria-pressed', 'false');
    expect(graph().querySelectorAll('[data-hint]').length).toBe(0);
    expect(graph().querySelectorAll('[data-pin]').length).toBe(0);
  });

  it('wandert mit den Pfeiltasten durch die Positionen und öffnet mit Enter die Karte', async () => {
    await loadAndShowGraph();
    const canvas = graph();
    const ansage = canvas.querySelector('.sr-only') as HTMLElement;
    fireEvent.focus(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    const erste = ansage.textContent ?? '';
    expect(erste).not.toBe('');
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(ansage.textContent).not.toBe(erste);
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(
      await screen.findByRole('button', { name: 'In der Tabelle zeigen' }),
    ).toBeInTheDocument();
  });
});

describe('Sprung in die Tabelle', () => {
  it('führt vom Abschnitt über die Karte in die Tabelle', async () => {
    await loadAndShowGraph();
    // Ein Klick auf einen Kreis öffnet die Karte des Abschnitts …
    fireEvent.click(graph().querySelector('[data-group] circle') as SVGCircleElement);
    const knopf = await screen.findByRole('button', { name: 'In der Tabelle zeigen' });

    // … und von dort führt der Knopf in die Tabelle — als Fenster über dem Graphen.
    fireEvent.click(knopf);
    const fenster = within(
      screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' }),
    );
    expect(fenster.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
  });
});
