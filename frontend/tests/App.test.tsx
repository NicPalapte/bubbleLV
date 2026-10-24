import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

function fixtureFile(name: string): File {
  return new File([readFileSync(resolve(FIXTURE_DIR, name))], name);
}

async function loadFixture(name: string): Promise<void> {
  const input = screen.getByLabelText('GAEB-Datei auswählen');
  fireEvent.change(input, { target: { files: [fixtureFile(name)] } });
}

/** Datei laden und warten, bis die Kopfleiste die Filter anbietet. */
async function loadAndWait(name = 'gaeb-xml-beispiel.x83'): Promise<void> {
  render(<App />);
  await loadFixture(name);
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

/**
 * Eine Position im Graphen anklicken. Die Punkte stehen in der Reihenfolge des
 * Positions-Index, also der OZ — Punkt 0 ist die erste Position des LVs.
 */
function clickPoint(slot: number): void {
  const point = document.querySelector(`[data-slot="${slot}"]`);
  if (point === null) throw new Error(`Punkt ${slot} fehlt im Graphen`);
  fireEvent.click(point);
}

/** Die Tabelle steht im Splitscreen; ist sie zu, öffnet „Ansicht" sie wieder. */
async function openTable(): Promise<HTMLElement> {
  if (screen.queryByRole('grid', { name: 'Positionen' }) === null) {
    fireEvent.click(screen.getByRole('button', { name: /^Ansicht/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tabelle$/, pressed: false }));
  }
  return screen.findByRole('grid', { name: 'Positionen' });
}

function tableWindow(): HTMLElement | null {
  return screen.queryByRole('region', { name: 'Tabelle — Bereich' });
}

function cardPane(): HTMLElement {
  return screen.getByRole('region', { name: 'Position — Bereich' });
}

/** Kennzahl über dem Graphen anklicken — sie öffnet ihren Bereich im Splitscreen. */
function kpi(name: RegExp): void {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Kennzahlen' })).getByRole('button', { name }),
  );
}

/**
 * Die erste Position im Graphen anklicken. Der Graph bleibt, die Karte zeigt die
 * Position; die Tabelle steht danach im Abschnitt „Baustelleneinrichtung".
 */
async function jumpToFirstPosition(): Promise<HTMLElement> {
  clickPoint(0);
  return openTable();
}

/** Den Abschnitt „Bauhauptgewerke" auswählen — eine Ebene über der ersten Position. */
async function selectBauhauptgewerke(): Promise<void> {
  await jumpToFirstPosition();
  fireEvent.click(screen.getByRole('button', { name: 'Eine Ebene höher' }));
}

describe('Viewer', () => {
  it('zeigt vor dem Import die Datei-Ablage und keine Fachdaten', () => {
    render(<App />);
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
    // Suche, Filter und Kennzahlen gibt es erst mit einer Datei.
    expect(screen.queryByLabelText('Suche')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Kennzahlen' })).not.toBeInTheDocument();
  });

  it('bietet zwei Demo-LVs zum Ausprobieren an — mit und ohne Preise', () => {
    render(<App />);
    // Zweiter Weg neben der eigenen Datei — das Laden selbst deckt
    // tests/pipeline/loadDemoLv.test.ts ab.
    expect(screen.getByRole('button', { name: 'Demo mit Preisen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demo ohne Preise' })).toBeInTheDocument();
    expect(screen.getByText('Demo-LV ansehen')).toBeInTheDocument();
  });

  it('lädt eine echte GAEB-Datei und zeigt Graph und Filter', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');

    await waitFor(() =>
      expect(screen.queryByText('GAEB-Datei hierher ziehen')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toBeInTheDocument();
    // Steuerung am Graphen: Größe der Positionen, eingeklappt unter „Darstellung".
    fireEvent.click(screen.getByTitle('Darstellung: Größe und Gliederung'));
    expect(screen.getByRole('radiogroup', { name: 'Größe der Positionen' })).toBeInTheDocument();

    // Die Filter stehen in der Leiste hinter „+ Filter" (Issue #154).
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    const bar = screen.getByRole('region', { name: 'Filterleiste' });
    expect(within(bar).getByRole('button', { name: 'Positionsart' })).toBeInTheDocument();
  });

  it('startet im Splitscreen mit Graph, Tabelle und Position', async () => {
    await loadAndWait();

    // Nur noch Splitscreen (Entscheidung 0074); Überblick und Prüfung gehen erst
    // auf Wunsch auf.
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(tableWindow()).toBeInTheDocument();
    expect(cardPane()).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Überblick — Bereich' })).toBeNull();

    // Die Kennzahl „Positionen" öffnet den Überblick als Bereich.
    kpi(/Positionen/);
    const panel = screen.getByRole('region', { name: 'Überblick — Bereich' });
    expect(within(panel).getByText('28 Positionen')).toBeInTheDocument();
  });

  // Abnahme von WP-L: ein Ansichtswechsel ändert weder Filter noch Auswahl,
  // und jede Ansicht steht danach wieder so da, wie man sie verlassen hat.
  it('behält Filter, Sortierung und Scrollposition über den Ansichtswechsel', async () => {
    await loadAndWait();

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    // Die Suche ist entprellt — die Kennzahlen zählen „Treffer", sobald sie greift.
    await within(screen.getByRole('group', { name: 'Kennzahlen' })).findByRole('button', {
      name: /Treffer/,
    });

    // Im Überblick ein Stück scrollen …
    kpi(/Treffer/);
    const ueberblick = (): HTMLElement =>
      screen
        .getByRole('region', { name: 'Überblick — Bereich' })
        .querySelector<HTMLElement>('.overflow-auto')!;
    fireEvent.scroll(ueberblick(), { target: { scrollTop: 240 } });

    // … in der Tabelle nach Menge sortieren …
    const table = await openTable();
    fireEvent.click(within(table).getByRole('button', { name: /Menge/ }));
    await waitFor(() =>
      expect(within(table).getByRole('columnheader', { name: /Menge/ })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );

    // … Bereiche schließen und wieder öffnen: Suche, Sortierung und
    // Scrollposition stehen unverändert da.
    fireEvent.click(screen.getByRole('button', { name: 'Überblick schließen' }));
    kpi(/Treffer/);
    expect(ueberblick().scrollTop).toBe(240);
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');

    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    const again = await openTable();
    expect(within(again).getByRole('columnheader', { name: /Menge/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('zeigt die Positionen in der Tabelle neben dem Graphen', async () => {
    await loadAndWait();
    const table = await openTable();

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.trim().replace(/\s+[↑↓]$/, ''));
    expect(headers).toContain('Bezeichnung');
    expect(headers).toContain('Positionsart');
    expect(headers).not.toContain('Bauteiltyp');
    // Erste Position der Beispieldatei ist in der Tabelle sichtbar.
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);
    // Der Graph steht daneben.
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toBeInTheDocument();
  });

  it('filtert die Tabelle über die Suche', async () => {
    await loadAndWait();
    const table = await openTable();
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Suche'), {
      target: { value: 'zzz-kein-treffer-zzz' },
    });
    fireEvent.click(await screen.findByRole('radio', { name: 'ausblenden' }));
    await waitFor(() =>
      expect(screen.getByText('Keine Positionen entsprechen den Filtern.')).toBeInTheDocument(),
    );
    expect(within(table).queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('zeigt Filtertreffer des ganzen LV, wenn der Abschnitt keinen hat', async () => {
    await loadAndWait();

    // Sprung zur ersten Position: die Tabelle steht im Abschnitt
    // „Baustelleneinrichtung".
    const table = await jumpToFirstPosition();
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    // „Kabel" kommt nur in den Elektroarbeiten vor — im gewählten Abschnitt
    // gibt es keinen Treffer, die Tabelle darf trotzdem nicht leer bleiben.
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Kabel' } });
    fireEvent.click(await screen.findByRole('radio', { name: 'ausblenden' }));

    await waitFor(() => expect(screen.getByText(/LV-weite Treffer/)).toBeInTheDocument());
    expect(within(table).getAllByText('002.001.0010').length).toBeGreaterThan(0);
    expect(within(table).queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('gruppiert die Filtertreffer nach Überschriften', async () => {
    await loadAndWait();
    await jumpToFirstPosition();

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });

    // Die Treffer verteilen sich über mehrere Abschnitte; jede Ebene hat ihre
    // eigene Kopfzeile.
    const table = await screen.findByRole('grid', { name: 'Positionen' });
    await waitFor(() =>
      expect(within(table).getByText('§ 001.004 · Betonarbeiten')).toBeInTheDocument(),
    );
    expect(within(table).getByText('§ 001.003 · Maurerarbeiten')).toBeInTheDocument();
    expect(within(table).getAllByText(/Bauhauptgewerke/).length).toBeGreaterThan(0);
  });

  it('schließt die Tabelle mit einem Klick, der Graph bleibt stehen', async () => {
    await loadAndWait();
    await selectBauhauptgewerke();
    await screen.findByRole('grid', { name: 'Positionen' });

    // Mehrere Ebenen tief — der Knopf am Bereich schließt ihn in einem Schritt.
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    await waitFor(() =>
      expect(screen.queryByRole('grid', { name: 'Positionen' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Ansicht/ }));
    expect(screen.getByRole('button', { name: /Tabelle$/, pressed: false })).toBeInTheDocument();
  });

  it('zeigt eine gewählte Position im Bereich „Position" (Issue #30)', async () => {
    await loadAndWait();
    expect(within(cardPane()).getByText('Keine Auswahl')).toBeInTheDocument();

    // Position in der Tabelle wählen — dieselbe Auswahl treibt die Zeile in
    // der Tabelle und die Karte neben dem Graphen.
    const table = await openTable();
    fireEvent.click(within(table).getAllByText('001.001.0010')[0]);
    await waitFor(() =>
      expect(
        within(cardPane()).getByText('Baustelleneinrichtung für sämtliche', { exact: false }),
      ).toBeInTheDocument(),
    );
  });

  it('zeigt einen gewählten Abschnitt ebenfalls im Bereich „Position"', async () => {
    await loadAndWait();

    // Abschnitt (kein Positionsblatt) wählen — die Karte zeigt dann
    // Kennzahlen statt Positionsdetails.
    await selectBauhauptgewerke();

    await waitFor(() =>
      expect(within(cardPane()).getByText('Direkte Positionen')).toBeInTheDocument(),
    );
    expect(within(cardPane()).getByText('Kennzahlen')).toBeInTheDocument();
  });

  it('schließt mit Escape zuerst das Popover, nicht die Tabelle (Issue #30)', async () => {
    await loadAndWait();
    await openTable();

    // Spaltenauswahl als Popover in der Tabelle.
    fireEvent.click(screen.getByRole('button', { name: /Spalten ▾/ }));
    expect(screen.getByRole('list', { name: 'Spalten' })).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Spalten' })).not.toBeInTheDocument(),
    );
    // Die Tabelle steht noch — Escape hat nur das Popover geschlossen.
    expect(screen.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();

    // Der Bereich ist eine bewusste Wahl — ein zweites Escape schließt ihn nicht.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(tableWindow()).toBeInTheDocument();
  });

  it('bedient die Filter über echte Schaltflächen (Tastatur)', async () => {
    await loadAndWait();
    // Umschaltgruppe Gliederung: benannte Radiogruppe statt klickbarer <span>.
    fireEvent.click(screen.getByTitle('Darstellung: Größe und Gliederung'));
    const layouts = screen.getByRole('radiogroup', { name: 'Gliederung' });
    // nach LV · Matrix
    expect(within(layouts).getAllByRole('radio').length).toBe(2);

    // Je Gruppe ein Chip mit aufklappbarer Liste echter Kästchen.
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    const bar = screen.getByRole('region', { name: 'Filterleiste' });
    const chip = within(bar).getByRole('button', { name: 'Positionsart' });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    const [option] = within(within(bar).getByRole('group', { name: 'Positionsart' })).getAllByRole(
      'checkbox',
    );
    fireEvent.click(option);
    await waitFor(() => expect(option).toBeChecked());
    // Die Zahl am Chip zeigt die gewählten Werte; Escape schließt erst die Liste.
    expect(
      within(bar).getByRole('button', { name: 'Positionsart, 1 gewählt' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(within(bar).queryByRole('group', { name: 'Positionsart' })).not.toBeInTheDocument();
  });

  it('zeigt eine verständliche Fehlermeldung bei nicht unterstützter GAEB-Version', async () => {
    render(<App />);
    await loadFixture('unsupported-version.x83');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/wird nicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
  });
});
