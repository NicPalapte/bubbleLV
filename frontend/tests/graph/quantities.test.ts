// Mengen für den Größenmodus „Menge" (WP-Q, Schritt 4; Issue #51).

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { quantitiesByNode, singleUnit } from '../../src/lib/graph/quantities';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { EMPTY_FILTERS, prepareFilters, type Filters } from '../../src/lib/matchPos';
import { classifyAndBuild, runPipeline } from '../../src/lib/pipeline/runPipeline';
import { indexParents } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';

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

function maskFor(filters: Filters = EMPTY_FILTERS, search = ''): Uint8Array {
  return filterMask(index, prepareFilters(filters, search));
}

/** Die Einheit, die in der Musterdatei am häufigsten vorkommt. */
function haeufigsteEinheit(): string {
  const counts = new Map<string, number>();
  for (const position of index.positions) {
    const unit = position.unit;
    if (unit === null) continue;
    counts.set(unit, (counts.get(unit) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

describe('singleUnit', () => {
  it('meldet keine Einheit, solange das LV mehrere mischt', () => {
    expect(singleUnit(index, maskFor())).toBeNull();
  });

  it('meldet die Einheit, sobald der Filter auf eine führt', () => {
    const einheit = haeufigsteEinheit();
    const unit = singleUnit(
      index,
      maskFor({ facets: { einheit: new Set([einheit]) }, menge: null }),
    );
    expect(unit).not.toBeNull();
  });
});

describe('quantitiesByNode', () => {
  it('summiert nur die Treffer und reicht sie nach oben durch', () => {
    const einheit = haeufigsteEinheit();
    const mask = maskFor({ facets: { einheit: new Set([einheit]) }, menge: null });
    const byNode = quantitiesByNode(index, mask, parents);

    let erwartet = 0;
    for (let i = 0; i < index.size; i++) {
      if (mask[i] === 1 && Number.isFinite(index.quantity[i])) erwartet += index.quantity[i];
    }
    expect(byNode.get(lv.tree.id)).toBeCloseTo(erwartet, 6);
    expect(erwartet).toBeGreaterThan(0);

    // Die Summe eines Abschnitts ist die Summe seiner getroffenen Positionen.
    for (const lot of lv.tree.children) {
      for (const section of lot.children) {
        const summe = section.children.reduce((total, child) => {
          const slot = index.slotOf.get(child.id);
          if (slot === undefined || mask[slot] !== 1) return total;
          const value = index.quantity[slot];
          return Number.isFinite(value) ? total + value : total;
        }, 0);
        if (summe > 0) expect(byNode.get(section.id)).toBeCloseTo(summe, 6);
      }
    }
  });

  it('zählt Positionen ohne Menge nicht als null mit', () => {
    const mask = maskFor();
    const byNode = quantitiesByNode(index, mask, parents);
    for (let i = 0; i < index.size; i++) {
      if (Number.isFinite(index.quantity[i])) continue;
      // Ohne Menge steht die Position in keiner Summe — auch nicht mit 0.
      expect(byNode.has(index.nodes[i].id)).toBe(false);
    }
  });
});

describe('Laufzeit', () => {
  it('bleibt bei 10.000 Positionen im Budget eines Filterwechsels', () => {
    const big = classifyAndBuild(syntheticDraft(10_000), 'synthetisch.x83');
    const bigIndex = buildPositionIndex(big.tree);
    const bigParents = indexParents(big.tree);
    const mask = filterMask(bigIndex, prepareFilters(EMPTY_FILTERS, 'Bauteils'));

    const started = performance.now();
    // Beides läuft bei jedem Filterwechsel im Hauptthread, solange der Graph
    // die aktive Ansicht ist — `singleUnit` sogar unabhängig vom Größenmodus,
    // weil der Umschalter die Einheit kennen muss.
    const unit = singleUnit(bigIndex, mask);
    const byNode = quantitiesByNode(bigIndex, mask, bigParents);
    const dauer = performance.now() - started;

    expect(byNode.size).toBeGreaterThan(0);
    // Das synthetische LV mischt Einheiten — genau der Fall, in dem
    // `singleUnit` früh abbricht und der Modus gesperrt bleibt.
    expect(unit).toBeNull();
    // Zielwert „Filterwechsel < 100 ms" aus docs/scope.md; diese beiden sind
    // nur ein Teil davon, deshalb die Hälfte als Schranke.
    expect(dauer).toBeLessThan(50);
  });
});
