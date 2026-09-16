// Kennzahlen des Überblicks (WP-L, Schritt 3 und 4). Die Abnahme verlangt zwei
// Dinge: die Zahlen stimmen gegen die Tabellensummen, und eine Datei ohne
// Preise zeigt keine Null-Euro-Werte.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { prepareFilters } from '../../src/lib/matchPos';
import { buildOverview, MAX_GROUPS, NO_GEWERK } from '../../src/lib/overview/model';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { buildTree } from '../../src/lib/tree/buildTree';
import { indexParents } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';
import type { LVDraft } from '../../src/types/lvDraft';

function overviewOf(draft: LVDraft, search = '') {
  const tree = buildTree(draft);
  const index = buildPositionIndex(tree);
  const active = prepareFilters({ facets: {}, menge: null }, search);
  const mask = active.filtering ? filterMask(index, active) : null;
  return {
    model: buildOverview({ index, mask, parents: indexParents(tree) }),
    index,
    summary: summarize(index),
  };
}

describe('buildOverview · mit Preisen', () => {
  const { model, summary } = overviewOf(syntheticDraft(200));

  it('nennt dieselbe Summe wie die vorberechneten Aggregate', () => {
    expect(model.metrics.hasPrices).toBe(true);
    expect(model.metrics.totalPrice).toBeCloseTo(summary.totalPrice, 6);
    expect(model.metrics.positions).toBe(summary.positionCount);
    expect(model.metrics.filtering).toBe(false);
  });

  it('verteilt die Summe restlos auf Gewerke und darin auf Abschnitte', () => {
    const groups = model.groups.reduce((sum, group) => sum + group.value, 0);
    expect(groups).toBeCloseTo(model.metrics.totalPrice, 6);
    for (const group of model.groups) {
      const cells = group.cells.reduce((sum, cell) => sum + cell.value, 0);
      expect(cells).toBeCloseTo(group.value, 6);
      expect(group.cells.reduce((sum, cell) => sum + cell.count, 0)).toBe(group.count);
    }
  });

  it('misst die Fläche an der Summe, sobald die Datei Preise führt', () => {
    expect(model.measure).toBe('preis');
  });

  it('liest ab, wie viele Positionen 80 % der Summe tragen', () => {
    const pareto = model.pareto;
    expect(pareto).not.toBeNull();
    if (pareto === null) return;
    expect(pareto.positions).toBeGreaterThan(0);
    expect(pareto.positions).toBeLessThanOrEqual(model.metrics.positions);
    expect(pareto.share).toBeCloseTo(pareto.positions / model.metrics.positions, 6);
    // Die Kurve steigt monoton und endet bei der vollen Summe.
    let last = -1;
    for (const point of pareto.curve) {
      expect(point.y).toBeGreaterThanOrEqual(last);
      last = point.y;
    }
    expect(pareto.curve[pareto.curve.length - 1].y).toBeCloseTo(1, 6);
  });

  it('summiert Mengen je Einheit, absteigend und ohne Einheiten zu mischen', () => {
    expect(model.units.length).toBeGreaterThan(1);
    for (let i = 1; i < model.units.length; i++) {
      expect(model.units[i - 1].quantity).toBeGreaterThanOrEqual(model.units[i].quantity);
    }
    expect(model.units.reduce((sum, unit) => sum + unit.count, 0)).toBe(model.metrics.positions);
    // Schreibweisen sind zusammengeführt wie im Filter: "Stck" zählt als Stück.
    expect(model.units.map((unit) => unit.key)).toContain('Stück');
  });

  it('rechnet nur über die gefilterte Menge', () => {
    const { model: gefiltert } = overviewOf(syntheticDraft(200), 'Stütze');
    expect(gefiltert.metrics.filtering).toBe(true);
    expect(gefiltert.metrics.positions).toBeLessThan(model.metrics.positions);
    expect(gefiltert.metrics.totalPositions).toBe(model.metrics.positions);
    expect(gefiltert.metrics.totalPrice).toBeLessThan(model.metrics.totalPrice);
  });
});

describe('buildOverview · ohne Preise', () => {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  const lv = runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
  const index = buildPositionIndex(lv.tree);
  const model = buildOverview({ index, mask: null, parents: indexParents(lv.tree) });

  it('sagt, dass die Datei keine Preise führt — statt 0 € zu behaupten', () => {
    expect(model.metrics.hasPrices).toBe(false);
    expect(model.metrics.withoutPrice).toBe(model.metrics.positions);
  });

  it('misst die Treemap dann an der Anzahl der Positionen', () => {
    expect(model.measure).toBe('anzahl');
    const groups = model.groups.reduce((sum, group) => sum + group.value, 0);
    expect(groups).toBe(model.metrics.positions);
  });

  it('lässt die Pareto-Auswertung entfallen, statt eine Nullkurve zu zeichnen', () => {
    expect(model.pareto).toBeNull();
  });

  it('führt unklassifizierte Positionen sichtbar, aber nicht als Gewerk', () => {
    const ohne = model.groups.find((group) => group.key === NO_GEWERK);
    expect(ohne).toBeDefined();
    expect(ohne?.filterable).toBe(false);
    expect(model.metrics.gewerke).toBeLessThan(model.groups.length + model.metrics.positions);
  });

  it('trägt die Mengen auch ohne Preise — sie übernehmen die Hauptrolle', () => {
    expect(model.units.length).toBeGreaterThan(0);
    expect(model.units[0].quantity).toBeGreaterThan(0);
  });
});

describe('buildOverview · viele Gewerke', () => {
  it('fasst alles jenseits der Kachelgrenze zusammen, ohne Summe zu verlieren', () => {
    const count = MAX_GROUPS + 5;
    const draft: LVDraft = {
      projectName: 'Viele Gewerke',
      client: null,
      lots: [
        {
          number: '001',
          label: 'Los 1',
          sections: Array.from({ length: count }, (_, i) => ({
            number: `001.${String(i + 1).padStart(3, '0')}`,
            label: `Abschnitt ${i + 1}`,
            sections: [],
            positions: [
              {
                oz: `001.${String(i + 1).padStart(3, '0')}.0010`,
                shortText: `Position ${i}`,
                longText: '',
                unit: 'm2',
                quantity: 10,
                unitPrice: (i + 1) * 100,
                positionType: 'NORMAL' as const,
                attributes: { gewerk: `Gewerk ${String(i).padStart(2, '0')}` },
              },
            ],
          })),
        },
      ],
    };
    const { model } = overviewOf(draft);
    expect(model.groups).toHaveLength(MAX_GROUPS);
    const rest = model.groups[model.groups.length - 1];
    expect(rest.label).toMatch(/Weitere \d+ Gewerke/);
    expect(rest.filterable).toBe(false);
    expect(model.groups.reduce((sum, group) => sum + group.value, 0)).toBeCloseTo(
      model.metrics.totalPrice,
      6,
    );
    expect(model.groups.reduce((sum, group) => sum + group.count, 0)).toBe(model.metrics.positions);
  });
});
