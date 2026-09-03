import { describe, expect, it } from 'vitest';
import { allExpanded, expandedToDepth } from '../../src/lib/graph/layoutRadial';
import { EMPTY_FILTERS } from '../../src/lib/matchPos';
import { buildTree } from '../../src/lib/tree/buildTree';
import { flattenVisible, indexRows, parentRowIndex } from '../../src/lib/tree/flattenVisible';
import { computeMatchCounts } from '../../src/lib/tree/matchCounts';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';
import type { LVNode } from '../../src/types/lvNode';

function position(oz: string, shortText: string): PositionDraft {
  return {
    oz,
    shortText,
    longText: '',
    unit: 'm3',
    quantity: 1,
    unitPrice: 1,
    positionType: 'NORMAL',
    attributes: {},
  };
}

/** Los 1 → Abschnitt A (2 Positionen) + Abschnitt B (1 Position). */
function tree(): LVNode {
  const draft: LVDraft = {
    projectName: 'Testprojekt',
    client: null,
    lots: [
      {
        number: '001',
        label: 'Los 1',
        sections: [
          {
            number: '001.001',
            label: 'Abschnitt A',
            positions: [position('001.001.0010', 'Beton'), position('001.001.0020', 'Mauerwerk')],
            sections: [],
          },
          {
            number: '001.002',
            label: 'Abschnitt B',
            positions: [position('001.002.0010', 'Beton')],
            sections: [],
          },
        ],
      },
    ],
  };
  return buildTree(draft);
}

const NO_MATCHES = { counts: new Map<string, number>(), filtering: false };

describe('flattenVisible', () => {
  it('listet nur die Kinder offener Knoten, in Anzeigereihenfolge', () => {
    const root = tree();
    const rows = flattenVisible(root, expandedToDepth(root, 2), NO_MATCHES, false);

    expect(rows.map((row) => row.node.code)).toEqual(['001', '001.001', '001.002']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1]);
    // Die Wurzel selbst steht nicht in der Liste — sie ist der Spaltenkopf.
    expect(rows.some((row) => row.node.kind === 'project')).toBe(false);
  });

  it('gibt nichts aus, solange das Projekt zugeklappt ist', () => {
    const root = tree();
    expect(flattenVisible(root, new Set(), NO_MATCHES, false)).toEqual([]);
  });

  it('nimmt Positionen erst auf, wenn ihr Abschnitt offen ist', () => {
    const root = tree();
    const rows = flattenVisible(root, allExpanded(root), NO_MATCHES, false);

    expect(rows.map((row) => row.node.code)).toEqual([
      '001',
      '001.001',
      '001.001.0010',
      '001.001.0020',
      '001.002',
      '001.002.0010',
    ]);
    expect(rows[2].depth).toBe(2);
    expect(rows[2].hasChildren).toBe(false);
  });

  it('zählt Geschwister für ARIA — nur die tatsächlich sichtbaren', () => {
    const root = tree();
    const open = allExpanded(root);
    const matches = computeMatchCounts(root, EMPTY_FILTERS, 'beton', true);

    const shown = flattenVisible(root, open, matches, false);
    const abschnitte = shown.filter((row) => row.node.kind === 'section');
    expect(abschnitte.map((row) => `${row.posInSet}/${row.setSize}`)).toEqual(['1/2', '2/2']);

    // Im Modus "Ausblenden" fällt die Position ohne Treffer weg — und damit
    // ändert sich auch die Geschwisterzahl.
    const hidden = flattenVisible(root, open, matches, true);
    expect(hidden.map((row) => row.node.code)).toEqual([
      '001',
      '001.001',
      '001.001.0010',
      '001.002',
      '001.002.0010',
    ]);
    const treffer = hidden.find((row) => row.node.code === '001.001.0010');
    expect(`${treffer?.posInSet}/${treffer?.setSize}`).toBe('1/1');
  });

  it('markiert Nicht-Treffer, ohne sie zu entfernen', () => {
    const root = tree();
    const matches = computeMatchCounts(root, EMPTY_FILTERS, 'mauerwerk', true);
    const rows = flattenVisible(root, allExpanded(root), matches, false);

    const missed = rows.filter((row) => row.missed).map((row) => row.node.code);
    expect(missed).toEqual(['001.001.0010', '001.002', '001.002.0010']);
  });
});

describe('indexRows / parentRowIndex', () => {
  it('findet die Zeile eines Knotens', () => {
    const root = tree();
    const rows = flattenVisible(root, allExpanded(root), NO_MATCHES, false);
    const index = indexRows(rows);

    expect(index.get(rows[3].node.id)).toBe(3);
    expect(index.has('gibt-es-nicht')).toBe(false);
  });

  it('findet die Elternzeile über die Tiefe', () => {
    const root = tree();
    const rows = flattenVisible(root, allExpanded(root), NO_MATCHES, false);

    // 001.001.0020 (Index 3) hängt an 001.001 (Index 1), das an 001 (Index 0).
    expect(parentRowIndex(rows, 3)).toBe(1);
    expect(parentRowIndex(rows, 1)).toBe(0);
    // Oberste Ebene hat keine Elternzeile.
    expect(parentRowIndex(rows, 0)).toBe(-1);
  });
});
