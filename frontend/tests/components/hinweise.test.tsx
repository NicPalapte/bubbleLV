// Hinweise und Fehlermeldungen beim Laden (Issues #92 bis #95): was die
// Nutzerin sieht, wenn etwas nicht wie erwartet läuft.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { MAX_FILE_BYTES } from '../../src/lib/pipeline/loadLv';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function fixtureDatei(name: string): File {
  return new File([readFileSync(resolve(FIXTURE_DIR, name))], name);
}

function setzeFragment(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

beforeEach(() => setzeFragment(''));
afterEach(() => setzeFragment(''));

/** Datei(en) auf die Ablagefläche ziehen. */
function legeAb(...dateien: File[]): void {
  const flaeche = screen.getByText('GAEB-Datei hierher ziehen').closest('div');
  fireEvent.drop(flaeche as HTMLElement, { dataTransfer: { files: dateien } });
}

function hinweisleiste(): HTMLElement | null {
  return screen.queryByRole('status', { name: 'Hinweise' });
}

async function warteAufLv(): Promise<void> {
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/** Der Link wird erst nach dem ersten Zeichnen des LV angewendet — darauf warten. */
async function warteAufTabelle(): Promise<void> {
  // Die Tabelle ist ein Fenster über dem Graphen — es steht, sobald der Link greift.
  await waitFor(() =>
    expect(
      screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' }),
    ).toBeInTheDocument(),
  );
}

describe('Ladefehler auf der Startseite (Issues #92, #93)', () => {
  it('nennt bei einem fremden Dateityp den Dateityp, nicht „kein XML"', async () => {
    render(<App />);
    legeAb(new File(['%PDF-1.7'], 'bericht.pdf'));
    const meldung = await screen.findByRole('alert');
    expect(meldung).toHaveTextContent(/bericht\.pdf/);
    expect(meldung).toHaveTextContent(/Dateityp/);
  });

  it('meldet eine leere Datei als leer', async () => {
    render(<App />);
    legeAb(new File([''], 'leer.x83'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Die Datei leer.x83 ist leer.');
  });

  it('zeigt bei zu großer Datei die Grenze', async () => {
    render(<App />);
    const riesig = new File(['<GAEB/>'], 'riesig.x83');
    Object.defineProperty(riesig, 'size', { value: MAX_FILE_BYTES + 1024 });
    legeAb(riesig);
    expect(await screen.findByRole('alert')).toHaveTextContent(/zu groß.*bis 50 MB/);
  });

  it('bleibt danach bedienbar: eine gute Datei lädt trotzdem', async () => {
    render(<App />);
    legeAb(new File([''], 'leer.x83'));
    await screen.findByRole('alert');
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Hinweisleiste: mehrere Dateien (Issue #94)', () => {
  it('liest die erste Datei und sagt, dass die anderen nicht gelesen werden', async () => {
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'), fixtureDatei('sample.X83'));
    await warteAufLv();

    const leiste = hinweisleiste();
    expect(leiste).not.toBeNull();
    expect(leiste).toHaveTextContent('2 Dateien');
    expect(leiste).toHaveTextContent('gaeb-xml-beispiel.x83');
    expect(leiste).toHaveTextContent('Es wird immer nur eine Datei gelesen');
  });

  it('zeigt bei einer einzelnen Datei keinen Hinweis', async () => {
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    expect(hinweisleiste()).toBeNull();
  });

  it('lässt sich schließen', async () => {
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'), fixtureDatei('sample.X83'));
    await warteAufLv();

    fireEvent.click(
      within(hinweisleiste() as HTMLElement).getByRole('button', {
        name: 'Hinweis schließen',
      }),
    );
    expect(hinweisleiste()).toBeNull();
  });
});

describe('Hinweisleiste: Teilen-Link (Issue #95)', () => {
  it('nennt, welche Teile des Links nicht passen', async () => {
    setzeFragment('#v=table~f.gibtsnicht=a~q=Beton');
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    // Der passende Rest gilt trotzdem.
    await warteAufTabelle();

    expect(hinweisleiste()).toHaveTextContent('Der Link passt nur teilweise zu dieser Datei');
    expect(hinweisleiste()).toHaveTextContent('Filter „gibtsnicht"');
  });

  it('meldet eine OZ, die es in dieser Datei nicht gibt', async () => {
    setzeFragment('#p=99.9999.9999');
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    await waitFor(() => expect(hinweisleiste()).toHaveTextContent('Auswahl'));
  });

  it('meldet nichts bei einem Link, der passt', async () => {
    setzeFragment('#v=table~q=Beton');
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    // Erst wenn der Link angewendet ist, sagt „kein Hinweis" etwas aus.
    await warteAufTabelle();
    expect(hinweisleiste()).toBeNull();
  });

  it('meldet nichts ohne Link', async () => {
    render(<App />);
    legeAb(fixtureDatei('gaeb-xml-beispiel.x83'));
    await warteAufLv();
    expect(hinweisleiste()).toBeNull();
  });
});
