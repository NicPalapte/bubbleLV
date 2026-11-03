// Abschnitt mit Text in der Bezeichnung (Issue #196): der Import-Log nennt ihn,
// ein Klick wählt ihn aus, und die Abschnittskarte zeigt den vollen Text.
// Alle Texte erfunden.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NodeDetails } from '../../src/components/common/NodeDetails';
import { ImportLogCard } from '../../src/components/overview/ImportLogCard';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildImportLog, nodesWithLabelText } from '../../src/lib/overview/importLog';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { buildTree } from '../../src/lib/tree/buildTree';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft, PositionDraft } from '@core';

const TEXT = 'Alle Gehölze sind vor Ort abzunehmen.\n- Hochstämme mit Ballen';

function position(oz: string): PositionDraft {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: 'Langtext',
    unit: 'St',
    quantity: 1,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
}

const draft: LVDraft = {
  projectName: 'Test',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Außenanlagen',
      sections: [
        {
          number: '01.01',
          label: 'Pflanzarbeiten',
          text: TEXT,
          positions: [position('01.01.0010')],
          sections: [],
        },
        { number: '01.02', label: 'Wege', positions: [position('01.02.0010')], sections: [] },
      ],
    },
  ],
};

describe('nodesWithLabelText', () => {
  it('findet nur Abschnitte mit Text, in Dokumentreihenfolge', () => {
    const tree = buildTree(draft);
    const ids = nodesWithLabelText(tree);
    expect(ids).toHaveLength(1);
    const log = buildImportLog(buildPositionIndex(tree), tree);
    expect(log.labelText).toEqual(ids);
    expect(nodesWithLabelText(null)).toEqual([]);
  });
});

function Steuerung() {
  const dispatch = useViewerDispatch();
  const { selectedNode } = useViewer();
  return (
    <>
      <button
        type="button"
        onClick={() => dispatch({ type: 'loaded', lv: classifyAndBuild(draft, 'test.x83') })}
      >
        laden
      </button>
      {selectedNode !== null && <NodeDetails node={selectedNode} />}
    </>
  );
}

describe('Import-Log und Abschnittskarte', () => {
  it('nennt den Abschnitt und zeigt nach Klick den vollen Text', () => {
    render(
      <ViewerProvider>
        <Steuerung />
        <ImportLogCard />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByRole('button', { name: /Abschnitte mit Text in der Bezeichnung/ }));
    fireEvent.click(screen.getByRole('button', { name: /Pflanzarbeiten/ }));

    const block = screen.getByRole('region', { name: 'Text zum Abschnitt' });
    expect(block.textContent).toContain('Alle Gehölze sind vor Ort abzunehmen.');
    expect(block.textContent).toContain('- Hochstämme mit Ballen');
  });
});
