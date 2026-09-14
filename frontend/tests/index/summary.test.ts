// Aggregate des geladenen LV: Facetten-Zähler und Wertebereiche. Sie ersetzen
// die früheren Zählungen im Render und müssen deshalb exakt dasselbe liefern.

import { describe, expect, it } from 'vitest';
import { FACETS } from '../../src/lib/facets';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { buildTree } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';

const draft = syntheticDraft(200);
const index = buildPositionIndex(buildTree(draft));
const summary = summarize(index);

describe('summarize', () => {
  it('zählt je Facette so oft, wie die Facette Werte liefert', () => {
    for (const facet of FACETS) {
      const expected = new Map<string, number>();
      for (const position of index.positions) {
        for (const value of facet.get(position)) {
          expected.set(value, (expected.get(value) ?? 0) + 1);
        }
      }
      expect(summary.facets.get(facet.id)).toEqual(expected);
    }
  });

  it('gibt die Werte in Anzeigereihenfolge zurück', () => {
    const positionstyp = [...(summary.facets.get('positionstyp') ?? new Map()).keys()];
    expect(positionstyp).toEqual(['NORMAL', 'ALTERNATIV']);
    const einheit = [...(summary.facets.get('einheit') ?? new Map()).keys()];
    expect(einheit).toEqual([...einheit].sort((a, b) => a.localeCompare(b, 'de')));
  });

  it('nennt Anzahl, Wertebereiche und Gesamtsumme', () => {
    const quantities = index.positions.map((position) => position.quantity ?? 0);
    expect(summary.positionCount).toBe(index.size);
    expect(summary.quantity).toEqual({
      min: Math.min(...quantities),
      max: Math.max(...quantities),
    });
    const total = index.positions.reduce(
      (sum, position) => sum + (position.quantity ?? 0) * (position.unitPrice ?? 0),
      0,
    );
    expect(summary.totalPrice).toBeCloseTo(total, 6);
  });

  it('lässt Wertebereiche leer, wenn die Datei keine Zahlen führt', () => {
    const ohneZahlen = buildTree({
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
                  shortText: 'Ohne Zahlen',
                  longText: '',
                  unit: null,
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
    const leer = summarize(buildPositionIndex(ohneZahlen));
    expect(leer.quantity).toBeNull();
    expect(leer.unitPrice).toBeNull();
    expect(leer.totalPrice).toBe(0);
  });
});
