// Positionstabelle (Issue #41, WP-41-3): Standardreihenfolge der Spalten,
// Popover „Spalten" zum Ein-/Ausblenden und Verschieben, Zieh-Griffe je Spalte.

import { useEffect } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PositionsTable } from '../../src/components/table/PositionsTable';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { LVNode, PositionSummary } from '../../src/types/lvNode';
import { TEST_HASHES } from '../support/hashes';

function position(oz: string): PositionSummary {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: '',
    unit: 'm3',
    quantity: 5,
    unitPrice: null,
    positionType: 'NORMAL',
    hashes: TEST_HASHES,
    attributes: { positionsart: 'bauteil' },
  };
}

function positionNode(oz: string): LVNode {
  const summary = position(oz);
  return {
    id: `position:${oz}`,
    kind: 'position',
    code: oz,
    ownCode: oz.slice(oz.lastIndexOf('.') + 1),
    label: summary.shortText,
    positionCount: 1,
    totalPrice: 0,
    children: [],
    position: summary,
  };
}

const section: LVNode = {
  id: 'section:01',
  kind: 'section',
  code: '01',
  ownCode: '01',
  label: 'Erdarbeiten',
  positionCount: 2,
  totalPrice: 0,
  children: [positionNode('01.0010'), positionNode('01.0020')],
  position: null,
};

function headerLabels(): string[] {
  return screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.replace(/[↑↓]/g, '').trim() ?? '');
}

/** Legt Notizen an, wie die Positionskarte es tut. */
function Notizen() {
  const dispatch = useViewerDispatch();
  useEffect(() => {
    dispatch({ type: 'setImportant', id: 'position:01.0010', on: true, at: 1 });
    dispatch({ type: 'addComment', id: 'position:01.0010', text: 'Boden prüfen', at: 1 });
  }, [dispatch]);
  return null;
}

function renderTable() {
  return render(
    <ViewerProvider>
      <PositionsTable root={section} />
    </ViewerProvider>,
  );
}

/** Echter Mausklick: erst mousedown (Popover-Wächter), dann click. */
function click(element: HTMLElement): void {
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

describe('PositionsTable · Spalten', () => {
  it('zeigt OZ, Bezeichnung, Einheit, Menge und EP zuerst', () => {
    renderTable();
    expect(headerLabels()).toEqual([
      'OZ',
      'Bezeichnung',
      'Einheit',
      'Menge',
      'EP €',
      'Fortschritt',
      '!',
      'Kommentar',
      'Positionsart',
      'Druckfestigkeit',
    ]);
  });

  it('blendet eine Spalte über das Popover aus und wieder ein', () => {
    renderTable();
    click(screen.getByRole('button', { name: /Spalten/ }));
    const list = screen.getByRole('list', { name: 'Spalten' });
    const einheit = within(list).getByRole('checkbox', { name: 'Einheit' });
    expect(einheit).toHaveAttribute('aria-checked', 'true');

    click(einheit);
    expect(headerLabels()).not.toContain('Einheit');
    expect(einheit).toHaveAttribute('aria-checked', 'false');

    click(einheit);
    expect(headerLabels()).toContain('Einheit');
  });

  it('lässt jede Spalte ausblenden, auch OZ und Bezeichnung', () => {
    renderTable();
    click(screen.getByRole('button', { name: /Spalten/ }));
    const list = screen.getByRole('list', { name: 'Spalten' });
    for (const checkbox of within(list).getAllByRole('checkbox')) click(checkbox);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(screen.getByText('Alle Spalten ausgeblendet.')).toBeTruthy();

    click(within(list).getByRole('checkbox', { name: 'OZ' }));
    expect(headerLabels()).toEqual(['OZ']);
  });

  it('zeigt Markierung und Kommentar der eigenen Notizen', () => {
    render(
      <ViewerProvider>
        <Notizen />
        <PositionsTable root={section} />
      </ViewerProvider>,
    );
    const zeile = screen.getByRole('row', { name: /01\.0010/ });
    expect(within(zeile).getByRole('button', { name: 'Wichtig 01.0010' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(zeile).getByText('Boden prüfen')).toBeTruthy();
    const andere = screen.getByRole('row', { name: /01\.0020/ });
    expect(within(andere).getByRole('button', { name: 'Wichtig 01.0020' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('verschiebt eine Spalte und setzt alles zurück', () => {
    renderTable();
    click(screen.getByRole('button', { name: /Spalten/ }));
    click(screen.getByRole('button', { name: 'Kommentar nach oben' }));
    expect(headerLabels().slice(5, 8)).toEqual(['Fortschritt', 'Kommentar', '!']);

    click(screen.getByRole('button', { name: 'zurücksetzen' }));
    expect(headerLabels().slice(5, 8)).toEqual(['Fortschritt', '!', 'Kommentar']);
  });

  it('hat je Spaltenkopf einen Zieh-Griff', () => {
    renderTable();
    expect(
      screen.getByRole('separator', { name: 'Breite der Spalte Einheit ändern' }),
    ).toBeTruthy();
  });
});

function headerFlex(label: string): string {
  return screen.getByRole('columnheader', { name: new RegExp(`^${label}`) }).style.flex;
}

function grip(label: string): HTMLElement {
  return screen.getByRole('separator', { name: `Breite der Spalte ${label} ändern` });
}

describe('PositionsTable · Spaltenbreite (Review zu PR #43)', () => {
  it('ändert die Breite per Ziehen und bietet danach „zurücksetzen" an', () => {
    renderTable();
    expect(headerFlex('Einheit')).toBe('0 0 70px');

    fireEvent.mouseDown(grip('Einheit'), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 130 });
    fireEvent.mouseUp(window, { clientX: 130 });
    expect(headerFlex('Einheit')).toBe('0 0 100px');

    click(screen.getByRole('button', { name: /Spalten/ }));
    click(screen.getByRole('button', { name: 'zurücksetzen' }));
    expect(headerFlex('Einheit')).toBe('0 0 70px');
  });

  it('wirkt auch an der letzten Spalte', () => {
    renderTable();
    fireEvent.mouseDown(grip('Druckfestigkeit'), { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 40 });
    fireEvent.mouseUp(window, { clientX: 40 });
    expect(headerFlex('Druckfestigkeit')).toBe('0 0 170px');
  });

  it('passt die Breite per Doppelklick an den Inhalt an', () => {
    renderTable();
    // jsdom misst keine Textbreite (scrollWidth 0) — es bleibt die Mindestbreite.
    fireEvent.doubleClick(grip('Bezeichnung'));
    expect(headerFlex('Bezeichnung')).toBe('0 0 48px');
  });

  it('reserviert die Summe der Spaltenbreiten, damit waagerecht gescrollt wird', () => {
    renderTable();
    const total = 110 + 260 + 70 + 90 + 90 + 130 + 44 + 240 + 120 + 130;
    const header = screen.getAllByRole('row')[0];
    expect(header.style.minWidth).toBe(`${total}px`);
  });
});

/** Zwei Abschnitte mit Unterabschnitt — für Kopfzeilen und Zuklappen. */
function group(code: string, label: string, children: LVNode[]): LVNode {
  return {
    id: `section:${code}`,
    kind: 'section',
    code,
    ownCode: code,
    label,
    positionCount: children.length,
    totalPrice: 0,
    children,
    position: null,
  };
}

const lv = group('', 'LV', [
  group('01', 'Erdarbeiten', [
    group('01.01', 'Aushub', [positionNode('01.01.0010'), positionNode('01.01.0020')]),
  ]),
  group('02', 'Beton', [positionNode('02.0010')]),
]);

function renderLv() {
  return render(
    <ViewerProvider>
      <PositionsTable root={lv} />
    </ViewerProvider>,
  );
}

const ozCells = (): string[] =>
  screen
    .queryAllByRole('row')
    .flatMap((row) => (row.getAttribute('data-row-key') === null ? [] : [row]))
    .map((row) => within(row).getAllByRole('gridcell')[0]!.textContent ?? '');

/** Wählt eine Position aus, wie ein Klick im Graphen. */
function Auswahl({ id }: { id: string | null }) {
  const dispatch = useViewerDispatch();
  useEffect(() => {
    if (id !== null) dispatch({ type: 'selectPosition', nodeId: null, positionId: id });
  }, [dispatch, id]);
  return null;
}

describe('PositionsTable · Arbeitsliste', () => {
  it('setzt den Fortschritt per Klick in der Zelle', () => {
    renderTable();
    click(screen.getByRole('button', { name: 'Fortschritt 01.0010' }));
    click(screen.getByRole('menuitemradio', { name: 'In Bearbeitung' }));
    expect(screen.getByRole('button', { name: 'Fortschritt 01.0010' })).toHaveTextContent(
      'In Bearbeitung',
    );
    expect(screen.queryByRole('menu', { name: 'Fortschritt' })).toBeNull();
  });

  it('schaltet „Wichtig" per Klick, ohne die Zeile zu wählen', () => {
    renderTable();
    const knopf = screen.getByRole('button', { name: 'Wichtig 01.0020' });
    click(knopf);
    expect(knopf).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('row', { name: /01\.0020/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('trägt Kommentare über die Spalte ein, der neueste steht vorn', () => {
    renderTable();
    for (const text of ['Menge prüfen', 'Nachtrag?']) {
      click(screen.getByRole('button', { name: 'Kommentar 01.0010' }));
      const feld = screen.getByRole('textbox', { name: 'Neuer Kommentar' });
      fireEvent.change(feld, { target: { value: text } });
      fireEvent.keyDown(feld, { key: 'Enter' });
    }
    const zelle = screen.getByRole('button', { name: 'Kommentar 01.0010' });
    expect(zelle).toHaveTextContent('Nachtrag?');
    expect(zelle).toHaveTextContent('+1');

    click(zelle);
    const verlauf = screen.getByRole('list', { name: 'Kommentare, der neueste zuerst' });
    expect(
      within(verlauf)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('p')?.textContent),
    ).toEqual(['Nachtrag?', 'Menge prüfen']);
  });

  it('übernimmt den Fortschritt per Ziehen am Griff in die Zeilen darunter', () => {
    const { container } = renderLv();
    click(screen.getByRole('button', { name: 'Fortschritt 01.01.0010' }));
    click(screen.getByRole('menuitemradio', { name: 'Erledigt' }));

    const ziel = container.querySelector<HTMLElement>('[data-row-key="position:02.0010"]')!;
    // jsdom berechnet kein Layout: die Zeile unter dem Zeiger kommt vom Test.
    const original = document.elementFromPoint;
    document.elementFromPoint = () => ziel;
    try {
      const quelle = container.querySelector<HTMLElement>(
        '[data-row-key="position:01.01.0010"] [data-cell="progress"] .fill-handle',
      )!;
      fireEvent.pointerDown(quelle, { button: 0, clientY: 10 });
      fireEvent.pointerMove(window, { clientY: 80 });
      fireEvent.pointerUp(window);
    } finally {
      document.elementFromPoint = original;
    }
    for (const oz of ['01.01.0010', '01.01.0020', '02.0010']) {
      expect(screen.getByRole('button', { name: `Fortschritt ${oz}` })).toHaveTextContent(
        'Erledigt',
      );
    }
  });

  it('zeigt jede Abschnittsebene als eigene Kopfzeile mit Anzahl', () => {
    renderLv();
    const kopf = screen.getByRole('button', { name: /§ 01 · Erdarbeiten/ });
    expect(kopf).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /§ 01\.01 · Aushub/ })).toBeTruthy();
    expect(kopf.closest('[role="row"]')).toHaveTextContent('2 Pos.');
  });

  it('klappt einen Abschnitt per Klick zu und alle wieder auf', () => {
    renderLv();
    expect(ozCells()).toEqual(['01.01.0010', '01.01.0020', '02.0010']);
    click(screen.getByRole('button', { name: /§ 01 · Erdarbeiten/ }));
    expect(ozCells()).toEqual(['02.0010']);
    // Der Unterabschnitt verschwindet mit, der Kopf des zugeklappten bleibt.
    expect(screen.queryByRole('button', { name: /Aushub/ })).toBeNull();
    expect(screen.getByRole('button', { name: /§ 01 · Erdarbeiten/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    click(screen.getByRole('button', { name: 'Alle aufklappen' }));
    expect(ozCells()).toHaveLength(3);
    click(screen.getByRole('button', { name: 'Alle zuklappen' }));
    expect(ozCells()).toEqual([]);
  });

  it('klappt den Abschnitt einer neuen Auswahl auf', () => {
    const { rerender } = render(
      <ViewerProvider>
        <Auswahl id={null} />
        <PositionsTable root={lv} />
      </ViewerProvider>,
    );
    click(screen.getByRole('button', { name: /§ 01 · Erdarbeiten/ }));
    expect(ozCells()).toEqual(['02.0010']);
    rerender(
      <ViewerProvider>
        <Auswahl id="position:01.01.0020" />
        <PositionsTable root={lv} />
      </ViewerProvider>,
    );
    expect(ozCells()).toEqual(['01.01.0010', '01.01.0020', '02.0010']);
  });

  it('zeigt Ebenen, die alle Zeilen teilen, nicht als eigene Kopfzeile', () => {
    render(
      <ViewerProvider>
        <PositionsTable root={group('', 'LV', [lv.children[0]!])} />
      </ViewerProvider>,
    );
    // Alle Zeilen liegen in „01 · Erdarbeiten": nur der direkte Abschnitt bleibt.
    expect(screen.queryByRole('button', { name: /§ 01 · Erdarbeiten/ })).toBeNull();
    expect(screen.getByRole('button', { name: /§ 01\.01 · Aushub/ })).toBeTruthy();
  });
});
