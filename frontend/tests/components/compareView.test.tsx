// Ansicht „Vergleich" (WP-N): Positionen sammeln, nebeneinanderlegen,
// Unterschiede sehen — und wieder zurück in den Zusammenhang.

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

async function ladeTabelle(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Tabelle' }));
}

/** Die Kopfzeile der Ansicht als Text — Zahl und Wort stehen getrennt im Markup. */
function kopfzeile(): string {
  return screen.getByText(/nebeneinander/).textContent ?? '';
}

/** Zeilen der Positionstabelle, in der gezeichneten Reihenfolge. */
function tabellenzeilen(): HTMLElement[] {
  const table = screen.getByRole('table', { name: 'Positionen' });
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('aria-selected') !== null);
}

describe('Vergleich', () => {
  it('steht leer da, solange nichts gewählt ist', async () => {
    await ladeTabelle();
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getByText(/Keine Position im Vergleich/)).toBeInTheDocument();
  });

  it('sammelt Positionen per Strg-Klick und legt sie nebeneinander', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });

    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(kopfzeile()).toContain('2 Positionen nebeneinander');
    // Eine Zeile je Merkmal, eine Spalte je Position.
    expect(screen.getByRole('rowheader', { name: 'MENGE' })).toBeInTheDocument();
  });

  it('zeigt auf Wunsch nur die Zeilen, die sich unterscheiden', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    const alle = screen.getAllByRole('row').length;
    fireEvent.click(screen.getByRole('radio', { name: 'Nur Unterschiede' }));
    const nurDiffs = screen.getAllByRole('row').length;
    expect(nurDiffs).toBeLessThan(alle);
    // Was stehen bleibt, ist auch als Unterschied markiert.
    for (const row of screen.getAllByRole('row')) {
      expect(row.getAttribute('data-differs')).toBe('true');
    }
  });

  it('nimmt eine Position auf Klick wieder heraus', async () => {
    await ladeTabelle();
    const [erste, zweite] = tabellenzeilen();
    fireEvent.click(erste, { ctrlKey: true });
    fireEvent.click(zweite, { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    fireEvent.click(screen.getAllByRole('button', { name: /aus dem Vergleich nehmen/ })[0]);
    expect(kopfzeile()).toContain('1 Position nebeneinander');
    expect(
      screen.getByText(/Eine zweite Position macht daraus einen Vergleich/),
    ).toBeInTheDocument();
  });

  it('führt aus jeder Spalte zurück in die Tabelle', async () => {
    await ladeTabelle();
    fireEvent.click(tabellenzeilen()[0], { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'IN DER TABELLE' })[0]);
    expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('table', { name: 'Positionen' })).toBeInTheDocument();
  });

  it('sammelt auch per Strg-Klick im Baum', async () => {
    await ladeTabelle();
    // Positionen stehen im Baum erst unter einem aufgeklappten Abschnitt.
    fireEvent.click(screen.getByRole('button', { name: 'Alle aufklappen' }));
    const baum = screen.getByRole('tree');
    // Positionszeilen sind die Blätter — sie tragen kein `aria-expanded`.
    const position = within(baum)
      .getAllByRole('treeitem')
      .find((zeile) => !zeile.hasAttribute('aria-expanded'));
    expect(position).toBeDefined();
    fireEvent.click(position as HTMLElement, { ctrlKey: true });

    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(kopfzeile()).toContain('1 Position nebeneinander');
  });

  it('sammelt auch per Strg-Klick im Graphen', async () => {
    await ladeTabelle();
    fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
    // Positionen erscheinen erst unter offenen Abschnitten, und der Ausschnitt
    // muss sie danach auch zeigen.
    fireEvent.click(screen.getByTitle('Alles ausklappen'));
    fireEvent.click(screen.getByTitle('Alles einpassen'));
    const punkte = document.querySelectorAll('[data-tier="position"]');
    expect(punkte.length).toBeGreaterThan(0);
    fireEvent.click(punkte[0], { ctrlKey: true });

    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(kopfzeile()).toContain('1 Position nebeneinander');
  });

  it('legt eine ganze Gruppe der Ähnlichkeit auf einmal nebeneinander', async () => {
    await ladeTabelle();
    fireEvent.click(screen.getByRole('radio', { name: 'Ähnlichkeit' }));
    const knopf = screen.getAllByRole('button', { name: 'VERGLEICHEN' })[0];
    expect(knopf).toBeDefined();
    fireEvent.click(knopf);

    // Der Knopf wechselt selbst in die Ansicht — der Weg von „diese hängen
    // zusammen" zu „worin unterscheiden sie sich" ist ein Klick.
    expect(screen.getByRole('radio', { name: 'Vergleich' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const spalten = screen.getAllByRole('button', { name: /aus dem Vergleich nehmen/ }).length;
    expect(spalten).toBeGreaterThan(1);
    expect(spalten).toBeLessThanOrEqual(5);
    expect(kopfzeile()).toContain(`${spalten} Positionen nebeneinander`);
  });

  it('lässt den Filter und die Auswahl unangetastet', async () => {
    await ladeTabelle();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(screen.getByLabelText('Suche')).toHaveValue('Beton'));
    fireEvent.click(tabellenzeilen()[0], { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });
});
