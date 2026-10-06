// Positionsvergleich als Fenster über dem Graphen (Entscheidung 0037): bis zu
// vier Positionen nebeneinander, Abweichungen zur ersten Spalte markiert.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareWindow } from '../../src/components/shell/CompareWindow';
import { GraphDock } from '../../src/components/shell/GraphDock';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

function position(oz: string, quantity: number, longText: string): PositionDraft {
  return {
    oz,
    shortText: `Wand ${oz}`,
    longText,
    unit: 'm2',
    quantity,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
}

const DRAFT: LVDraft = {
  projectName: 'Vergleich',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los 1',
      sections: [
        {
          number: '01.01',
          label: 'Wände',
          sections: [],
          positions: [
            position('01.01.0010', 10, 'Wand aus Beton'),
            position('01.01.0020', 10, 'Wand aus Ziegel'),
            position('01.01.0030', 25, 'Wand aus Beton'),
          ],
        },
      ],
    },
  ],
};

const LV = classifyAndBuild(DRAFT, 'vergleich.x83');
const ids = LV.tree.children[0].children[0].children.map((node) => node.id);

/** Lädt das LV und nimmt die genannten Positionen per Knopf in den Vergleich. */
function Steuerung({ take }: { take: readonly string[] }) {
  const dispatch = useViewerDispatch();
  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'loaded', lv: LV });
        for (const id of take) dispatch({ type: 'toggleCompare', positionId: id });
      }}
    >
      vorbereiten
    </button>
  );
}

function renderWindow(take: readonly string[]) {
  render(
    <ViewerProvider>
      <Steuerung take={take} />
      <CompareWindow />
      <GraphDock />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'vorbereiten' }));
  return screen.queryByRole('region', { name: /Positionsvergleich/ });
}

describe('CompareWindow', () => {
  it('bleibt zu, solange keine Position im Vergleich ist', () => {
    expect(renderWindow([])).toBeNull();
  });

  it('zeigt je Position eine Spalte und markiert Abweichungen zur ersten', () => {
    const fenster = renderWindow([ids[0], ids[1], ids[2]]);
    expect(fenster).not.toBeNull();
    const table = within(fenster as HTMLElement).getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);

    const menge = within(table).getByRole('row', { name: /Menge/ });
    const zellen = within(menge).getAllByRole('cell');
    expect(zellen[1]).not.toHaveAttribute('data-differs');
    expect(zellen[2]).toHaveAttribute('data-differs');

    // „Ziegel" und „Beton" stehen nicht in allen drei Texten.
    expect(within(table).getByText('Ziegel').tagName).toBe('MARK');
  });

  it('zählt nur Merkmale — Abschnitt und Hinweise sind Kontext', () => {
    // 0010 und 0020 unterscheiden sich nur im Langtext, nicht in den Merkmalen.
    const fenster = renderWindow([ids[0], ids[1]]) as HTMLElement;
    expect(within(fenster).queryByText(/Unterschied/)).toHaveTextContent('0 Unterschiede');
    const table = within(fenster).getByRole('table');
    for (const label of [/Abschnitt/, /Hinweise/]) {
      const zellen = within(within(table).getByRole('row', { name: label })).getAllByRole('cell');
      for (const zelle of zellen) expect(zelle).not.toHaveAttribute('data-differs');
    }
  });

  it('nimmt eine Position per ✕ heraus und leert alles mit „leeren"', () => {
    const fenster = renderWindow([ids[0], ids[1]]) as HTMLElement;
    fireEvent.click(
      within(fenster).getByRole('button', { name: '01.01.0020 aus dem Vergleich nehmen' }),
    );
    expect(within(fenster).getAllByRole('columnheader')).toHaveLength(2);

    fireEvent.click(within(fenster).getByRole('button', { name: 'leeren' }));
    expect(screen.queryByRole('region', { name: /Positionsvergleich/ })).toBeNull();
  });

  it('lässt die Positionen beim Schließen im Vergleich — der Dock holt sie zurück', () => {
    const fenster = renderWindow([ids[0], ids[1]]) as HTMLElement;
    fireEvent.click(within(fenster).getByRole('button', { name: 'Vergleich schließen' }));
    expect(screen.queryByRole('region', { name: /Positionsvergleich/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Vergleich 2/ }));
    expect(screen.getByRole('region', { name: /Positionsvergleich/ })).toBeInTheDocument();
  });
});
