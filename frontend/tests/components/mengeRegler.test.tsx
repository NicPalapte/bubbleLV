// Mengenfilter als Regler direkt im Filterfenster — ohne Knopf davor.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterPanel } from '../../src/components/filter/FilterPanel';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
const LV = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Laden() {
  const dispatch = useViewerDispatch();
  return (
    <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
      laden
    </button>
  );
}

describe('Mengenfilter', () => {
  it('steht als Regler im Fenster und setzt sich zurück', () => {
    render(
      <ViewerProvider>
        <Laden />
        <FilterPanel />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));

    const menge = screen.getByRole('region', { name: 'Menge' });
    const minimum = within(menge).getByRole('slider', { name: 'Menge Minimum' });
    expect(within(menge).queryByRole('button', { name: 'zurücksetzen' })).toBeNull();

    fireEvent.change(minimum, { target: { value: '100' } });
    expect(minimum).toHaveValue('100');
    fireEvent.click(within(menge).getByRole('button', { name: 'zurücksetzen' }));
    expect(within(menge).queryByRole('button', { name: 'zurücksetzen' })).toBeNull();
    expect(minimum).toHaveValue(minimum.getAttribute('min'));
  });
});
