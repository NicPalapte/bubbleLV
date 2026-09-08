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
 * Ansichtsmodus über den Schalter in der Kopfleiste wechseln (Issue #30) —
 * Baum und Tabelle stehen nur im Modus "Tabelle", der Graph nur im Modus
 * "Graph"; anders als vorher wechselt keine Auswahl mehr automatisch mit.
 */
function switchToView(mode: 'Graph' | 'Tabelle'): void {
  fireEvent.click(screen.getByRole('radio', { name: mode }));
}

describe('Viewer', () => {
  it('zeigt vor dem Import die Datei-Ablage und keine Fachdaten', () => {
    render(<App />);
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
    expect(screen.getAllByText('Kein LV geladen').length).toBeGreaterThan(0);
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

  it('startet nach dem Import im Graphen', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    expect(screen.getByRole('radio', { name: 'Graph' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Knoten gezeichnet/)).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
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

    // Drei Ebenen tief — der Graph-Knopf muss trotzdem in einem Schritt zurück.
    fireEvent.click(screen.getByRole('button', { name: /Graph/ }));
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
    expect(screen.getByText('Baustelleneinrichtung für sämtliche', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Positionen' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Graph' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Karte schließen' })).not.toBeInTheDocument(),
    );
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
