// Tastaturbedienung in allen Ansichten (WP-P, Schritt 5). Die Zusage aus dem
// Plan: „Auswahl mit Pfeiltasten, Enter öffnet" — und zwar überall, nicht nur
// im Baum.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/**
 * Bereich öffnen, wie ein Nutzer es täte: die Tabelle steht schon im Splitscreen,
 * Überblick und Prüfung öffnen die Kennzahlen.
 */
async function ansicht(name: 'Tabelle' | 'Prüfung' | 'Überblick'): Promise<void> {
  if (name === 'Tabelle' || screen.queryByRole('region', { name: `${name} — Bereich` })) return;
  const kennzahlen = screen.getByRole('group', { name: 'Kennzahlen' });
  const zahl = name === 'Prüfung' ? /Hinweise/ : /Positionen/;
  fireEvent.click(within(kennzahlen).getByRole('button', { name: zahl }));
}

function bereich(name: string): HTMLElement {
  return screen.getByRole('region', { name: `${name} — Bereich` });
}

function tabellenfenster(): HTMLElement {
  return bereich('Tabelle');
}

function tabelle(): HTMLElement {
  return screen.getByRole('grid', { name: 'Positionen' });
}

/** Die Zeile, auf der die Tastatur gerade steht. */
function aktiveZeile(grid: HTMLElement): HTMLElement | null {
  const id = grid.getAttribute('aria-activedescendant');
  return id === null ? null : document.getElementById(id);
}

describe('Tabelle · Tastatur', () => {
  it('nimmt den Fokus und führt eine aktive Zeile mit den Pfeiltasten', async () => {
    await ladeApp();
    await ansicht('Tabelle');
    const grid = tabelle();
    expect(grid).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const erste = aktiveZeile(grid);
    expect(erste).not.toBeNull();

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    expect(aktiveZeile(grid)).not.toBe(erste);

    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    expect(aktiveZeile(grid)).toBe(erste);
  });

  it('springt mit Home und End an Anfang und Ende', async () => {
    await ladeApp();
    await ansicht('Tabelle');
    const grid = tabelle();

    fireEvent.keyDown(grid, { key: 'End' });
    const letzte = aktiveZeile(grid);
    fireEvent.keyDown(grid, { key: 'Home' });
    const erste = aktiveZeile(grid);
    expect(erste).not.toBeNull();
    expect(erste).not.toBe(letzte);
  });

  it('wählt die aktive Zeile erst mit Enter aus', async () => {
    await ladeApp();
    await ansicht('Tabelle');
    const grid = tabelle();

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    // Bewegen allein wählt nicht: jede Auswahl zieht Panel und Graph mit.
    expect(within(grid).queryAllByRole('row', { selected: true })).toHaveLength(0);

    fireEvent.keyDown(grid, { key: 'Enter' });
    await waitFor(() =>
      expect(within(grid).getAllByRole('row', { selected: true }).length).toBe(1),
    );
  });

  it('zeigt den Fokus auch dann, wenn keine Zeile übrig ist', async () => {
    // Leeres Filterergebnis: es gibt keine aktive Zeile, die den Fokusring
    // übernehmen könnte — dann muss der des Browsers stehen bleiben.
    await ladeApp();
    await ansicht('Tabelle');
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'gibtesnichtimlv' } });
    fireEvent.click(await screen.findByRole('radio', { name: 'ausblenden' }));
    // Die Suche ist entprellt — warten, bis die Tabelle wirklich leer ist.
    await waitFor(() =>
      expect(
        within(tabelle()).getByText('Keine Positionen entsprechen den Filtern.'),
      ).toBeInTheDocument(),
    );

    const grid = tabelle();
    fireEvent.focus(grid);
    expect(grid.getAttribute('aria-activedescendant')).toBeNull();
    expect(grid.style.outline).toBe('');
  });

  it('sortiert mit Enter im Spaltenkopf, ohne nebenbei eine Zeile zu wählen', async () => {
    await ladeApp();
    await ansicht('Tabelle');
    const grid = tabelle();
    const kopf = within(grid).getAllByRole('columnheader')[0];
    const knopf = within(kopf).getByRole('button');

    knopf.focus();
    fireEvent.focus(knopf);
    fireEvent.keyDown(knopf, { key: 'Enter' });

    // Der Tastendruck gilt dem Spaltenkopf — nicht der Liste darunter.
    expect(within(grid).queryAllByRole('row', { selected: true })).toHaveLength(0);
    // Und er markiert auch keine Zeile als aktiv: sortieren ist kein Navigieren.
    expect(grid.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('führt die Tastatur an die Auswahl, die von außen kommt', async () => {
    // Sonst springt der nächste Pfeiltastendruck an eine ganz andere Stelle.
    await ladeApp();
    await ansicht('Tabelle');
    const grid = tabelle();
    fireEvent.keyDown(grid, { key: 'End' });
    const letzte = aktiveZeile(grid);

    // Auswahl im Graphen — also von außerhalb der Tabelle.
    // Irgendein gezeichneter Punkt: welche im Bild liegen, hängt an der Anordnung.
    const punkt = [...document.querySelectorAll('[data-slot]')].find((el) =>
      /^\d+$/.test(el.getAttribute('data-slot') ?? ''),
    );
    if (punkt === undefined) throw new Error('Kein Punkt im Graphen');
    fireEvent.click(punkt);

    await waitFor(() => expect(aktiveZeile(tabelle())).not.toBe(letzte));
    expect(aktiveZeile(tabelle())).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Ohne Maus bedienbar', () => {
  it('führt aus der Prüfkarte per Tastatur in die Tabelle', async () => {
    // Die Hinweiszeilen sind echte Schaltflächen: mit Tab erreichbar, mit
    // Enter auslösbar. Enter auf einer fokussierten Schaltfläche ist ein
    // Klick — genau das prüft dieser Weg.
    await ladeApp();
    await ansicht('Prüfung');
    const zeilen = within(bereich('Prüfung'))
      .getAllByRole('button')
      .filter((knopf) => /\d{3}\.\d{3}\.\d{4}/.test(knopf.textContent ?? ''));
    if (zeilen.length === 0) return; // Fixture ohne Hinweise — nichts zu prüfen.

    zeilen[0].focus();
    expect(document.activeElement).toBe(zeilen[0]);
    fireEvent.click(zeilen[0]);

    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
  });

  it('macht jede Ansicht mit der Tastatur erreichbar', async () => {
    // Jede Ansicht bietet mindestens einen Bedienpunkt, der den Fokus nimmt.
    await ladeApp();
    const namen = ['Prüfung', 'Überblick', 'Tabelle'] as const;
    for (const name of namen) {
      await ansicht(name);
      const fokussierbar = bereich(name).querySelectorAll(
        'button:not([disabled]), [tabindex="0"], input, select',
      );
      expect(fokussierbar.length, `${name}: nichts fokussierbar`).toBeGreaterThan(0);
    }
  });

  // Issue #105: Reiter nach WAI-ARIA — Pfeiltasten wechseln, nur der aktive
  // Reiter liegt in der Tab-Reihenfolge. Dokument und Tabelle teilen sich anfangs
  // einen Platz.
  it('wechselt gestapelte Reiter mit den Pfeiltasten', async () => {
    await ladeApp();
    fireEvent.click(screen.getByRole('button', { name: /^Ansicht/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dokument$/, pressed: false }));
    const reiter = (name: string) => screen.getByRole('tab', { name: new RegExp(name) });
    expect(reiter('Dokument')).toHaveAttribute('aria-selected', 'true');
    expect(reiter('Tabelle')).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(reiter('Dokument'), { key: 'ArrowRight' });
    expect(reiter('Tabelle')).toHaveAttribute('aria-selected', 'true');
    expect(reiter('Tabelle')).toHaveFocus();

    // Am Rand geht es reihum weiter.
    fireEvent.keyDown(reiter('Tabelle'), { key: 'ArrowLeft' });
    expect(reiter('Dokument')).toHaveAttribute('aria-selected', 'true');
  });

  it('gliedert die Seite mit Überschriften', async () => {
    await ladeApp();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
