// Flacher Positions-Index: Inhalt, Spalten und Gleichstand mit `matchPos`.
// Der Index darf nie eine andere Antwort geben als die Einzelprüfung — sonst
// wären Baum, Graph und Tabelle nicht mehr dieselbe gefilterte Menge.

import { describe, expect, it } from 'vitest';
import {
  buildPositionIndex,
  createPositionFilter,
  filterMask,
} from '../../src/lib/index/positionIndex';
import { EMPTY_FILTERS, matchPos, prepareFilters, type Filters } from '../../src/lib/matchPos';
import { buildTree, collectPositions } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';
import type { LVNode } from '../../src/types/lvNode';

const draft = syntheticDraft(120);
const tree = buildTree(draft);
const index = buildPositionIndex(tree);

function filters(facets: Record<string, string[]>, menge: [number, number] | null = null): Filters {
  return {
    facets: Object.fromEntries(Object.entries(facets).map(([id, values]) => [id, new Set(values)])),
    menge,
  };
}

describe('buildPositionIndex', () => {
  it('führt jede Position genau einmal, in Dokumentreihenfolge', () => {
    const nodes = collectPositions(tree);
    expect(index.size).toBe(nodes.length);
    expect(index.nodes.map((node) => node.code)).toEqual(nodes.map((node) => node.code));
  });

  it('verweist auf die Baumknoten selbst, nicht auf Kopien', () => {
    const [first] = collectPositions(tree);
    const slot = index.slotOf.get(first.id);
    expect(slot).toBeDefined();
    expect(index.nodes[slot as number]).toBe(first);
  });

  it('legt Menge, EP und GP als typisierte Spalten ab', () => {
    expect(index.quantity).toBeInstanceOf(Float64Array);
    expect(index.unitPrice).toBeInstanceOf(Float64Array);
    expect(index.totalPrice).toBeInstanceOf(Float64Array);
    const position = index.positions[0];
    expect(index.quantity[0]).toBe(position.quantity);
    expect(index.unitPrice[0]).toBe(position.unitPrice);
    expect(index.totalPrice[0]).toBeCloseTo(
      (position.quantity ?? 0) * (position.unitPrice ?? 0),
      6,
    );
  });

  it('merkt fehlende Zahlen als NaN, damit sie keinen Wertebereich verfälschen', () => {
    const ohnePreis = buildTree({
      projectName: null,
      client: null,
      lots: [
        {
          number: '001',
          label: null,
          sections: [
            {
              number: '001.001',
              label: null,
              sections: [],
              positions: [
                {
                  oz: '001.001.0010',
                  shortText: 'Ohne Preis',
                  longText: '',
                  unit: 'm3',
                  quantity: null,
                  unitPrice: null,
                  positionType: 'NORMAL',
                  attributes: {},
                },
              ],
            },
          ],
        },
      ],
    });
    const sparse = buildPositionIndex(ohnePreis);
    expect(Number.isNaN(sparse.quantity[0])).toBe(true);
    expect(Number.isNaN(sparse.unitPrice[0])).toBe(true);
    expect(sparse.totalPrice[0]).toBe(0);
  });
});

describe('filterMask / createPositionFilter', () => {
  const cases: Array<[string, Filters, string]> = [
    ['ohne Filter', EMPTY_FILTERS, ''],
    ['eine Facette', filters({ gewerk: ['Betonarbeiten'] }), ''],
    ['mehrere Facetten', filters({ gewerk: ['Betonarbeiten'], einheit: ['m3'] }), ''],
    ['Mehrwert-Facette', filters({ expo: ['XF3'] }), ''],
    ['Mengenbereich', filters({}, [100, 400]), ''],
    ['Suche', EMPTY_FILTERS, 'nachbehandeln'],
    ['Facette und Suche', filters({ bauteiltyp: ['Wand'] }), 'aufmaß'],
  ];

  it.each(cases)('antwortet wie matchPos: %s', (_name, active, search) => {
    const prepared = prepareFilters(active, search);
    const mask = filterMask(index, prepared);
    for (let i = 0; i < index.size; i++) {
      expect(mask[i] === 1).toBe(matchPos(index.positions[i], active, search));
    }
  });

  it('leitet für Knoten außerhalb des Index frisch ab', () => {
    const fremd: LVNode = {
      id: 'position:fremd',
      kind: 'position',
      code: '999.0010',
      ownCode: '0010',
      label: 'Fremde Position',
      positionCount: 1,
      totalPrice: 0,
      children: [],
      position: {
        oz: '999.0010',
        shortText: 'Sonderposition Estrich',
        longText: '',
        unit: 'm2',
        quantity: 5,
        unitPrice: null,
        positionType: 'NORMAL',
        attributes: {},
      },
    };
    const matches = createPositionFilter(index, prepareFilters(EMPTY_FILTERS, 'estrich'));
    expect(matches(fremd)).toBe(true);
    const andere = createPositionFilter(index, prepareFilters(EMPTY_FILTERS, 'mauerwerk'));
    expect(andere(fremd)).toBe(false);
  });
});
