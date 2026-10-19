// Entscheidung 0058: die Tabelle folgt dem Schalter „Nicht-Treffer" — dimmen
// zeigt alle Zeilen, Nicht-Treffer blass; ausblenden zeigt nur Treffer.

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PositionsTable } from '../../src/components/table/PositionsTable';
import { useViewerDispatch, type HideMode } from '../../src/state/viewer';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import type { LVNode } from '../../src/types/lvNode';
import { TEST_HASHES } from '../support/hashes';

function positionNode(oz: string, shortText: string): LVNode {
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
      longText: '',
      unit: 'm3',
      quantity: 5,
      unitPrice: null,
      positionType: 'NORMAL',
      hashes: TEST_HASHES,
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
  children: [positionNode('01.0010', 'Ortbeton Wand'), positionNode('01.0020', 'Mauerwerk')],
  position: null,
};

function Setup({ mode, children }: { mode: HideMode; children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'hideMode', value: mode });
          dispatch({ type: 'search', value: 'Ortbeton' });
        }}
      >
        los
      </button>
      {children}
    </>
  );
}

function renderMode(mode: HideMode): void {
  render(
    <ViewerProvider>
      <Setup mode={mode}>
        <PositionsTable root={section} />
      </Setup>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'los' }));
}

function row(text: string): HTMLElement | null {
  return screen.queryByText(text)?.closest('[role="row"]') ?? null;
}

describe('PositionsTable · Nicht-Treffer', () => {
  it('zeigt beim Dimmen alle Zeilen, Nicht-Treffer blass', () => {
    renderMode('dim');
    expect(row('Mauerwerk')).toHaveStyle({ opacity: '0.4' });
    expect(row('Wand')?.style.opacity).toBe('');
  });

  it('zeigt beim Ausblenden nur Treffer', () => {
    renderMode('hide');
    expect(row('Mauerwerk')).toBeNull();
  });
});
