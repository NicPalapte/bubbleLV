// Der Vergleich selbst (WP-N) — die Komponente, die Ansicht und Fenster über
// dem Graphen gemeinsam benutzen (WP-R, R3).
//
// Geprüft wird hier die Zuordnung Spalte ↔ Wert. Sie steht und fällt damit,
// dass Kopf, Merkmalszeilen und Langtext über **dieselbe** Liste laufen: läuft
// der Kopf über die übergebenen Knoten und die Werte über die Positionen
// daraus, stehen die Zahlen unter den falschen Kurztexten — lautlos, ohne dass
// etwas kaputt aussieht.

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareBody } from '../../src/components/compare/CompareBody';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import type { LVNode, PositionSummary } from '../../src/types/lvNode';

function position(overrides: Partial<PositionSummary> = {}): PositionSummary {
  return {
    oz: '001.0010',
    shortText: 'Wand herstellen',
    longText: 'Wand aus Beton herstellen',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: { gewerk: 'Betonarbeiten' },
    ...overrides,
  };
}

function positionNode(oz: string, overrides: Partial<PositionSummary> = {}): LVNode {
  return {
    id: `position:${oz}`,
    kind: 'position',
    code: oz,
    ownCode: oz.split('.').at(-1) ?? oz,
    label: null,
    positionCount: 1,
    totalPrice: 0,
    children: [],
    position: position({ oz, ...overrides }),
  };
}

/** Ein Knoten ohne Position — im Vergleich hat er nichts zu suchen. */
const ABSCHNITT: LVNode = {
  id: 'section:001.001',
  kind: 'section',
  code: '001.001',
  ownCode: '001',
  label: 'Abschnitt',
  positionCount: 2,
  totalPrice: 0,
  children: [],
  position: null,
};

function renderBody(gezeigt: readonly LVNode[]) {
  return render(
    <ViewerProvider>
      <CompareBody gezeigt={gezeigt} onlyDiffs={false} />
    </ViewerProvider>,
  );
}

/** Die Werte einer Merkmalszeile, in der gezeichneten Reihenfolge. */
function zeile(name: string): string[] {
  const kopf = screen.getByRole('rowheader', { name });
  return within(kopf.closest('tr') as HTMLElement)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

describe('CompareBody', () => {
  it('stellt jede Position mit ihren eigenen Werten in eine Spalte', () => {
    renderBody([
      positionNode('001.0010', { shortText: 'Erste', quantity: 10 }),
      positionNode('001.0020', { shortText: 'Zweite', quantity: 25 }),
    ]);
    expect(screen.getByText('Erste')).toBeInTheDocument();
    expect(zeile('MENGE')).toEqual(['10 m³', '25 m³']);
  });

  it('lässt einen Knoten ohne Position weg, statt die Spalten zu verschieben', () => {
    // Heute filtert der Viewer solche Knoten schon vorher heraus. Käme doch
    // einer durch, stünde ohne diese Zeile ein leerer Spaltenkopf vorn — und
    // jede Zahl darunter eine Spalte zu weit links.
    renderBody([
      ABSCHNITT,
      positionNode('001.0010', { shortText: 'Erste', quantity: 10 }),
      positionNode('001.0020', { shortText: 'Zweite', quantity: 25 }),
    ]);
    expect(screen.queryByText('Abschnitt')).toBeNull();
    // Zwei Spalten, zwei Wege hinaus — nicht drei.
    expect(screen.getAllByRole('button', { name: /aus dem Vergleich nehmen$/ })).toHaveLength(2);
    expect(zeile('MENGE')).toEqual(['10 m³', '25 m³']);
  });
});
