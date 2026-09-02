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
    expect(screen.getByText(/Übersicht ·/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Positionsart/ })).toBeInTheDocument();
  });

  it('drillt aus dem Baum in die Positionstabelle', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

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
  });

  it('klappt Baum und Graph gemeinsam auf (Issue #18)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    const tree = screen.getByRole('tree');
    // Startzustand: Projekt und Lose offen — in beiden Ansichten dieselbe Tiefe.
    const section = await within(tree).findByTitle('Bauhauptgewerke');
    expect(section).toHaveAttribute('aria-expanded', 'false');

    const before = nodeCount();
    fireEvent.click(within(section).getByText('▸'));

    // Der Baum zeigt den Abschnitt offen …
    await waitFor(() =>
      expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true'),
    );
    // … und der Graph legt dieselben Knoten an.
    expect(nodeCount()).toBeGreaterThan(before);
  });

  it('klappt den Baum mit der Projekt-Bubble zu (Issue #18)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    const tree = screen.getByRole('tree');
    expect(within(tree).getAllByRole('treeitem').length).toBeGreaterThan(0);

    // Klick auf die Projekt-Bubble im Graphen — der Baum folgt.
    fireEvent.click(screen.getByText('PROJEKT'));
    await waitFor(() => expect(within(tree).queryAllByRole('treeitem')).toHaveLength(0));

    // Die Projektzeile ist der Weg zurück.
    fireEvent.click(screen.getByText(/Übersicht ·/));
    await waitFor(() => expect(within(tree).getAllByRole('treeitem').length).toBeGreaterThan(0));
  });

  it('hält den Graphen über den Abstecher in die Tabelle (Issue #19)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    const tree = screen.getByRole('tree');
    const section = await within(tree).findByTitle('Bauhauptgewerke');
    fireEvent.click(within(section).getByText('▸'));
    await waitFor(() =>
      expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true'),
    );
    const beforeTable = nodeCount();

    fireEvent.click(within(tree).getByTitle('Bauhauptgewerke'));
    await screen.findByRole('table', { name: 'Positionen' });
    // Der Graph bleibt montiert — nur so überleben Zoom und Ausschnitt.
    expect(screen.getByText(/Knoten gezeichnet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Graph/ }));
    await waitFor(() =>
      expect(screen.queryByRole('table', { name: 'Positionen' })).not.toBeInTheDocument(),
    );
    // Derselbe Graph wie vorher — kein Zurück auf den Startzustand.
    expect(nodeCount()).toBe(beforeTable);
    expect(within(tree).getByTitle('Bauhauptgewerke')).toHaveAttribute('aria-expanded', 'true');
  });

  it('schließt mit Escape zuerst das Popover und erst dann die Tabelle', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    const tree = screen.getByRole('tree');
    fireEvent.click(within(tree).getAllByRole('treeitem')[0]);
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

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('table', { name: 'Positionen' })).not.toBeInTheDocument(),
    );
  });

  it('bedient Filter und Baum über echte Schaltflächen (Tastatur)', async () => {
    render(<App />);
    await loadFixture('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());

    // Umschaltgruppe Größenmodus: benannte Radiogruppe statt klickbarer <span>.
    const sizeModes = screen.getByRole('radiogroup', { name: 'Größe der Bubbles' });
    expect(within(sizeModes).getAllByRole('radio').length).toBe(3);

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

  it('zeigt eine verständliche Fehlermeldung bei nicht unterstützter GAEB-Version', async () => {
    render(<App />);
    await loadFixture('unsupported-version.x83');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/wird nicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText('GAEB-Datei hierher ziehen')).toBeInTheDocument();
  });
});
