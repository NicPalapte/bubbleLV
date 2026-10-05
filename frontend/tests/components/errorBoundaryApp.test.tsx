// Auffangnetz im echten App-Aufbau (Issue #73). Die Einzeltests in
// errorBoundary.test.tsx prüfen die Grenze mit einer Test-Komponente; hier
// hängt sie da, wo sie im Produkt hängt — mit geladener Datei, Kopfleiste und
// Befehlen. Die Zusage: stürzt nur der Graph ab, bleibt der Rest bedienbar,
// und der Meldetext trägt nichts aus der Datei.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');
const FIXTURE = 'gaeb-xml-beispiel.x83';
const MELDUNG = 'Knoten ohne Radius';

/**
 * Schalter im Test statt Zähler in der Komponente — React zeichnet eine
 * werfende Komponente im Entwicklungsmodus mehrfach (siehe errorBoundary.test).
 */
let kaputt = true;

// Nur der Graph wird ersetzt; alles andere ist die echte App.
vi.mock('../../src/components/graph/BubbleGraph', () => ({
  BubbleGraph: () => {
    if (kaputt) throw new Error(MELDUNG);
    return <div>Graph steht wieder</div>;
  },
}));

beforeEach(() => {
  kaputt = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function ladeUndStuerzeAb(): Promise<HTMLElement> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, FIXTURE))], FIXTURE)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  // Der Graph ist der Hauptscreen — er stürzt gleich nach dem Laden ab.
  return screen.findByRole('alert');
}

describe('Absturz einer Ansicht in der App', () => {
  it('lässt Kopfleiste und Filter stehen', async () => {
    const seite = await ladeUndStuerzeAb();
    expect(within(seite).getByText(/Diese Ansicht ist abgestürzt/)).toBeInTheDocument();
    expect(within(seite).getByText(new RegExp(MELDUNG))).toBeInTheDocument();

    // Die innere Grenze hat gegriffen, nicht die äußere.
    expect(screen.queryByText(/Bubble ist abgestürzt/)).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument();
  });

  it('führt ohne Neuladen der Seite zurück in die Ansicht', async () => {
    await ladeUndStuerzeAb();
    kaputt = false;
    fireEvent.click(screen.getByRole('button', { name: /Ansicht neu aufbauen/ }));

    expect(await screen.findByText('Graph steht wieder')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Die Datei ist noch da — nichts musste neu hineingezogen werden.
    expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument();
  });

  it('meldet von der Fehlerseite aus ohne Inhalt aus der Datei', async () => {
    const seite = await ladeUndStuerzeAb();
    fireEvent.click(within(seite).getByRole('button', { name: /Fehler melden/ }));
    const fenster = screen.getByRole('dialog', { name: 'Fehler melden' });
    const meldetext = (within(fenster).getByLabelText('Meldetext') as HTMLTextAreaElement).value;

    expect(meldetext).toContain(MELDUNG);
    expect(meldetext).toContain('Ansicht: graph');
    expect(meldetext).toContain('Datei geladen: ja');
    // Dieselben Proben wie beim Weg über das Logo-Menü (reportDialog.test):
    // weder Dateiname noch Projektname noch eine OZ.
    expect(meldetext).not.toContain('gaeb-xml-beispiel');
    expect(meldetext).not.toContain('BVBS');
    expect(meldetext).not.toMatch(/\d{3}\.\d{3}\.\d{4}/);
  });
});
