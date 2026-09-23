// „Fehler melden" (WP-P, Schritt 6). Die Zusage: drei Wege zur selben
// Meldung, keiner davon braucht einen Server — und in keinem steht ein Inhalt
// aus der geladenen Datei (docs/decisions/0024-fehler-melden-ohne-konto.md).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

let geschrieben: string[] = [];
let geoeffnet: string[] = [];
let zwischenablageGeht = true;

beforeEach(() => {
  geschrieben = [];
  geoeffnet = [];
  zwischenablageGeht = true;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        if (!zwischenablageGeht) return Promise.reject(new Error('kein sicherer Kontext'));
        geschrieben.push(text);
        return Promise.resolve();
      },
    },
  });
  vi.stubGlobal(
    'open',
    vi.fn((url: string) => {
      geoeffnet.push(url);
      return null;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function oeffneMeldung(): Promise<HTMLElement> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

  fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /Mitnehmen/ }));
  const menu = [...document.body.children].filter(
    (element) => (element as HTMLElement).style.position === 'fixed',
  );
  fireEvent.click(
    within(menu[menu.length - 1] as HTMLElement).getByRole('button', { name: 'Fehler melden' }),
  );
  return screen.getByRole('dialog', { name: 'Fehler melden' });
}

function beschreibe(fenster: HTMLElement, text: string): void {
  fireEvent.change(within(fenster).getByLabelText(/Was ist passiert/), {
    target: { value: text },
  });
}

describe('Fehler melden · der Text', () => {
  it('trägt die eigene Beschreibung und die technischen Angaben', async () => {
    const fenster = await oeffneMeldung();
    beschreibe(fenster, 'Der Graph bleibt leer.');

    const meldetext = within(fenster).getByLabelText('Meldetext') as HTMLTextAreaElement;
    expect(meldetext.value).toContain('Der Graph bleibt leer.');
    expect(meldetext.value).toContain('Datei geladen: ja');
    expect(meldetext.value).toContain('Ansicht:');
  });

  it('trägt nichts aus der geladenen Datei', async () => {
    const fenster = await oeffneMeldung();
    const meldetext = (within(fenster).getByLabelText('Meldetext') as HTMLTextAreaElement).value;
    // Weder Dateiname noch Projektname noch eine OZ.
    expect(meldetext).not.toContain('gaeb-xml-beispiel');
    expect(meldetext).not.toContain('BVBS');
    expect(meldetext).not.toMatch(/\d{3}\.\d{3}\.\d{4}/);
  });
});

describe('Fehler melden · die drei Wege', () => {
  it('kopiert den Text in die Zwischenablage', async () => {
    const fenster = await oeffneMeldung();
    beschreibe(fenster, 'Spalte bleibt leer.');
    fireEvent.click(within(fenster).getByRole('button', { name: /Text kopieren/ }));

    await waitFor(() => expect(geschrieben).toHaveLength(1));
    expect(geschrieben[0]).toContain('Spalte bleibt leer.');
    expect(within(fenster).getByText('kopiert')).toBeInTheDocument();
  });

  it('sagt es, wenn die Zwischenablage nicht darf, statt stillzuhalten', async () => {
    zwischenablageGeht = false;
    const fenster = await oeffneMeldung();
    fireEvent.click(within(fenster).getByRole('button', { name: /Text kopieren/ }));

    await waitFor(() =>
      expect(within(fenster).getByText(/Kopieren nicht möglich/)).toBeInTheDocument(),
    );
  });

  it('öffnet eine Mail ohne Empfänger — die Adresse trägt der Absender ein', async () => {
    const fenster = await oeffneMeldung();
    beschreibe(fenster, 'Druck bricht ab.');

    const ziele: string[] = [];
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        set href(wert: string) {
          ziele.push(wert);
        },
        get href() {
          return 'http://localhost/';
        },
      },
    });
    fireEvent.click(within(fenster).getByRole('button', { name: /E-Mail/ }));

    expect(ziele).toHaveLength(1);
    expect(ziele[0].startsWith('mailto:?')).toBe(true);
    expect(decodeURIComponent(ziele[0])).toContain('Druck bricht ab.');
  });

  it('öffnet das GitHub-Formular mit demselben Text', async () => {
    const fenster = await oeffneMeldung();
    beschreibe(fenster, 'Filter greift nicht.');
    fireEvent.click(within(fenster).getByRole('button', { name: /GitHub-Issue/ }));

    expect(geoeffnet).toHaveLength(1);
    expect(geoeffnet[0]).toContain('github.com/NicPalapte/bubbleLV/issues/new');
    const text = decodeURIComponent(geoeffnet[0]).replace(/\+/g, ' ');
    expect(text).toContain('Filter greift nicht.');
    expect(text).not.toContain('gaeb-xml-beispiel');
  });

  it('sagt beim GitHub-Weg, dass ein Konto nötig ist', async () => {
    const fenster = await oeffneMeldung();
    expect(within(fenster).getByRole('button', { name: /Konto nötig/ })).toBeInTheDocument();
  });
});

describe('Fehler melden · schließen', () => {
  it('geht mit Escape zu', async () => {
    await oeffneMeldung();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Fehler melden' })).toBeNull();
  });
});
