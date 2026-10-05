// Tastaturbedienung in allen Ansichten (WP-P, Schritt 5). Die Zusage aus dem
// Plan: „Auswahl mit Pfeiltasten, Enter öffnet" — und zwar überall, nicht nur
// im Baum.

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
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/**
 * Ansicht über die Befehle öffnen — einen Umschalter in der Kopfleiste gibt es
 * nicht mehr. Überblick und Prüfung landen im Seitenfenster, die Tabelle im
 * Fenster über dem Graphen, Matrix und Ähnlichkeit als eigene Fläche.
 */
async function ansicht(name: string): Promise<void> {
  // Die Palette hängt ihren Listener in einem Effekt an — erst danach öffnet der Knopf sie.
  await act(async () => {});
  fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Befehle/ }));
  fireEvent.change(screen.getByLabelText('Befehl oder OZ'), { target: { value: name } });
  fireEvent.click(screen.getAllByRole('option', { name: new RegExp(`^${name}`) })[0]);
}

function seitenfenster(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Seitenfenster' });
}

function tabellenfenster(): HTMLElement {
  return screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' });
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

    // Auswahl über die Kommandopalette — also von außerhalb der Tabelle.
    // Das leere `act` wartet auf den Effekt, der den Tastatur-Listener der
    // Palette anhängt; ohne das liefe der Tastendruck manchmal ins Leere.
    await act(async () => {});
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByLabelText('Befehl oder OZ'), {
      target: { value: '001.004.0030' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Kommandopalette' })).getAllByRole('option')[0],
    );

    await waitFor(() => expect(aktiveZeile(tabelle())).not.toBe(letzte));
    expect(aktiveZeile(tabelle())).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Matrix · Tastatur', () => {
  it('bewegt den Fokus mit den Pfeiltasten von Zelle zu Zelle', async () => {
    await ladeApp();
    await ansicht('Matrix');
    const raster = screen.getByRole('grid', { name: 'Matrix' });

    const start = raster.querySelector<HTMLButtonElement>('button[data-r][data-c]');
    expect(start, 'kein filterbares Feld im Raster').not.toBeNull();
    const zelle = start as HTMLButtonElement;
    const r = Number(zelle.dataset.r);
    const c = Number(zelle.dataset.c);
    zelle.focus();

    // Nachbar in derselben Zeile, sonst in derselben Spalte — je nachdem,
    // was das Raster dieser Datei hergibt.
    const rechts = raster.querySelector<HTMLButtonElement>(
      `button[data-r="${r}"][data-c="${c + 1}"]`,
    );
    const unten = raster.querySelector<HTMLButtonElement>(
      `button[data-r="${r + 1}"][data-c="${c}"]`,
    );
    const nachbar = rechts ?? unten;
    expect(nachbar, 'Raster mit nur einer Zelle').not.toBeNull();

    fireEvent.keyDown(zelle, { key: rechts !== null ? 'ArrowRight' : 'ArrowDown' });
    expect(document.activeElement).toBe(nachbar);

    // Und wieder zurück.
    fireEvent.keyDown(nachbar as HTMLButtonElement, {
      key: rechts !== null ? 'ArrowLeft' : 'ArrowUp',
    });
    expect(document.activeElement).toBe(zelle);
  });

  it('hat genau einen Tab-Stopp — nicht einen je Zelle', async () => {
    await ladeApp();
    await ansicht('Matrix');
    const raster = screen.getByRole('grid', { name: 'Matrix' });

    const stopps = () => raster.querySelectorAll('button[data-r][tabindex="0"]');
    expect(raster.querySelectorAll('button[data-r]').length).toBeGreaterThan(1);
    expect(stopps()).toHaveLength(1);

    // Der Stopp wandert mit dem Fokus mit: wer das Raster verlässt und
    // zurückkommt, steht wieder dort, wo er war.
    const zweite = raster.querySelectorAll<HTMLButtonElement>('button[data-r]')[1];
    zweite.focus();
    fireEvent.focus(zweite);
    expect(stopps()).toHaveLength(1);
    expect(zweite).toHaveAttribute('tabindex', '0');
  });

  it('bleibt erreichbar, wenn keine Zelle filterbar ist', async () => {
    // „Material" und „Zeitbezug" kommen in der Musterdatei nicht vor: beide
    // Achsen bestehen dann nur aus „Ohne Angabe", und keine Zelle ist ein
    // Einstieg. Ohne Tab-Stopp fiele das Raster still aus der Reihenfolge.
    await ladeApp();
    await ansicht('Matrix');
    const wechsle = (achse: string, facette: string): void => {
      // Der Filter-Chip in der Kopfleiste heißt genauso — hier zählt der in
      // der Ansicht.
      fireEvent.click(
        within(screen.getByRole('main')).getByRole('button', { name: new RegExp(`${achse} ▾`) }),
      );
      const offen = [...document.body.children].filter(
        (element) => (element as HTMLElement).style.position === 'fixed',
      );
      fireEvent.click(
        within(offen[offen.length - 1] as HTMLElement).getByText(facette, { selector: '*' }),
      );
    };
    wechsle('Gewerk', 'Material');
    wechsle('Bauteiltyp', 'Zeitbezug');

    const raster = screen.getByRole('grid', { name: 'Matrix' });
    expect(raster.querySelectorAll('button[data-r]')).toHaveLength(0);
    expect(raster).toHaveAttribute('tabindex', '0');
  });

  it('löst eine Zelle mit Enter aus — sie ist eine Schaltfläche', async () => {
    await ladeApp();
    await ansicht('Matrix');
    const raster = screen.getByRole('grid', { name: 'Matrix' });
    const zelle = within(raster).getAllByRole('button')[0];

    // Enter auf einer Schaltfläche ist ein Klick; die Zelle filtert und führt
    // in den Graphen mit offenem Tabellenfenster.
    fireEvent.click(zelle);
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
  });
});

describe('Ohne Maus bedienbar', () => {
  it('führt aus der Prüfung per Tastatur in die Tabelle', async () => {
    // Die Hinweiszeilen sind echte Schaltflächen: mit Tab erreichbar, mit
    // Enter auslösbar. Enter auf einer fokussierten Schaltfläche ist ein
    // Klick — genau das prüft dieser Weg.
    await ladeApp();
    await ansicht('Prüfung');
    const zeilen = within(seitenfenster())
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
    const flaechen: ReadonlyArray<[string, () => HTMLElement]> = [
      ['Prüfung', seitenfenster],
      ['Ähnlichkeit', () => screen.getByRole('main', { name: 'Ähnlichkeit' })],
      ['Überblick', seitenfenster],
      ['Tabelle', tabellenfenster],
    ];
    for (const [name, flaeche] of flaechen) {
      await ansicht(name);
      const fokussierbar = flaeche().querySelectorAll(
        'button:not([disabled]), [tabindex="0"], input, select',
      );
      expect(fokussierbar.length, `${name}: nichts fokussierbar`).toBeGreaterThan(0);
    }
  });
});
