// Eigenschaften-Panel (Issue #41, WP-41-2): Klassifizierungs-Badges dürfen keine
// Klickbarkeit vortäuschen, und die Legende „** = wichtig" ohne Bezug ist weg.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PositionDetails } from '../../src/components/common/PositionDetails';
import { Chip } from '../../src/components/ui/Chip';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import type { LVNode, PositionSummary } from '../../src/types/lvNode';

const position: PositionSummary = {
  oz: '01.0010',
  shortText: 'Wand aus Beton',
  longText: 'Tragende Wand aus Beton C25/30.',
  unit: 'm3',
  quantity: 12,
  unitPrice: null,
  positionType: 'NORMAL',
  attributes: { positionsart: 'bauteil', expo: ['XC1'] },
};

const node: LVNode = {
  id: 'position:01.0010',
  kind: 'position',
  code: '01.0010',
  label: position.shortText,
  positionCount: 1,
  totalPrice: 0,
  children: [],
  position,
};

describe('Chip', () => {
  it('ist normalerweise eine Schaltfläche', () => {
    render(<Chip onClick={() => {}}>Filter</Chip>);
    expect(screen.getByRole('button', { name: 'Filter' })).toHaveStyle({ cursor: 'pointer' });
  });

  it('ist als static reine Anzeige ohne Hand-Cursor', () => {
    render(<Chip static>Bauteil</Chip>);
    const chip = screen.getByText('Bauteil');
    expect(chip.tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
    expect(chip).toHaveStyle({ cursor: 'default' });
  });
});

describe('PositionDetails', () => {
  function renderPanel() {
    return render(
      <ViewerProvider>
        <PositionDetails node={node} position={position} />
      </ViewerProvider>,
    );
  }

  it('zeigt die Klassifizierungs-Badges nicht als Schaltflächen', () => {
    renderPanel();
    expect(screen.getByText('Bauteil').tagName).toBe('SPAN');
    // „XC1" steht zweimal: als Badge oben und als Feld in der Klassifizierung.
    for (const element of screen.getAllByText('XC1')) expect(element.closest('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bauteil' })).toBeNull();
  });

  it('zeigt keine Legende „** = wichtig" mehr', () => {
    renderPanel();
    expect(screen.getByText('Langtext')).toBeInTheDocument();
    expect(screen.queryByText(/wichtig/)).toBeNull();
  });
});
