// Positionstabelle (Issue #41, WP-41-3): Standardreihenfolge der Spalten,
// Popover „Spalten" zum Ein-/Ausblenden und Verschieben, Zieh-Griffe je Spalte.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PositionsTable } from '../../src/components/table/PositionsTable';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import type { LVNode, PositionSummary } from '../../src/types/lvNode';

function position(oz: string): PositionSummary {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: '',
    unit: 'm3',
    quantity: 5,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: { positionsart: 'bauteil' },
  };
}

function positionNode(oz: string): LVNode {
  const summary = position(oz);
  return {
    id: `position:${oz}`,
    kind: 'position',
    code: oz,
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
      'Positionsart',
      'Bauteiltyp',
      'Druckfestigkeit',
      'Status',
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

  it('lässt OZ und Bezeichnung nicht ausblenden', () => {
    renderTable();
    click(screen.getByRole('button', { name: /Spalten/ }));
    const list = screen.getByRole('list', { name: 'Spalten' });
    expect(within(list).getByRole('checkbox', { name: 'OZ' })).toBeDisabled();
    expect(within(list).getByRole('checkbox', { name: 'Bezeichnung' })).toBeDisabled();
  });

  it('verschiebt eine Spalte und setzt alles zurück', () => {
    renderTable();
    click(screen.getByRole('button', { name: /Spalten/ }));
    click(screen.getByRole('button', { name: 'Status nach oben' }));
    expect(headerLabels().slice(-2)).toEqual(['Status', 'Druckfestigkeit']);

    click(screen.getByRole('button', { name: 'zurücksetzen' }));
    expect(headerLabels().slice(-2)).toEqual(['Druckfestigkeit', 'Status']);
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
    fireEvent.mouseDown(grip('Status'), { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 40 });
    fireEvent.mouseUp(window, { clientX: 40 });
    expect(headerFlex('Status')).toBe('0 0 130px');
  });

  it('passt die Breite per Doppelklick an den Inhalt an', () => {
    renderTable();
    // jsdom misst keine Textbreite (scrollWidth 0) — es bleibt die Mindestbreite.
    fireEvent.doubleClick(grip('Bezeichnung'));
    expect(headerFlex('Bezeichnung')).toBe('0 0 48px');
  });

  it('reserviert die Summe der Spaltenbreiten, damit waagerecht gescrollt wird', () => {
    renderTable();
    const total = 110 + 260 + 70 + 90 + 90 + 120 + 110 + 130 + 90;
    const header = screen.getAllByRole('row')[0];
    expect(header.style.minWidth).toBe(`${total}px`);
  });
});
