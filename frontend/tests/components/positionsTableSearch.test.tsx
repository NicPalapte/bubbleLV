// Issue #100: Suchtreffer sind in der Tabelle sichtbar markiert — auch dann,
// wenn die Suche nur den Langtext trifft.

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PositionsTable } from '../../src/components/table/PositionsTable';
import { useViewerDispatch } from '../../src/state/viewer';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import type { LVNode } from '../../src/types/lvNode';

function positionNode(oz: string, shortText: string, longText: string): LVNode {
  return {
    id: `position:${oz}`,
    kind: 'position',
    code: oz,
    ownCode: oz.slice(oz.lastIndexOf('.') + 1),
    label: shortText,
    positionCount: 1,
    totalPrice: 0,
    children: [],
    position: {
      oz,
      shortText,
      longText,
      unit: 'm3',
      quantity: 5,
      unitPrice: null,
      positionType: 'NORMAL',
      attributes: {},
    },
  };
}

const section: LVNode = {
  id: 'section:01',
  kind: 'section',
  code: '01',
  ownCode: '01',
  label: 'Rohbau',
  positionCount: 2,
  totalPrice: 0,
  children: [
    positionNode('01.0010', 'Ortbeton Wand', ''),
    positionNode('01.0020', 'Schalung Wand', 'Schalung für Sichtbeton SB2, glatt.'),
  ],
  position: null,
};

function Search({ value, children }: { value: string; children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'search', value })}>
        suchen
      </button>
      {children}
    </>
  );
}

function renderWithSearch(value: string) {
  const result = render(
    <ViewerProvider>
      <Search value={value}>
        <PositionsTable root={section} />
      </Search>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'suchen' }));
  return result;
}

function marks(container: HTMLElement): string[] {
  return [...container.querySelectorAll('mark')].map((mark) => mark.textContent ?? '');
}

describe('PositionsTable · Suchtreffer', () => {
  it('markiert den Treffer in der Bezeichnung', () => {
    const { container } = renderWithSearch('ortbeton');
    expect(marks(container)).toEqual(['Ortbeton']);
  });

  it('zeigt bei einem reinen Langtext-Treffer einen markierten Ausschnitt', () => {
    const { container } = renderWithSearch('beton');
    expect(marks(container)).toEqual(['beton', 'beton']);
    expect(screen.getByTitle('Treffer im Langtext').textContent).toBe(
      'Schalung für Sichtbeton SB2, glatt.',
    );
  });

  it('markiert die OZ', () => {
    const { container } = renderWithSearch('0020');
    expect(marks(container)).toEqual(['0020']);
  });

  it('markiert nichts ohne Suche', () => {
    const { container } = renderWithSearch('');
    expect(marks(container)).toEqual([]);
  });
});
