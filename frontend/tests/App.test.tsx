import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

/** Knotenzahl aus der Graph-Steuerung — zeigt, was das Layout angelegt hat. */
function nodeCount(): number {
  const label = screen.getByText(/Knoten gezeichnet/);
  const text = label.parentElement?.textContent ?? '';
  return Number(text.replace(/[^0-9/]/g, '').split('/')[1] ?? '0');
}

function fixtureFile(name: string): File {
  return new File([readFileSync(resolve(FIXTURE_DIR, name))], name);
}

async function loadFixture(name: string): Promise<void> {
  const input = screen.getByLabelText('GAEB-Datei auswählen');
  fireEvent.change(input, { target: { files: [fixtureFile(name)] } });
}

/**
 * Ansicht über den Schalter in der Kopfleiste wechseln (Issue #30, WP-L) —
 * Baum und Tabelle stehen nur in der Ansicht "Tabelle", der Graph nur in
 * "Graph"; ein Wechsel ändert weder Filter noch Auswahl. Nach dem Import steht
 * der "Überblick" vorn, deshalb schaltet fast jeder Test zuerst um.
 */
function switchToView(mode: 'Überblick' | 'Graph' | 'Tabelle' | 'Prüfung'): void {
  fireEvent.click(screen.getByRole('radio', { name: mode }));
}

describe('Viewer', () => {
  it('zeigt vor dem Import die Datei-Ablage und keine Fachdaten', () => {
    render(<App />);
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
    expect(screen.getAllByText('Kein LV geladen').length).toBeGreaterThan(0);
  });

  it('bietet zwei Demo-LVs zum Ausprobieren an — mit und ohne Preise', () => {
    render(<App />);
    // Zweiter Weg neben der eigenen Datei — das Laden selbst deckt
    // tests/pipeline/loadDemoLv.test.ts ab.
    expect(screen.getByRole('button', { name: 'Demo mit Preisen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demo ohne Preise' })).toBeInTheDocument();
    expect(screen.getByText(/Keine eigene Datei zur Hand/)).toBeInTheDocument();
  });

  it('lädt eine echte GAEB-Datei und zeigt Baum und Filter', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');

    await waitFor(() =>
      expect(screen.queryByText('GAEB-Datei hierher ziehen')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('FILTER')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Positionsart/ })).toBeInTheDocument();

    // Der Baum steht nur in der Tabellenansicht (Issue #30).
    switchToView('Tabelle');
    expect(screen.getByText(/Übersicht ·/)).toBeInTheDocument();
  });

  it('startet nach dem Import im Überblick', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Der Überblick ordnet das LV ein, bevor man in Graph oder Tabelle geht
    // (WP-L). Graph und Baum stehen erst nach dem Umschalten da.
    expect(screen.getByRole('radio', { name: 'Überblick' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('main', { name: 'Überblick' })).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.queryByText(/Knoten gezeichnet/)).not.toBeInTheDocument();

    switchToView('Graph');
    expect(screen.getByText(/Knoten gezeichnet/)).toBeInTheDocument();
  });

  // Abnahme von WP-L: ein Ansichtswechsel ändert weder Filter noch Auswahl,
  // und jede Ansicht steht danach wieder so da, wie man sie verlassen hat.
  it('behält Filter, Sortierung und Scrollposition über den Ansichtswechsel', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    // Die Suche ist entprellt — der Überblick zeigt an, sobald sie greift.
    await waitFor(() => expect(screen.getByText(/im aktuellen Filter/)).toBeInTheDocument());

    // In der Prüfung ein Stück scrollen …
    switchToView('Prüfung');
    const pruefung = screen.getByRole('main', { name: 'Prüfung' }).firstElementChild as HTMLElement;
    fireEvent.scroll(pruefung, { target: { scrollTop: 240 } });

    // … in der Tabelle nach Menge sortieren …
    switchToView('Tabelle');
    const table = await screen.findByRole('table', { name: 'Positionen' });
    fireEvent.click(within(table).getByRole('button', { name: /Menge/ }));
    await waitFor(() =>
      expect(within(table).getByRole('columnheader', { name: /Menge/ })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );

    // … und zurück: Suche, Sortierung und Scrollposition stehen unverändert da.
    switchToView('Prüfung');
    expect(
      (screen.getByRole('main', { name: 'Prüfung' }).firstElementChild as HTMLElement).scrollTop,
    ).toBe(240);
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');

    switchToView('Tabelle');
    const again = await screen.findByRole('table', { name: 'Positionen' });
    expect(within(again).getByRole('columnheader', { name: /Menge/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('drillt aus dem Baum in die Positionstabelle', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    // Erstes Los aufklappen, dann den ersten Abschnitt wählen.
    const [lot] = within(screen.getByRole('tree')).getAllByRole('treeitem');
    fireEvent.click(lot);

    const table = await screen.findByRole('table', { name: 'Positionen' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.trim().replace(/\s+[↑↓]$/, ''));
    expect(headers).toContain('Bezeichnung');
    expect(headers).toContain('Positionsart');
    expect(headers).toContain('Bauteiltyp');
    // Erste Position der Beispieldatei ist in der Tabelle sichtbar.
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);
  });

  it('filtert die Tabelle über die Suche', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    const [lot] = within(screen.getByRole('tree')).getAllByRole('treeitem');
    fireEvent.click(lot);
    const table = await screen.findByRole('table', { name: 'Positionen' });
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Suche'), {
      target: { value: 'zzz-kein-treffer-zzz' },
    });
    await waitFor(() =>
      expect(screen.getByText('Keine Positionen entsprechen den Filtern.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('zeigt Filtertreffer des ganzen LV, wenn der Abschnitt keinen hat', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    // Bis in den Abschnitt „Baustelleneinrichtung" navigieren.
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));
    fireEvent.click(await within(tree).findByTitle('Baustelleneinrichtung'));

    const table = await screen.findByRole('table', { name: 'Positionen' });
    expect(within(table).getAllByText('001.001.0010').length).toBeGreaterThan(0);

    // „Kabel" kommt nur in den Elektroarbeiten vor — im gewählten Abschnitt
    // gibt es keinen Treffer, die Tabelle darf trotzdem nicht leer bleiben.
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Kabel' } });

    await waitFor(() => expect(screen.getByText(/LV-weite Treffer/)).toBeInTheDocument());
    expect(within(table).getAllByText('002.001.0010').length).toBeGreaterThan(0);
    expect(within(table).queryByText('001.001.0010')).not.toBeInTheDocument();
  });

  it('gruppiert die Filtertreffer nach Überschriften', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));
    fireEvent.click(await within(tree).findByTitle('Baustelleneinrichtung'));
    await screen.findByRole('table', { name: 'Positionen' });

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });

    // Die Treffer verteilen sich über mehrere Abschnitte und stehen jeweils
    // unter ihrem Überschriftenpfad.
    const table = await screen.findByRole('table', { name: 'Positionen' });
    await waitFor(() =>
      expect(
        within(table).getByText(/Bauhauptgewerke.+§ 001\.004 · Betonarbeiten/),
      ).toBeInTheDocument(),
    );
    expect(
      within(table).getByText(/Bauhauptgewerke.+§ 001\.003 · Maurerarbeiten/),
    ).toBeInTheDocument();
  });

  it('führt aus der Tabelle mit einem Klick zurück in den Graphen', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));
    fireEvent.click(await within(tree).findByTitle('Baustelleneinrichtung'));
    await screen.findByRole('table', { name: 'Positionen' });

    // Drei Ebenen tief — der Umschalter in der Kopfleiste geht trotzdem in
    // einem Schritt zurück (die Tabelle hat keinen eigenen Graph-Knopf mehr).
    switchToView('Graph');
    await waitFor(() =>
      expect(screen.queryByRole('table', { name: 'Positionen' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('radio', { name: 'Graph' })).toHaveAttribute('aria-checked', 'true');
  });

  it('teilt den Aufklapp-Zustand zwischen Baum und Graph (Issue #18)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Startzustand im Graphen.
    switchToView('Graph');
    const before = nodeCount();

    // Im Baum aufklappen — Graph und Baum teilen sich denselben Zustand,
    // auch wenn immer nur einer davon zu sehen ist (Issue #30).
    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    const section = await within(tree).findByTitle('Bauhauptgewerke');
    expect(section).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(within(section).getByText('▸'));
    await waitFor(() =>
      expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true'),
    );

    // … und der Graph legt beim Zurückwechseln dieselben Knoten an.
    switchToView('Graph');
    expect(nodeCount()).toBeGreaterThan(before);
  });

  it('klappt den Baum mit der Projekt-Bubble zu (Issue #18)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Klick auf die Projekt-Bubble im Graphen klappt sie zu …
    switchToView('Graph');
    fireEvent.click(screen.getByText('PROJEKT'));

    // … der Baum zeigt danach keine Zeilen mehr.
    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    await waitFor(() => expect(within(tree).queryAllByRole('treeitem')).toHaveLength(0));

    // Die Projektzeile ist der Weg zurück.
    fireEvent.click(screen.getByText(/Übersicht ·/));
    await waitFor(() => expect(within(tree).getAllByRole('treeitem').length).toBeGreaterThan(0));
  });

  it('hält den Aufklapp-Zustand über den Wechsel zwischen Graph und Tabelle (Issue #19/#30)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    const section = await within(tree).findByTitle('Bauhauptgewerke');
    fireEvent.click(within(section).getByText('▸'));
    await waitFor(() =>
      expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true'),
    );

    switchToView('Graph');
    const beforeGraph = nodeCount();

    // Ansicht wechseln und zurück — der Graph wird dabei neu gemountet
    // (Issue #30: zwei getrennte Modi statt eines Abstechers), zeigt danach
    // aber denselben Aufklapp-Zustand und damit dieselbe Knotenzahl.
    switchToView('Tabelle');
    expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true');
    switchToView('Graph');
    expect(nodeCount()).toBe(beforeGraph);
  });

  it('zeigt eine gewählte Position im Graphen als schwebende Karte statt in der Tabelle (Issue #30)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Position im Baum wählen — dieselbe Auswahl treibt in der Tabellenansicht
    // die Zeile/Eigenschaften und im Graphen die schwebende Karte.
    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));
    fireEvent.click(await within(tree).findByTitle('Baustelleneinrichtung'));
    fireEvent.click(await within(tree).findByText('001.001.0010'));

    switchToView('Graph');

    // Die Karte zeigt die Positionsdetails, die Tabelle bleibt unangetastet.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Karte schließen' })).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Baustelleneinrichtung für sämtliche', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Positionen' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Graph' })).toHaveAttribute('aria-checked', 'true');

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
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Abschnitt (kein Positionsblatt) im Baum wählen — dieselbe Auswahl treibt
    // im Graphen jetzt ebenfalls die schwebende Karte, mit Kennzahlen statt
    // Positionsdetails.
    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));

    switchToView('Graph');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Karte schließen' })).toBeInTheDocument(),
    );
    expect(screen.getByText('Kennzahlen')).toBeInTheDocument();
    expect(screen.getByText('Direkte Positionen')).toBeInTheDocument();
  });

  it('scrollt in der Auswahlkarte, statt den Graphen zu zoomen oder zu ziehen (Issue #47)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));

    switchToView('Graph');
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

  it('zieht die Info-Panels am Knopf unten links auf — eine Größe für alle Ansichten', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));
    // Startbreite gilt schon hier — dasselbe Maß wie später im Graphen.
    expect(screen.getByRole('complementary', { name: 'Eigenschaften' })).toHaveStyle({
      width: '320px',
    });

    switchToView('Graph');
    const closeButton = await screen.findByRole('button', { name: 'Karte schließen' });
    const card = closeButton.closest('[data-graph-overlay]') as HTMLElement;
    expect(card.style.width).toBe('320px');
    expect(card.style.height).toBe('');

    // Die Karte hängt rechts oben: nach links zieht sie breiter, nach unten höher.
    const handle = screen.getByRole('button', { name: 'Info-Panel in der Größe ändern' });
    fireEvent.mouseDown(handle, { clientX: 400, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 260, clientY: 480 });
    expect(card.style.width).toBe('460px');
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

    // Und die Breite gilt anschließend auch im Eigenschaften-Panel der Tabelle.
    switchToView('Tabelle');
    expect(screen.getByRole('complementary', { name: 'Eigenschaften' })).toHaveStyle({
      width: '296px',
    });
  });

  it('merkt sich den Ort der Auswahlkarte über den Ansichtswechsel', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    switchToView('Tabelle');
    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
    fireEvent.click(await within(tree).findByTitle('Bauhauptgewerke'));

    switchToView('Graph');
    const closeButton = await screen.findByRole('button', { name: 'Karte schließen' });
    const card = closeButton.closest('[data-graph-overlay]') as HTMLElement;
    expect(card.style.right).toBe('16px');

    // Karte am Ziehgriff beiseiteschieben.
    fireEvent.mouseDown(screen.getByLabelText('Karte verschieben'), { clientX: 500, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 400, clientY: 350 });
    fireEvent.mouseUp(document);
    expect(card.style.right).toBe('116px');
    expect(card.style.top).toBe('66px');

    // Nach dem Ausflug in die Tabelle steht sie wieder dort, nicht in der Ecke.
    switchToView('Tabelle');
    switchToView('Graph');
    const wieder = (await screen.findByRole('button', { name: 'Karte schließen' })).closest(
      '[data-graph-overlay]',
    ) as HTMLElement;
    expect(wieder.style.right).toBe('116px');
    expect(wieder.style.top).toBe('66px');
  });

  it('schließt mit Escape zuerst das Popover, verlässt danach aber nicht mehr die Tabelle (Issue #30)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');
    await screen.findByRole('table', { name: 'Positionen' });

    // Die Facettenwerte im Popover sind die einzigen Schaltflächen mit
    // aria-pressed — daran hängt die Prüfung, ob das Popover offen ist.
    // Der Filter-Chip, nicht der gleichnamige Spaltenkopf der Tabelle.
    fireEvent.click(screen.getByRole('button', { name: /Positionsart ▾/ }));
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { pressed: false }).length).toBeGreaterThan(0),
    );

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { pressed: false })).toHaveLength(0),
    );
    // Die Tabelle steht noch — Escape hat nur das Popover geschlossen.
    expect(screen.getByRole('table', { name: 'Positionen' })).toBeInTheDocument();

    // Der Ansichtsmodus ist jetzt eine bewusste, dauerhafte Wahl (Issue #30) —
    // ein zweites Escape wechselt nicht mehr zurück in den Graphen.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('table', { name: 'Positionen' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute('aria-checked', 'true');
  });

  it('bedient Filter und Baum über echte Schaltflächen (Tastatur)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Umschaltgruppe Größenmodus: benannte Radiogruppe statt klickbarer <span>
    // — nur im Graphen vorhanden (Issue #30).
    switchToView('Graph');
    const sizeModes = screen.getByRole('radiogroup', { name: 'Größe der Bubbles' });
    expect(within(sizeModes).getAllByRole('radio').length).toBe(3);

    switchToView('Tabelle');

    // Aufklapp-Dreieck im Baum ist eine benannte Schaltfläche.
    const tree = screen.getByRole('tree');
    const section = await within(tree).findByTitle('Bauhauptgewerke');
    const toggle = within(section).getByRole('button', { name: /Bauhauptgewerke aufklappen/ });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true'),
    );

    // Facettenwerte sind Schaltflächen mit Auswahlzustand.
    fireEvent.click(screen.getByRole('button', { name: /Positionsart ▾/ }));
    const [option] = await waitFor(() => {
      const rows = screen.getAllByRole('button', { pressed: false });
      expect(rows.length).toBeGreaterThan(0);
      return rows;
    });
    fireEvent.click(option);
    await waitFor(() => expect(option).toHaveAttribute('aria-pressed', 'true'));
  });

  it('bedient den Baum mit der Tastatur (Issue #28)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    switchToView('Tabelle');

    const tree = screen.getByRole('tree');
    const activeRow = (): HTMLElement | null => {
      const id = tree.getAttribute('aria-activedescendant');
      return id === null ? null : document.getElementById(id);
    };

    // Der Fokus liegt am Baum, die aktive Zeile hängt an aria-activedescendant.
    tree.focus();
    expect(tree).toHaveFocus();
    expect(activeRow()).toBeNull();

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    await waitFor(() => expect(activeRow()).not.toBeNull());
    expect(activeRow()).toHaveAttribute('aria-level', '1');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    await waitFor(() => expect(activeRow()).toHaveAttribute('aria-level', '2'));
    expect(activeRow()).toHaveAttribute('aria-expanded', 'false');
    const section = activeRow();

    // Pfeil rechts klappt auf, Pfeil links wieder zu.
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    await waitFor(() => expect(activeRow()).toHaveAttribute('aria-expanded', 'true'));
    expect(activeRow()).toBe(section);

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    await waitFor(() => expect(activeRow()).toHaveAttribute('aria-level', '3'));

    // Pfeil links steigt aus einer zugeklappten Zeile zum Elternknoten auf.
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    await waitFor(() => expect(activeRow()).toHaveAttribute('aria-level', '2'));

    // Enter wählt wie ein Klick — die Positionstabelle bleibt offen und
    // zeigt jetzt den gewählten Abschnitt.
    fireEvent.keyDown(tree, { key: 'Enter' });
    await screen.findByRole('table', { name: 'Positionen' });
  });

  it('zeigt eine verständliche Fehlermeldung bei nicht unterstützter GAEB-Version', async () => {
    render(<App />);
    await loadFixture('unsupported-version.x83');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/wird nicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
  });
});
