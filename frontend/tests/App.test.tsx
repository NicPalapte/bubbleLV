import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

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
 * Befehl über die Kommandopalette auslösen. Einen Ansichtsumschalter gibt es
 * nicht mehr: der Graph ist der Hauptscreen, alles andere schwebt darüber.
 */
async function command(text: string): Promise<void> {
  // Die Palette hängt ihren Listener in einem Effekt an — erst danach öffnet der Knopf sie.
  await act(async () => {});
  fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Befehle/ }));
  fireEvent.change(screen.getByLabelText('Befehl oder OZ'), { target: { value: text } });
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Kommandopalette' })).getAllByRole('option')[0],
  );
}

/** Tabellenfenster über den Knopf unten mittig öffnen. */
async function openTable(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
  return screen.findByRole('grid', { name: 'Positionen' });
}

function tableWindow(): HTMLElement | null {
  return screen.queryByRole('region', { name: 'Tabelle — Fenster über dem Graphen' });
}

/** Kennzahl über dem Graphen anklicken — sie öffnet ihren Reiter im Seitenfenster. */
function kpi(name: RegExp): void {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Kennzahlen' })).getByRole('button', { name }),
  );
}

/**
 * Per OZ zur ersten Position springen. Im Graphen bleibt der Sprung dort (die
 * Karte zeigt die Position); das Tabellenfenster steht danach im Abschnitt
 * „Baustelleneinrichtung".
 */
async function jumpToFirstPosition(): Promise<HTMLElement> {
  await command('001.001.0010');
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
    // Steuerung am Graphen: Größe der Positionen.
    expect(screen.getByRole('radiogroup', { name: 'Größe der Positionen' })).toBeInTheDocument();

    // Die Filter stehen im Seitenfenster hinter „+ Filter".
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    const panel = screen.getByRole('complementary', { name: 'Seitenfenster' });
    expect(within(panel).getByRole('region', { name: 'Positionsart' })).toBeInTheDocument();
  });

  it('startet nach dem Import im Graphen, ohne offene Fenster', async () => {
    await loadAndWait();

    // Der Graph ist der Hauptscreen (docs/decisions/0034); Seitenfenster und
    // Tabelle gehen erst auf Wunsch auf.
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Seitenfenster' })).not.toBeInTheDocument();
    expect(tableWindow()).not.toBeInTheDocument();

    // Die Kennzahl „Positionen" öffnet den Überblick als Reiter.
    kpi(/Positionen/);
    const panel = screen.getByRole('complementary', { name: 'Seitenfenster' });
    expect(within(panel).getByRole('tab', { name: 'Überblick' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
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
      screen.getByRole('tabpanel').firstElementChild as HTMLElement;
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

    // … Reiter und Fenster wechseln und zurück: Suche, Sortierung und
    // Scrollposition stehen unverändert da.
    fireEvent.click(screen.getByRole('tab', { name: /Prüfung/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Überblick' }));
    expect(ueberblick().scrollTop).toBe(240);
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');

    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    const again = await openTable();
    expect(within(again).getByRole('columnheader', { name: /Menge/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('zeigt die Positionen im Tabellenfenster über dem Graphen', async () => {
    await loadAndWait();
    const table = await openTable();

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.trim().replace(/\s+[↑↓]$/, ''));
    expect(headers).toContain('Bezeichnung');
    expect(headers).toContain('Positionsart');
    expect(headers).toContain('Bauteiltyp');
    // Erste Position der Beispieldatei ist in der Tabelle sichtbar.
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);
    // Der Graph bleibt darunter stehen.
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toBeInTheDocument();
  });

  it('filtert die Tabelle über die Suche', async () => {
    await loadAndWait();
    const table = await openTable();
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Suche'), {
      target: { value: 'zzz-kein-treffer-zzz' },
    });
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

    await waitFor(() => expect(screen.getByText(/LV-weite Treffer/)).toBeInTheDocument());
    expect(within(table).getAllByText('002.001.0010').length).toBeGreaterThan(0);
    expect(within(table).queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('gruppiert die Filtertreffer nach Überschriften', async () => {
    await loadAndWait();
    await jumpToFirstPosition();

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });

    // Die Treffer verteilen sich über mehrere Abschnitte und stehen jeweils
    // unter ihrem Überschriftenpfad.
    const table = await screen.findByRole('grid', { name: 'Positionen' });
    await waitFor(() =>
      expect(
        within(table).getByText(/Bauhauptgewerke.+§ 001\.004 · Betonarbeiten/),
      ).toBeInTheDocument(),
    );
    expect(
      within(table).getByText(/Bauhauptgewerke.+§ 001\.003 · Maurerarbeiten/),
    ).toBeInTheDocument();
  });

  it('schließt das Tabellenfenster mit einem Klick, der Graph bleibt stehen', async () => {
    await loadAndWait();
    await selectBauhauptgewerke();
    await screen.findByRole('grid', { name: 'Positionen' });

    // Mehrere Ebenen tief — der Knopf am Fenster schließt es in einem Schritt.
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    await waitFor(() =>
      expect(screen.queryByRole('grid', { name: 'Positionen' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^▴ Tabelle/ })).toBeInTheDocument();
  });

  it('zeigt eine gewählte Position im Graphen als schwebende Karte (Issue #30)', async () => {
    await loadAndWait();

    // Position in der Tabelle wählen — dieselbe Auswahl treibt die Zeile in
    // der Tabelle und die schwebende Karte über dem Graphen.
    const table = await openTable();
    fireEvent.click(within(table).getAllByText('001.001.0010')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));

    // Die Karte zeigt die Positionsdetails.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Karte schließen' })).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Baustelleneinrichtung für sämtliche', { exact: false }),
    ).toBeInTheDocument();

    // Escape schließt die Karte komplett — sie springt nicht auf den
    // übergeordneten Abschnitt zurück, sondern verschwindet in einem Schritt.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Karte schließen' })).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Baustelleneinrichtung für sämtliche', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('zeigt einen gewählten Abschnitt im Graphen ebenfalls als schwebende Karte', async () => {
    await loadAndWait();

    // Abschnitt (kein Positionsblatt) wählen — die Karte zeigt dann
    // Kennzahlen statt Positionsdetails.
    await selectBauhauptgewerke();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Karte schließen' })).toBeInTheDocument(),
    );
    expect(screen.getByText('Kennzahlen')).toBeInTheDocument();
    expect(screen.getByText('Direkte Positionen')).toBeInTheDocument();
  });

  it('scrollt in der Auswahlkarte, statt den Graphen zu zoomen oder zu ziehen (Issue #47)', async () => {
    await loadAndWait();
    await selectBauhauptgewerke();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));

    const closeButton = await screen.findByRole('button', { name: 'Karte schließen' });
    const card = closeButton.closest('[data-graph-overlay]');
    expect(card).not.toBeNull();

    // Der Canvas hängt seinen Rad-Listener auf den gesamten Wrapper. Über der
    // Karte darf er nicht greifen — sonst scrollt ihr Inhalt nie.
    const wheel = (target: Element): boolean =>
      target.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 90 }),
      );
    expect(wheel(closeButton)).toBe(true);

    const canvas = screen.getByRole('group', { name: /Bubble-Graph/ });
    expect(wheel(canvas)).toBe(false);

    // Ein Zug in der Karte (Scrollbalken, Textauswahl) verschiebt den Graphen nicht.
    fireEvent.mouseDown(closeButton, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 140, clientY: 90 });
    expect(canvas).toHaveStyle({ cursor: 'grab' });
    fireEvent.mouseUp(document);

    // Auf dem Canvas selbst bleibt das Ziehen erhalten.
    fireEvent.mouseDown(canvas, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 140, clientY: 90 });
    expect(canvas).toHaveStyle({ cursor: 'grabbing' });
    fireEvent.mouseUp(document);
  });

  it('zieht die Auswahlkarte am Knopf unten links auf', async () => {
    await loadAndWait();
    await selectBauhauptgewerke();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));

    const closeButton = await screen.findByRole('button', { name: 'Karte schließen' });
    const card = closeButton.closest('[data-graph-overlay]') as HTMLElement;
    expect(card.style.width).toBe('380px');
    expect(card.style.height).toBe('');

    // Die Karte hängt rechts oben: nach links zieht sie breiter, nach unten höher.
    const handle = screen.getByRole('button', { name: 'Info-Panel in der Größe ändern' });
    fireEvent.mouseDown(handle, { clientX: 400, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 260, clientY: 480 });
    expect(card.style.width).toBe('520px');
    expect(card.style.height).toBe('180px');
    fireEvent.mouseUp(document);

    // Unter die Mindestgröße geht es nicht — sonst bliebe nichts Lesbares übrig.
    fireEvent.mouseDown(handle, { clientX: 260, clientY: 480 });
    fireEvent.mouseMove(document, { clientX: 900, clientY: 0 });
    expect(card.style.width).toBe('280px');
    expect(card.style.height).toBe('160px');
    fireEvent.mouseUp(document);

    // Der Knopf zieht nur die Karte auf, nicht den Graphen darunter.
    expect(screen.getByRole('group', { name: /Bubble-Graph/ })).toHaveStyle({ cursor: 'grab' });

    // Pfeiltasten am Knopf ändern die Größe ebenfalls — links vergrößert.
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(card.style.width).toBe('296px');
  });

  it('merkt sich den Ort der Auswahlkarte über den Ansichtswechsel', async () => {
    await loadAndWait();
    await selectBauhauptgewerke();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));

    const closeButton = await screen.findByRole('button', { name: 'Karte schließen' });
    const card = closeButton.closest('[data-graph-overlay]') as HTMLElement;
    expect(card.style.right).toBe('16px');

    // Karte am Ziehgriff beiseiteschieben.
    fireEvent.mouseDown(screen.getByLabelText('Karte verschieben'), { clientX: 500, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 400, clientY: 350 });
    fireEvent.mouseUp(document);
    expect(card.style.right).toBe('116px');
    expect(card.style.top).toBe('66px');

    // Nach einem Ausflug ins Seitenfenster steht sie wieder dort, nicht in der Ecke.
    await command('Überblick');
    fireEvent.click(await screen.findByRole('button', { name: 'Seitenfenster schließen' }));
    const wieder = (await screen.findByRole('button', { name: 'Karte schließen' })).closest(
      '[data-graph-overlay]',
    ) as HTMLElement;
    expect(wieder.style.right).toBe('116px');
    expect(wieder.style.top).toBe('66px');
  });

  it('schließt mit Escape zuerst das Popover, nicht das Tabellenfenster (Issue #30)', async () => {
    await loadAndWait();
    await openTable();

    // Spaltenauswahl als Popover im Tabellenfenster.
    fireEvent.click(screen.getByRole('button', { name: /Spalten ▾/ }));
    expect(screen.getByRole('list', { name: 'Spalten' })).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Spalten' })).not.toBeInTheDocument(),
    );
    // Die Tabelle steht noch — Escape hat nur das Popover geschlossen.
    expect(screen.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();

    // Das Fenster ist eine bewusste Wahl — ein zweites Escape schließt es nicht.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(tableWindow()).toBeInTheDocument();
  });

  it('bedient die Filter über echte Schaltflächen (Tastatur)', async () => {
    await loadAndWait();
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    const panel = screen.getByRole('complementary', { name: 'Seitenfenster' });

    // Umschaltgruppe Gliederung: benannte Radiogruppe statt klickbarer <span>.
    const layouts = within(panel).getByRole('radiogroup', { name: 'Gliederung' });
    // nach LV · frei
    expect(within(layouts).getAllByRole('radio').length).toBe(2);

    // Facettenwerte sind Schaltflächen mit Auswahlzustand.
    const facet = within(panel).getByRole('region', { name: 'Positionsart' });
    const [option] = within(facet).getAllByRole('button', { pressed: false });
    fireEvent.click(option);
    await waitFor(() => expect(option).toHaveAttribute('aria-pressed', 'true'));
  });

  it('zeigt eine verständliche Fehlermeldung bei nicht unterstützter GAEB-Version', async () => {
    render(<App />);
    await loadFixture('unsupported-version.x83');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/wird nicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
  });
});
