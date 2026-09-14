// Performance-Schranke für 10.000 Positionen (WP-I, Abnahmekriterium in
// docs/implementation-plan.md). Der Test misst die Zeit, die ein Filterwechsel
// tatsächlich kostet, und schlägt fehl, sobald sie das Ziel reißt — er ist die
// Bremse gegen ein schleichendes Zurückfallen auf Baum-Traversierung je Render.
//
// Gemessen wird der Median mehrerer Läufe: CI-Maschinen schwanken, und ein
// einzelner Ausreißer soll den Lauf nicht rot färben. Die Schranken liegen auf
// den Zielwerten aus docs/scope.md, nicht auf der heute gemessenen Zeit —
// Luft nach oben ist gewollt, ein Rückfall um eine Größenordnung nicht.

import { describe, expect, it } from 'vitest';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { EMPTY_FILTERS, prepareFilters, type Filters } from '../../src/lib/matchPos';
import { buildTree } from '../../src/lib/tree/buildTree';
import { computeMatchCounts } from '../../src/lib/tree/matchCounts';
import { syntheticDraft } from '../support/syntheticLv';

const POSITIONS = 10_000;
/** Zielwert „Filterwechsel < 100 ms" aus docs/scope.md. */
const FILTER_BUDGET_MS = 100;
/** Index und Aggregate sind Teil der „ersten Ansicht < 5 s" — hier ihr Anteil. */
const BUILD_BUDGET_MS = 2000;
const RUNS = 5;

const draft = syntheticDraft(POSITIONS);
const tree = buildTree(draft);
const index = buildPositionIndex(tree);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeMedian(run: () => unknown): number {
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  return median(samples);
}

function filters(facets: Record<string, string[]>, menge: [number, number] | null = null): Filters {
  return {
    facets: Object.fromEntries(Object.entries(facets).map(([id, values]) => [id, new Set(values)])),
    menge,
  };
}

describe(`Filter über ${POSITIONS.toLocaleString('de-DE')} Positionen`, () => {
  it('baut Index und Aggregate in einem Bruchteil des Ladebudgets', () => {
    expect(index.size).toBe(POSITIONS);
    const elapsed = timeMedian(() => summarize(buildPositionIndex(tree)));
    expect(elapsed).toBeLessThan(BUILD_BUDGET_MS);
  });

  const cases: Array<[string, Filters, string]> = [
    ['eine Facette', filters({ gewerk: ['Betonarbeiten'] }), ''],
    ['mehrere Facetten', filters({ gewerk: ['Betonarbeiten'], einheit: ['m3'] }), ''],
    ['Mengenbereich', filters({}, [100, 400]), ''],
    ['Volltextsuche im Langtext', EMPTY_FILTERS, 'nachbehandeln'],
    ['Facette und Suche', filters({ bauteiltyp: ['Wand'] }), 'aufmaß'],
  ];

  it.each(cases)('%s bleibt im Budget', (_name, active, search) => {
    const prepared = prepareFilters(active, search);
    const elapsed = timeMedian(() => filterMask(index, prepared));
    expect(elapsed).toBeLessThan(FILTER_BUDGET_MS);
  });

  it('hält auch die Trefferzahlen für Baum und Graph im Budget', () => {
    const prepared = prepareFilters(filters({ gewerk: ['Betonarbeiten'] }), 'aufmaß');
    const elapsed = timeMedian(() => computeMatchCounts(tree, index, prepared));
    expect(elapsed).toBeLessThan(FILTER_BUDGET_MS);
  });
});
