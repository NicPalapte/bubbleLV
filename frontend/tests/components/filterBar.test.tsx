// Filterleiste unter der Kopfleiste (Issue #154): ein Chip je Gruppe mit Liste,
// der Mengenregler und „Status"; Escape schließt erst die Liste, dann die Leiste.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterBar } from '../../src/components/filter/FilterBar';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const LV = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Steuerung() {
  const dispatch = useViewerDispatch();
  const { filter } = useViewer();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'loaded', lv: LV });
          dispatch({ type: 'filterBar', open: true });
        }}
      >
        laden
      </button>
      <output aria-label="eigene">{filter.notes.progress ?? 'kein'}</output>
    </>
  );
}

function setup(): HTMLElement {
  render(
    <ViewerProvider>
      <Steuerung />
      <FilterBar />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  return screen.getByRole('region', { name: 'Filterleiste' });
}

describe('Filterleiste', () => {
  it('hat den Mengenregler hinter dem Chip „Menge" und setzt ihn zurück', () => {
    const leiste = setup();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Menge' }));
    const menge = within(leiste).getByRole('region', { name: 'Menge' });
    const minimum = within(menge).getByRole('slider', { name: 'Menge Minimum' });
    expect(within(menge).queryByRole('button', { name: 'zurücksetzen' })).toBeNull();

    fireEvent.change(minimum, { target: { value: '100' } });
    expect(minimum).toHaveValue('100');
    expect(within(leiste).getByRole('button', { name: 'Menge, 1 gewählt' })).toBeInTheDocument();
    fireEvent.click(within(menge).getByRole('button', { name: 'zurücksetzen' }));
    expect(minimum).toHaveValue(minimum.getAttribute('min'));
  });

  it('führt die eigenen Marker unter „Status" und setzt alle zurück', () => {
    const leiste = setup();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Status' }));
    const eigene = within(within(leiste).getByRole('group', { name: 'Status' }));
    expect(
      eigene.getAllByRole('checkbox').map((kasten) => kasten.closest('label')?.textContent),
    ).toEqual(['Offen28', 'In Bearbeitung0', 'Erledigt0', 'Wichtig0', 'Mit Kommentar0']);
    fireEvent.click(eigene.getByRole('checkbox', { name: /^Offen/ }));
    expect(screen.getByRole('status', { name: 'eigene' })).toHaveTextContent('offen');
    fireEvent.click(within(leiste).getByRole('button', { name: 'alle zurücksetzen' }));
    expect(screen.getByRole('status', { name: 'eigene' })).toHaveTextContent('kein');
  });

  it('schließt mit Escape erst die Liste, dann die Leiste', () => {
    const leiste = setup();
    const chip = within(leiste).getByRole('button', { name: 'Status' });
    fireEvent.click(chip);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(within(leiste).queryByRole('group', { name: 'Status' })).toBeNull();
    chip.focus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Filterleiste' })).toBeNull();
  });
});

describe('Filterleiste: Material', () => {
  it('ordnet die Merkmale unter ihr Material und klappt sie auf', () => {
    const leiste = setup();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Material' }));
    const gruppe = within(within(leiste).getByRole('group', { name: 'Material' }));
    // Druckfestigkeit steht nicht mehr als eigener Chip in der Leiste.
    expect(within(leiste).queryByRole('button', { name: 'Druckfestigkeit' })).toBeNull();
    expect(gruppe.queryByText('Druckfestigkeit')).toBeNull();

    fireEvent.click(gruppe.getByRole('button', { name: 'Merkmale Beton' }));
    expect(gruppe.getByText('Druckfestigkeit')).toBeInTheDocument();
    const [wert] = gruppe
      .getAllByRole('checkbox')
      .filter((box) => /^C\d/.test(box.closest('label')?.textContent ?? ''));
    fireEvent.click(wert);
    expect(within(leiste).getByRole('button', { name: 'Material, 1 gewählt' })).toBeInTheDocument();
    // Mit aktivem Merkmal bleibt das Material aufgeklappt.
    expect(gruppe.getByRole('button', { name: 'Merkmale Beton' })).toBeDisabled();
  });
});
