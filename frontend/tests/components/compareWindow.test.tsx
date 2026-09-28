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

async function ladeTabelle(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Tabelle' }));
}

/** Zeilen der Positionstabelle, in der gezeichneten Reihenfolge. */
function tabellenzeilen(): HTMLElement[] {
  const table = screen.getByRole('grid', { name: 'Positionen' });
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.getAttribute('aria-selected') !== null);
}

/**
 * Lädt die Musterdatei, nimmt `anzahl` Positionen per Strg-Klick in den
 * Vergleich und wechselt in den Graphen — der Weg, den auch ein Strg-Klick auf
 * Bubbles nimmt (beides löst `toggleCompare` aus).
 */
async function imGraphenMit(anzahl: number): Promise<void> {
  await ladeTabelle();
  for (const zeile of tabellenzeilen().slice(0, anzahl)) {
    fireEvent.click(zeile, { ctrlKey: true });
  }
  fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
}

/** Wechselt in den Graphen, klappt alles auf und liefert die Positions-Bubbles. */
function positionsImGraphen(): NodeListOf<Element> {
  fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
  // Positionen erscheinen erst unter offenen Abschnitten, und der Ausschnitt
  // muss sie danach auch zeigen.
  fireEvent.click(screen.getByTitle('Alles ausklappen'));
  fireEvent.click(screen.getByTitle('Alles einpassen'));
  return document.querySelectorAll('[data-tier="position"]');
}

function fenster(): HTMLElement | null {
  return screen.queryByRole('group', { name: /Fenster über dem Graphen/ });
}

describe('Vergleichsfenster im Graphen', () => {
  it('bleibt weg, solange nur eine Position im Vergleich steht', async () => {
    // Eine Spalte ist kein Vergleich. Der Strg-Klick hat trotzdem gewirkt — das
    // sagt die Ansicht „Vergleich", nicht ein Fenster mit einer Spalte.
    await imGraphenMit(1);
    expect(fenster()).toBeNull();
  });

  it('steht ab zwei Positionen über dem Graphen, ohne die Ansicht zu wechseln', async () => {
    await imGraphenMit(2);
    const panel = fenster();
    expect(panel).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Graph' })).toBeChecked();
    // Dieselben Merkmalszeilen wie die Ansicht (CompareBody in beiden).
    expect(within(panel as HTMLElement).getByRole('rowheader', { name: 'MENGE' })).toBeVisible();
    expect(within(panel as HTMLElement).getByText(/VERGLEICH · 2 POS\./)).toBeInTheDocument();
  });

  it('nennt dieselbe Zahl an Unterschieden wie die Ansicht', async () => {
    // Zwei Zähler, eine Quelle (`diffCount`): driften sie auseinander,
    // behaupten Fenster und Ansicht Verschiedenes über dieselben Positionen.
    await imGraphenMit(2);
    const kopf =
      within(fenster() as HTMLElement).getByText(/VERGLEICH · 2 POS\./).textContent ?? '';
    const imFenster = /· (\d+) UNTERSCHIEDE/.exec(kopf)?.[1] ?? '0';

    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getAllByText(/nebeneinander/)[0]?.textContent ?? '').toContain(
      `${imFenster} Unterschiede`,
    );
  });

  it('schaltet „nur Unterschiede" um und nimmt den Stand in die Ansicht mit', async () => {
    await imGraphenMit(2);
    const schalter = within(fenster() as HTMLElement).getByRole('button', {
      name: 'NUR UNTERSCHIEDE',
    });
    expect(schalter).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(schalter);
    expect(schalter).toHaveAttribute('aria-pressed', 'true');

    // Ein Zustand, beide Orte: in der Ansicht steht der Umschalter jetzt auf
    // „Nur Unterschiede".
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getByRole('radio', { name: 'Nur Unterschiede' })).toBeChecked();
  });

  it('führt mit „ganze Ansicht" in die Ansicht „Vergleich"', async () => {
    await imGraphenMit(2);
    fireEvent.click(
      within(fenster() as HTMLElement).getByRole('button', { name: 'GANZE ANSICHT' }),
    );
    expect(screen.getByRole('radio', { name: 'Vergleich' })).toBeChecked();
  });

  it('schlägt ab drei Spalten die ganze Ansicht vor', async () => {
    await imGraphenMit(3);
    const panel = fenster() as HTMLElement;
    expect(within(panel).getByText(/Spalten sind im Fenster eng/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'in der ganzen Ansicht zeigen' }));
    expect(screen.getByRole('radio', { name: 'Vergleich' })).toBeChecked();
  });

  it('macht bei zwei Spalten keinen Vorschlag — da ist nichts eng', async () => {
    await imGraphenMit(2);
    expect(screen.queryByText(/Spalten sind im Fenster eng/)).toBeNull();
  });

  it('schließt das Fenster, ohne den Vergleich zu verwerfen', async () => {
    await imGraphenMit(2);
    fireEvent.click(
      within(fenster() as HTMLElement).getByRole('button', {
        name: 'Vergleichsfenster schließen',
      }),
    );
    expect(fenster()).toBeNull();

    // Die Positionen stehen weiter im Vergleich — sonst wäre das ✕ ein
    // verstecktes „Auswahl leeren".
    fireEvent.click(screen.getByRole('radio', { name: 'Vergleich' }));
    expect(screen.getAllByText(/nebeneinander/)[0]?.textContent ?? '').toContain('2 Positionen');
  });

  it('bietet das geschlossene Fenster in der Kopfzeile des Graphen wieder an', async () => {
    // Ohne diesen Weg zurück wäre der Vergleich nach dem ✕ nur noch über den
    // Ansichtswechsel erreichbar, obwohl die Positionen weiter darin stehen.
    await imGraphenMit(2);
    fireEvent.click(
      within(fenster() as HTMLElement).getByRole('button', {
        name: 'Vergleichsfenster schließen',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^VERGLEICH · 2 POS\. ZEIGEN$/ }));
    expect(fenster()).not.toBeNull();
    expect(screen.queryByRole('button', { name: /ZEIGEN$/ })).toBeNull();
  });

  it('holt ein geschlossenes Fenster zurück, sobald eine Position dazukommt', async () => {
    await imGraphenMit(2);
    fireEvent.click(
      within(fenster() as HTMLElement).getByRole('button', {
        name: 'Vergleichsfenster schließen',
      }),
    );
    expect(fenster()).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Tabelle' }));
    fireEvent.click(tabellenzeilen()[2], { ctrlKey: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Graph' }));
    expect(fenster()).not.toBeNull();
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
    await ladeTabelle();
    const punkte = positionsImGraphen();
    expect(punkte.length).toBeGreaterThan(1);
    fireEvent.click(punkte[0]);
    expect(fenster()).toBeNull();
    fireEvent.click(punkte[1], { ctrlKey: true });
    expect(within(fenster() as HTMLElement).getByText(/VERGLEICH · 2 POS\./)).toBeInTheDocument();
  });

  it('nimmt per Rechtsklick-Menü in den Vergleich und wieder heraus', async () => {
    await ladeTabelle();
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
    await ladeTabelle();
    const punkte = positionsImGraphen();
    fireEvent.contextMenu(punkte[0]);
    expect(screen.getByRole('button', { name: 'Zum Vergleich hinzufügen' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Zum Vergleich hinzufügen' })).toBeNull();
    expect(fenster()).toBeNull();
  });
});
