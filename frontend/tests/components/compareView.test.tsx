// Vergleich sammeln (WP-N): Positionen aus Tabelle, Graph und Ähnlichkeit in
// den Vergleich legen. Seit dem neuen Hauptscreen gibt es keine eigene Ansicht
// „Vergleich" mehr — was gesammelt ist, steht im Fenster über dem Graphen oder,
// solange es weniger als zwei sind, als Zähler im Dock darunter. Das Fenster
// selbst prüft compareWindow.test.tsx.

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

/** Lädt die Musterdatei und holt die Tabelle als Fenster über den Graphen. */
async function ladeTabelle(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
}

/** Zeilen der Positionstabelle, in der gezeichneten Reihenfolge. */
function tabellenzeilen(): HTMLElement[] {
  const table = screen.getByRole('grid', { name: 'Positionen' });
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('aria-selected') !== null);
}

function fenster(): HTMLElement | null {
  return screen.queryByRole('group', { name: /Vergleich — Fenster über dem Graphen/ });
}

/**
 * Wie viele Positionen im Vergleich stehen: aus dem Kopf des Fensters, sonst
 * aus dem Knopf im Dock, sonst keine.
 */
function imVergleich(): number {
  const panel = fenster();
  if (panel !== null) {
    const kopf = within(panel).getByText(/VERGLEICH ·/).textContent ?? '';
    return Number(/VERGLEICH · (\d+) POS\./.exec(kopf)?.[1] ?? '-1');
  }
  const dock = screen.queryByRole('button', { name: /^⇄ Vergleich/ });
  if (dock === null) return 0;
  return Number(/(\d+)/.exec(dock.textContent ?? '')?.[1] ?? '-1');
}

describe('Vergleich sammeln', () => {
  it('steht nirgends, solange nichts gewählt ist', async () => {
    await ladeTabelle();
    expect(fenster()).toBeNull();
    expect(screen.queryByRole('button', { name: /^⇄ Vergleich/ })).toBeNull();
  });

  it('sammelt Positionen per Strg-Klick in der Tabelle und legt sie nebeneinander', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    expect(imVergleich()).toBe(1);
    fireEvent.click(zweite, { ctrlKey: true });
    expect(imVergleich()).toBe(2);
    // Eine Zeile je Merkmal, eine Spalte je Position.
    expect(
      within(fenster() as HTMLElement).getByRole('rowheader', { name: 'MENGE' }),
    ).toBeInTheDocument();
  });

  it('sammelt auch per Strg-Klick im Graphen', async () => {
    await ladeTabelle();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    // Positionen erscheinen erst unter offenen Abschnitten, und der Ausschnitt
    // muss sie danach auch zeigen.
    fireEvent.click(screen.getByTitle('Alles ausklappen'));
    fireEvent.click(screen.getByTitle('Alles einpassen'));
    const punkte = document.querySelectorAll('[data-tier="position"]');
    expect(punkte.length).toBeGreaterThan(0);
    fireEvent.click(punkte[0], { ctrlKey: true });
    expect(imVergleich()).toBe(1);
  });

  it('legt eine ganze Gruppe der Ähnlichkeit auf einmal nebeneinander', async () => {
    await ladeTabelle();
    // Die Ähnlichkeit ist eine eigene Fläche, erreichbar über die Befehle.
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Befehle/ }));
    fireEvent.change(screen.getByLabelText('Befehl oder OZ'), {
      target: { value: 'Ähnlichkeit' },
    });
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Kommandopalette' }), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByRole('main', { name: 'Ähnlichkeit' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'VERGLEICHEN' })[0]);

    // Der Knopf führt selbst zurück in den Graphen, mit offenem Fenster — der
    // Weg von „diese hängen zusammen" zu „worin unterscheiden sie sich" ist
    // ein Klick.
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    const spalten = within(fenster() as HTMLElement).getAllByRole('button', {
      name: /aus dem Vergleich nehmen/,
    }).length;
    expect(spalten).toBeGreaterThan(1);
    expect(spalten).toBeLessThanOrEqual(5);
    expect(imVergleich()).toBe(spalten);
  });

  it('nimmt per Rechtsklick in der Tabelle in den Vergleich — mit der angewählten', async () => {
    await ladeTabelle();
    fireEvent.click(tabellenzeilen()[0]);
    fireEvent.contextMenu(tabellenzeilen()[1]);
    fireEvent.click(screen.getByRole('button', { name: /^Mit .+ vergleichen$/ }));
    // Das Menü schließt nach der Wahl.
    expect(screen.queryByRole('group', { name: /^Position / })).toBeNull();
    expect(imVergleich()).toBe(2);
  });

  it('bietet in der Tabelle „Aus dem Vergleich nehmen" an, wenn die Zeile schon drin ist', async () => {
    await ladeTabelle();
    fireEvent.click(tabellenzeilen()[0], { ctrlKey: true });
    expect(imVergleich()).toBe(1);
    fireEvent.contextMenu(tabellenzeilen()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Aus dem Vergleich nehmen' }));
    expect(imVergleich()).toBe(0);
  });

  it('schließt das Menü in der Tabelle beim Scrollen und mit Escape', async () => {
    await ladeTabelle();
    fireEvent.contextMenu(tabellenzeilen()[0]);
    expect(screen.getByRole('group', { name: /^Position / })).toBeInTheDocument();
    fireEvent.scroll(screen.getByRole('grid', { name: 'Positionen' }));
    expect(screen.queryByRole('group', { name: /^Position / })).toBeNull();

    fireEvent.contextMenu(tabellenzeilen()[0]);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: /^Position / })).toBeNull();
  });
});
