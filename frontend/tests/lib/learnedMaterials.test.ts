// Als Material gelernte Begriffe stehen im Filter „Material" (Entscheidung 0066).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACETS } from '../../src/lib/facets';
import { materialTerms, withLearnedMaterials } from '../../src/lib/index/learnedMaterials';
import { summarize } from '../../src/lib/index/summary';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import type { LearnedTerm } from '../../src/lib/highlight/terms';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const LV = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);
const SLOT = FACETS.findIndex((facet) => facet.id === 'material');

/** Ein Wort aus dem Kurztext der ersten Position — kommt sicher vor. */
function wortAusDerDatei(): string {
  const index = buildPositionIndex(LV.tree);
  const match = /\p{L}{6,}/u.exec(index.positions[0].shortText);
  if (match === null) throw new Error('Kein Wort im Kurztext');
  return match[0];
}

describe('withLearnedMaterials', () => {
  it('lässt den Index ohne Material-Begriffe unverändert', () => {
    const index = buildPositionIndex(LV.tree);
    const nurWichtig: LearnedTerm[] = [{ begriff: 'Beton', kategorie: 'wichtig' }];
    expect(withLearnedMaterials(index, materialTerms(nurWichtig))).toBe(index);
  });

  it('nimmt einen gelernten Begriff als Material auf und zählt ihn', () => {
    const wort = wortAusDerDatei();
    const index = buildPositionIndex(LV.tree);
    const mit = withLearnedMaterials(index, [{ begriff: wort, kategorie: 'material' }]);
    expect(mit.facts[0].facetValues[SLOT]).toContain(wort);
    expect(summarize(mit).facets.get('material')?.get(wort)).toBeGreaterThan(0);
  });

  it('nimmt ein schon erkanntes Material nicht doppelt auf', () => {
    const index = buildPositionIndex(LV.tree);
    const mit = withLearnedMaterials(index, [{ begriff: 'beton', kategorie: 'material' }]);
    const zaehlung = summarize(mit).facets.get('material');
    expect(zaehlung?.has('beton')).toBe(false);
    expect(zaehlung?.get('Beton')).toBe(LV.summary.facets.get('material')?.get('Beton'));
  });
});
