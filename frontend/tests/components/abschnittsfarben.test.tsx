// Punktfarbe nach Hauptabschnitt (Entscheidung 0043). Zusagen: jede Position
// trägt den Ton ihres obersten Abschnitts (Lose übersprungen), derselbe Ton wie
// in der Verteilung im Überblick, und die Legende nennt die Abschnitte nur in
// der Matrix — nach LV zeigen die Gruppen den Abschnitt selbst.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraphHeader } from '../../src/components/graph/GraphHeader';
import { CATEGORY_COLORS, NEUTRAL_COLOR } from '../../src/lib/colors';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildOverview } from '../../src/lib/overview/model';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { indexParents } from '../../src/lib/tree/buildTree';
import { buildSectionColors } from '../../src/lib/tree/mainSection';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const index = buildPositionIndex(lv.tree);
const parents = indexParents(lv.tree);
const colors = buildSectionColors(index, parents);

function colorOf(oz: string): string {
  const slot = index.positions.findIndex((position) => position.oz === oz);
  return colors.bySlot[slot];
}

describe('Abschnittsfarben', () => {
  it('färbt nach dem obersten Abschnitt, nicht nach dem Gewerk', () => {
    expect(colorOf('001.002.0020')).toBe(colorOf('001.001.0010'));
    expect(colorOf('999.001.0010')).not.toBe(colorOf('001.001.0010'));
    expect(colors.bySlot).not.toContain(NEUTRAL_COLOR);
    expect(colors.entries.map(([name]) => name)).toEqual([
      expect.stringMatching(/^§ 001 · /),
      expect.stringMatching(/^§ 002 · /),
      expect.stringMatching(/^§ 999 · /),
    ]);
  });

  it('nimmt denselben Ton wie die Verteilung im Überblick', () => {
    const { groups } = buildOverview({ index, mask: null, parents });
    for (const group of groups) {
      const slot = index.positions.findIndex((position) =>
        position.oz.startsWith(`${group.key.replace('section:', '')}.`),
      );
      expect(colors.bySlot[slot]).toBe(CATEGORY_COLORS[group.order % CATEGORY_COLORS.length]);
    }
  });
});

function Steuerung() {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'graphLayout', value: 'matrix' })}>
        Matrix
      </button>
    </>
  );
}

describe('Legende der Abschnittsfarben', () => {
  function renderHeader() {
    render(
      <ViewerProvider>
        <Steuerung />
        <GraphHeader root={lv.tree} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    return screen.getByLabelText('Legende');
  }

  it('nennt nach LV keine Abschnitte — die Gruppen zeigen sie selbst', () => {
    const legende = renderHeader();
    expect(within(legende).queryByText(/^§ /)).toBeNull();
  });

  it('nennt in der Matrix die Abschnitte mit ihrer Farbe', () => {
    const legende = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Matrix' }));
    expect(within(legende).getByTitle(/^§ 999 · /)).toBeInTheDocument();
    expect(within(legende).queryByText(/Gewerke/)).toBeNull();
  });
});
