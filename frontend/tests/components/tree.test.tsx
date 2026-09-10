// Baumspalte (Issue #41, WP-41-3): Knöpfe „Alle aufklappen" / „Alle zuklappen".

import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { Tree } from '../../src/components/layout/Tree';
import { buildTree } from '../../src/lib/tree/buildTree';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft } from '../../src/types/lvDraft';

const draft: LVDraft = {
  projectName: 'Testprojekt',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los 1',
      sections: [
        {
          number: '01.01',
          label: 'Erdarbeiten',
          sections: [],
          positions: [
            {
              oz: '01.01.0010',
              shortText: 'Oberboden abtragen',
              longText: '',
              unit: 'm3',
              quantity: 1,
              unitPrice: null,
              positionType: 'NORMAL',
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};

/** Lädt das LV in den Provider, wie es sonst der Upload täte. */
function Loader() {
  const dispatch = useViewerDispatch();
  useEffect(() => {
    dispatch({
      type: 'loaded',
      lv: { tree: buildTree(draft), projectName: 'Testprojekt', client: null, fileName: 't.x83' },
    });
  }, [dispatch]);
  return null;
}

describe('Tree · Alle auf-/zuklappen', () => {
  it('klappt über die Knöpfe alle Ebenen auf und wieder zu', () => {
    render(
      <ViewerProvider>
        <Loader />
        <Tree width={260} collapsed={false} onToggleCollapsed={() => {}} />
      </ViewerProvider>,
    );

    // Frisch geladen: Projekt und Los offen, der Abschnitt zu.
    expect(screen.getByText('Erdarbeiten')).toBeInTheDocument();
    expect(screen.queryByText('Oberboden abtragen')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Alle aufklappen' }));
    expect(screen.getByText('Oberboden abtragen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alle zuklappen' }));
    expect(screen.queryByText('Oberboden abtragen')).toBeNull();
    expect(screen.queryByText('Erdarbeiten')).toBeNull();
    expect(screen.getByText('Los 1')).toBeInTheDocument();
  });
});
