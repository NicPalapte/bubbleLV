// Geteilter Link in der App (WP-P, Schritt 2). Die Abnahme aus dem Plan:
// „Ein geteilter Link stellt Ansicht und Filter wieder her, sobald dieselbe
// Datei geladen ist — ohne Fachdaten im Link außer der OZ der Auswahl."

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

/** Das Fragment, das die App gerade geschrieben hat. */
function fragment(): string {
  return window.location.hash;
}

function setzeFragment(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

beforeEach(() => {
  setzeFragment('');
});

afterEach(() => {
  setzeFragment('');
});

async function ladeDatei(name: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

async function ladeApp(name = 'gaeb-xml-beispiel.x83'): Promise<void> {
  render(<App />);
  await ladeDatei(name);
}

/** Suche setzen und warten, bis sie (entprellt) in der Adresszeile steht. */
async function sucheBeton(): Promise<void> {
  fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
  await waitFor(() => expect(fragment()).toContain('q=Beton'));
}

/** Tabellenfenster über dem Graphen. */
function tabellenfenster(): HTMLElement | null {
  return screen.queryByRole('region', { name: 'Tabelle — Fenster über dem Graphen' });
}

describe('Geteilter Link · schreiben', () => {
  it('hält die Adresszeile leer, solange nichts eingestellt ist', async () => {
    await ladeApp();
    await new Promise((fertig) => setTimeout(fertig, 400));
    expect(fragment()).toBe('');
  });

  it('schreibt die Suche in die Adresszeile — die Ansicht bleibt draußen', async () => {
    // Der Graph ist der Hauptscreen; ein offenes Fenster ist keine Ansicht.
    await ladeApp();
    fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
    await sucheBeton();
    expect(fragment()).not.toContain('v=');
  });

  it('schreibt den Pfad nicht weg', async () => {
    // Die App liegt unter einem Pfad (GitHub Pages, PR-Vorschau) — ein nacktes
    // „#…" würde ihn verwerfen.
    window.history.replaceState(null, '', '/pr-preview/pr-65/');
    await ladeApp();
    await sucheBeton();
    expect(window.location.pathname).toBe('/pr-preview/pr-65/');
  });
});

describe('Geteilter Link · lesen', () => {
  it('stellt Ansicht, Suche und Facette wieder her, sobald die Datei geladen ist', async () => {
    setzeFragment('#v=table~q=Beton~f.einheit=m3');
    await ladeApp();

    // Ein alter Link auf die Tabelle öffnet den Graphen mit dem Tabellenfenster.
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    // Die Facette steht als gesetzter Filter im Reiter „Filter".
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    const einheit = within(screen.getByRole('region', { name: 'Einheit' }));
    expect(einheit.getByTitle('m³')).toHaveAttribute('aria-pressed', 'true');
  });

  it('öffnet einen Link auf den Überblick als Reiter im Seitenfenster', async () => {
    setzeFragment('#v=overview');
    await ladeApp();

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Überblick' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
  });

  it('wählt die Position aus der OZ des Links', async () => {
    setzeFragment('#v=table~p=001.004.0030');
    await ladeApp();

    // Die Eigenschaften zeigen genau diese Position.
    await waitFor(() => expect(screen.getAllByText('001.004.0030').length).toBeGreaterThan(0));
  });

  it('übergeht eine OZ, die es in dieser Datei nicht gibt — der Rest des Links gilt', async () => {
    setzeFragment('#v=table~p=999.999.9999.gibt-es-nicht');
    await ladeApp();

    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
  });

  it('macht aus einem kaputten Link keinen kaputten Zustand', async () => {
    setzeFragment('#v=raumschiff~f.erfunden=xyz~m=viel,mehr');
    await ladeApp();

    // Der Graph ist die Eingangsansicht, ohne Fenster — der Link hat nichts geändert.
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Seitenfenster' })).toBeNull();
    expect(tabellenfenster()).toBeNull();
    expect(screen.getByLabelText('Suche')).toHaveValue('');
  });
});

describe('Was im Link steht', () => {
  it('trägt weder Dateinamen noch Projektnamen — und keine Position ohne Auswahl', async () => {
    await ladeApp();
    fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
    expect(tabellenfenster()).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(fragment()).toContain('q=Beton'));

    const hash = decodeURIComponent(fragment());
    // Weder Dateiname noch Projektname stehen im Link.
    expect(hash).not.toContain('gaeb-xml-beispiel');
    expect(hash).not.toContain('BVBS');
    // Und keine Position, solange keine gewählt ist.
    expect(hash).not.toContain('p=');
  });
});

describe('Geteilter Link · zweite Datei', () => {
  it('lässt den Link der vorigen Datei nicht auf die nächste übergreifen', async () => {
    // Ein Re-Import ersetzt den kompletten Session-Zustand
    // (docs/architecture/data-model.md#re-import-in-derselben-session). Das
    // Fragment der ersten Datei dürfte sonst still weiterwirken: seine
    // Filter gehören zu einer Datei, die gar nicht mehr offen ist.
    setzeFragment('#v=table~q=Beton');
    await ladeApp();
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    await waitFor(() => expect(screen.getByLabelText('GAEB-Datei auswählen')).toBeVisible());
    await ladeDatei('sample.X83');

    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(tabellenfenster()).toBeNull();
    expect(screen.getByLabelText('Suche')).toHaveValue('');
    // Die Adresszeile wird leer — je nach Weg sofort beim Import oder nach der
    // Entprellung des Schreibens.
    await waitFor(() => expect(fragment()).toBe(''));
  });

  it('räumt die Adresszeile, wenn das LV geschlossen wird', async () => {
    await ladeApp();
    await sucheBeton();

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    await waitFor(() => expect(fragment()).toBe(''));
  });
});

describe('Geteilter Link · Wettlauf mit dem Dateidialog', () => {
  it('überlebt, wenn die Datei erst nach einer Weile ausgewählt wird', async () => {
    // Wer einen Link öffnet, sucht die Datei erst im Dateidialog — das dauert
    // länger als die Entprällung von 300 ms. Bis dahin darf nichts das
    // Fragment wegräumen, sonst ist der Link weg, bevor er gelesen wird.
    setzeFragment('#v=table~q=Beton');
    render(<App />);
    await new Promise((fertig) => setTimeout(fertig, 500));
    expect(fragment()).toBe('#v=table~q=Beton');

    await ladeDatei('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });
});
