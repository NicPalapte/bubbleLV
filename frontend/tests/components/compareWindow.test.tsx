// Vergleich als Fenster über dem Graphen (WP-R, R3).
//
// Die Zusage dahinter: der Vergleich entsteht im Graphen (Strg-Klick auf zwei
// Bubbles) und wird dort auch beantwortet — ohne Ansichtswechsel, mit
// **denselben** Merkmalszeilen wie die Ansicht „Vergleich".
//
// Geprüft wird deshalb nicht nur, dass das Fenster dasteht, sondern dass es
// dieselbe Wahrheit zeigt wie die Ansicht und dass jeder Knopf darin etwas tut
// — jeder einmal durchgeklickt, wie nach R2 zugesagt.

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

/** Lädt die Musterdatei — danach steht der Graph als Hauptscreen da. */
async function ladeGraph(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/** Holt die Tabelle über das Dock als Fenster über den Graphen. */
function oeffneTabelle(): void {
  fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
}

function schliesseTabelle(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
}

/** Zeilen der Positionstabelle, in der gezeichneten Reihenfolge. */
function tabellenzeilen(): HTMLElement[] {
  const table = screen.getByRole('grid', { name: 'Positionen' });
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('aria-selected') !== null);
}

/**
 * Lädt die Musterdatei und nimmt `anzahl` Positionen per Strg-Klick im
 * Tabellenfenster in den Vergleich — der Weg, den auch ein Strg-Klick auf
 * Bubbles nimmt (beides löst `toggleCompare` aus). Danach ist die Tabelle
 * wieder zu, nur der Graph steht da.
 */
async function imGraphenMit(anzahl: number): Promise<void> {
  await ladeGraph();
  oeffneTabelle();
  for (const zeile of tabellenzeilen().slice(0, anzahl)) {
    fireEvent.click(zeile, { ctrlKey: true });
  }
  schliesseTabelle();
}

/** Klappt im Graphen alles auf und liefert die Positions-Bubbles. */
function positionsImGraphen(): NodeListOf<Element> {
  // Positionen erscheinen erst unter offenen Abschnitten, und der Ausschnitt
  // muss sie danach auch zeigen.
  fireEvent.click(screen.getByTitle('Alles ausklappen'));
  fireEvent.click(screen.getByTitle('Alles einpassen'));
  return document.querySelectorAll('[data-tier="position"]');
}

function fenster(): HTMLElement | null {
  return screen.queryByRole('group', { name: /Fenster über dem Graphen/ });
}

/** Knopf im Dock, der ein geschlossenes Vergleichsfenster zurückholt. */
function dockVergleich(): HTMLElement | null {
  return screen.queryByRole('button', { name: /^⇄ Vergleich/ });
}

function schliesseFenster(): void {
  fireEvent.click(
    within(fenster() as HTMLElement).getByRole('button', {
      name: 'Vergleichsfenster schließen',
    }),
  );
}

describe('Vergleichsfenster im Graphen', () => {
  it('bleibt weg, solange nur eine Position im Vergleich steht', async () => {
    // Eine Spalte ist kein Vergleich. Der Strg-Klick hat trotzdem gewirkt —
    // das sagt der Knopf im Dock, nicht ein Fenster mit einer Spalte.
    await imGraphenMit(1);
    expect(fenster()).toBeNull();
    expect(dockVergleich()).toHaveTextContent('1');
  });

  it('steht ab zwei Positionen über dem Graphen, ohne die Ansicht zu wechseln', async () => {
    await imGraphenMit(2);
    const panel = fenster();
    expect(panel).not.toBeNull();
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toContainElement(panel);
    // Merkmalszeilen aus CompareBody, eine Spalte je Position.
    expect(within(panel as HTMLElement).getByRole('rowheader', { name: 'MENGE' })).toBeVisible();
    expect(within(panel as HTMLElement).getByText(/VERGLEICH · 2 POS\./)).toBeInTheDocument();
  });

  it('nennt so viele Unterschiede, wie „nur Unterschiede" Zeilen übrig lässt', async () => {
    // Zwei Wege zur selben Zahl (`diffCount` im Kopf, `differs` je Zeile):
    // driften sie auseinander, behauptet das Fenster Verschiedenes über
    // dieselben Positionen.
    await imGraphenMit(2);
    const panel = fenster() as HTMLElement;
    const kopf = within(panel).getByText(/VERGLEICH · 2 POS\./).textContent ?? '';
    const imKopf = Number(/· (\d+) UNTERSCHIEDE/.exec(kopf)?.[1] ?? '0');

    const alle = within(panel).getAllByRole('row').length;
    fireEvent.click(within(panel).getByRole('button', { name: 'NUR UNTERSCHIEDE' }));
    const zeilen = within(panel).queryAllByRole('row');
    expect(zeilen).toHaveLength(imKopf);
    expect(zeilen.length).toBeLessThan(alle);
    // Was stehen bleibt, ist auch als Unterschied markiert.
    for (const zeile of zeilen) expect(zeile.getAttribute('data-differs')).toBe('true');
  });

  it('schaltet „nur Unterschiede" um und behält den Stand über das Schließen', async () => {
    await imGraphenMit(2);
    const schalter = within(fenster() as HTMLElement).getByRole('button', {
      name: 'NUR UNTERSCHIEDE',
    });
    expect(schalter).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(schalter);
    expect(schalter).toHaveAttribute('aria-pressed', 'true');

    // Der Stand liegt im Ansichtszustand, nicht im Fenster: zu und wieder auf
    // steht er noch.
    schliesseFenster();
    fireEvent.click(dockVergleich() as HTMLElement);
    expect(
      within(fenster() as HTMLElement).getByRole('button', { name: 'NUR UNTERSCHIEDE' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('zeigt auch drei Spalten im Fenster — ohne Verweis auf eine andere Ansicht', async () => {
    await imGraphenMit(3);
    const panel = fenster() as HTMLElement;
    expect(within(panel).getByText(/VERGLEICH · 3 POS\./)).toBeInTheDocument();
    expect(
      within(panel).getAllByRole('button', { name: /aus dem Vergleich nehmen$/ }),
    ).toHaveLength(3);
    expect(within(panel).queryByRole('button', { name: 'GANZE ANSICHT' })).toBeNull();
  });

  it('zeigt fünf nebeneinander und benennt die übrigen', async () => {
    await imGraphenMit(6);
    const panel = fenster() as HTMLElement;
    // Mehr als fünf Spalten sind nicht mehr lesbar — die sechste wird nicht
    // weggeworfen, sondern benannt.
    const kopf = within(panel).getByText(/VERGLEICH ·/).textContent ?? '';
    expect(kopf).toContain('VERGLEICH · 5 POS.');
    expect(kopf).toContain('1 WARTEN');
    expect(
      within(panel).getAllByRole('button', { name: /aus dem Vergleich nehmen$/ }),
    ).toHaveLength(5);
  });

  it('schließt das Fenster, ohne den Vergleich zu verwerfen', async () => {
    await imGraphenMit(2);
    schliesseFenster();
    expect(fenster()).toBeNull();

    // Die Positionen stehen weiter im Vergleich — sonst wäre das ✕ ein
    // verstecktes „Auswahl leeren".
    expect(dockVergleich()).toHaveTextContent('2');
  });

  it('bietet das geschlossene Fenster im Dock unter dem Graphen wieder an', async () => {
    // Ohne diesen Weg zurück wäre der Vergleich nach dem ✕ unerreichbar,
    // obwohl die Positionen weiter darin stehen.
    await imGraphenMit(2);
    expect(dockVergleich()).toBeNull();
    schliesseFenster();
    fireEvent.click(dockVergleich() as HTMLElement);
    expect(fenster()).not.toBeNull();
    expect(dockVergleich()).toBeNull();
  });

  it('holt ein geschlossenes Fenster zurück, sobald eine Position dazukommt', async () => {
    await imGraphenMit(2);
    schliesseFenster();
    expect(fenster()).toBeNull();

    oeffneTabelle();
    fireEvent.click(tabellenzeilen()[2], { ctrlKey: true });
    expect(fenster()).not.toBeNull();
  });

  it('führt aus jeder Spalte zurück in die Tabelle', async () => {
    await imGraphenMit(2);
    expect(screen.queryByRole('grid', { name: 'Positionen' })).toBeNull();
    fireEvent.click(
      within(fenster() as HTMLElement).getAllByRole('button', { name: 'IN DER TABELLE' })[0],
    );
    // Die Tabelle kommt als Fenster dazu, der Vergleich bleibt stehen.
    expect(
      screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(fenster()).not.toBeNull();
  });

  it('lässt den Filter unangetastet', async () => {
    await ladeGraph();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(screen.getByLabelText('Suche')).toHaveValue('Beton'));
    oeffneTabelle();
    const zeilen = tabellenzeilen();
    expect(zeilen.length).toBeGreaterThan(1);
    fireEvent.click(zeilen[0], { ctrlKey: true });
    fireEvent.click(zeilen[1], { ctrlKey: true });
    expect(fenster()).not.toBeNull();
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('bleibt beim Herausnehmen über das Spalten-✕ offen, bis keine Spalte mehr da ist', async () => {
    // Wer im Fenster aussortiert, will das Fenster behalten (Owner in PR #86).
    await imGraphenMit(2);
    const spalten = within(fenster() as HTMLElement).getAllByRole('button', {
      name: /aus dem Vergleich nehmen$/,
    });
    expect(spalten).toHaveLength(2);
    fireEvent.click(spalten[0]);

    const panel = fenster() as HTMLElement;
    expect(panel).not.toBeNull();
    expect(within(panel).getByText(/VERGLEICH · 1 POS\./)).toBeInTheDocument();
    // Eine Spalte allein: das Fenster sagt, wie die nächste dazukommt.
    expect(within(panel).getByText(/kommt die nächste dazu/)).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: /aus dem Vergleich nehmen$/ }));
    expect(fenster()).toBeNull();
  });

  it('ändert mit den Pfeiltasten am Griff seine eigene Größe', async () => {
    await imGraphenMit(2);
    const panel = fenster() as HTMLElement;
    const vorher = panel.style.width;
    fireEvent.keyDown(
      within(panel).getByRole('button', { name: 'Vergleichsfenster in der Größe ändern' }),
      { key: 'ArrowLeft' },
    );
    expect((fenster() as HTMLElement).style.width).not.toBe(vorher);
  });

  it('öffnet mit Klick und dann Strg-Klick — die angewählte Position zählt mit', async () => {
    // Der Weg aus dem Owner-Kommentar in PR #86: erst eine Position ganz normal
    // anklicken, dann die nächste mit Strg dazunehmen.
    await ladeGraph();
    const punkte = positionsImGraphen();
    expect(punkte.length).toBeGreaterThan(1);
    fireEvent.click(punkte[0]);
    expect(fenster()).toBeNull();
    fireEvent.click(punkte[1], { ctrlKey: true });
    expect(within(fenster() as HTMLElement).getByText(/VERGLEICH · 2 POS\./)).toBeInTheDocument();
  });

  it('nimmt per Rechtsklick-Menü in den Vergleich und wieder heraus', async () => {
    await ladeGraph();
    const punkte = positionsImGraphen();
    fireEvent.click(punkte[0]);

    // Mit angewählter Position sagt das Menü, womit verglichen wird.
    fireEvent.contextMenu(punkte[1]);
    fireEvent.click(screen.getByRole('button', { name: /^Mit .+ vergleichen$/ }));
    expect(within(fenster() as HTMLElement).getByText(/VERGLEICH · 2 POS\./)).toBeInTheDocument();
    // Das Menü schließt nach der Wahl.
    expect(screen.queryByRole('button', { name: /vergleichen$/ })).toBeNull();

    fireEvent.contextMenu(punkte[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Aus dem Vergleich nehmen' }));
    // Herausnehmen lässt das Fenster stehen — mit der verbliebenen Spalte.
    expect(within(fenster() as HTMLElement).getByText(/VERGLEICH · 1 POS\./)).toBeInTheDocument();
  });

  it('schließt das Rechtsklick-Menü mit Escape, ohne etwas zu ändern', async () => {
    await ladeGraph();
    const punkte = positionsImGraphen();
    fireEvent.contextMenu(punkte[0]);
    expect(screen.getByRole('button', { name: 'Zum Vergleich hinzufügen' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Zum Vergleich hinzufügen' })).toBeNull();
    expect(fenster()).toBeNull();
  });
});
