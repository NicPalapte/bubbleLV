// Treffer-Isolation im Graphen (WP-Q, Schritt 1 und 2; Issue #60). Geprüft
// werden die Zusagen aus dem Plan: nur Treffer, nach dem gewählten Merkmal
// gebündelt, größte Gruppe zuerst — und das Ganze schnell genug, dass ein
// Tastendruck in der Suche nicht wartet.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFocusTree, FOCUS_ROOT_ID } from '../../src/lib/graph/focusTree';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { prepareFilters, EMPTY_FILTERS, type Filters } from '../../src/lib/matchPos';
import { classifyAndBuild, runPipeline } from '../../src/lib/pipeline/runPipeline';
import { indexParents } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';
import type { LVNode } from '../../src/types/lvNode';

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

function focusFor(
  search: string,
  groupBy: 'abschnitt' | 'gewerk' | 'bauteiltyp' = 'abschnitt',
  filters: Filters = EMPTY_FILTERS,
) {
  const active = prepareFilters(filters, search);
  return buildFocusTree(index, filterMask(index, active), {
    groupBy,
    sizeMode: 'count',
    parents,
  });
}

/** Alle Positionen des Isolations-Baums, egal in welcher Gruppe. */
function positionsOf(tree: LVNode): LVNode[] {
  return tree.children.flatMap((group) => group.children);
}

describe('buildFocusTree', () => {
  it('nimmt nur Treffer auf', () => {
    const focus = focusFor('Kalksandstein');
    expect(focus).not.toBeNull();
    const positions = positionsOf(focus!.tree);
    expect(positions.length).toBe(focus!.hitCount);
    for (const node of positions) {
      const text = `${node.position?.shortText ?? ''} ${node.position?.longText ?? ''}`;
      expect(text.toLowerCase()).toContain('kalksandstein');
    }
  });

  it('gibt ohne Treffer nichts zurück statt eines leeren Baums', () => {
    expect(focusFor('zzz-kein-treffer-zzz')).toBeNull();
  });

  it('bündelt nach dem gewählten Merkmal und zählt je Gruppe', () => {
    const focus = focusFor('beton', 'gewerk');
    expect(focus).not.toBeNull();
    expect(focus!.groupBy).toBe('gewerk');
    const summe = focus!.tree.children.reduce((total, group) => total + group.positionCount, 0);
    expect(summe).toBe(focus!.hitCount);
    // Jede Gruppe trägt genau einen Gewerk-Wert.
    for (const group of focus!.tree.children) {
      const werte = new Set(group.children.map((node) => node.position?.attributes.gewerk ?? null));
      expect(werte.size).toBe(1);
    }
  });

  it('stellt die größte Gruppe nach vorn', () => {
    const focus = focusFor('', 'gewerk', { facets: { positionsart: ['bauteil'] }, menge: null });
    expect(focus).not.toBeNull();
    const counts = focus!.tree.children.map((group) => group.positionCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('vergibt eindeutige IDs und hält die Positionsknoten des echten Baums', () => {
    const focus = focusFor('Wand', 'bauteiltyp');
    expect(focus).not.toBeNull();
    const ids = positionsOf(focus!.tree).map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Identität, keine Kopie — sonst liefen Auswahl und Farben auseinander.
    for (const node of positionsOf(focus!.tree)) {
      expect(index.nodes[index.slotOf.get(node.id)!]).toBe(node);
    }
    expect(focus!.tree.id).toBe(FOCUS_ROOT_ID);
    expect(focus!.openNodes.has(FOCUS_ROOT_ID)).toBe(true);
    for (const group of focus!.tree.children) expect(focus!.openNodes.has(group.id)).toBe(true);
  });

  it('sammelt Positionen ohne Wert in einer eigenen Gruppe statt sie zu verlieren', () => {
    const focus = focusFor('', 'bauteiltyp', { facets: {}, menge: null });
    // Ohne Filter ist `filtering` falsch — der Provider baut dann gar nicht.
    // Hier wird direkt gebaut, um den Sammelfall zu prüfen.
    expect(focus).not.toBeNull();
    const ohne = focus!.tree.children.find((group) => group.label === 'ohne Angabe');
    expect(ohne).toBeDefined();
    expect(ohne!.positionCount).toBeGreaterThan(0);
    expect(positionsOf(focus!.tree).length).toBe(index.size);
  });
});

describe('Laufzeit', () => {
  it('bleibt bei 10.000 Treffern unter dem Budget eines Filterwechsels', () => {
    const big = classifyAndBuild(syntheticDraft(10_000));
    const bigIndex = buildPositionIndex(big.tree);
    const bigParents = indexParents(big.tree);
    const active = prepareFilters(EMPTY_FILTERS, 'Bauteils');
    const mask = filterMask(bigIndex, active);
    expect(mask.reduce((total, hit) => total + hit, 0)).toBe(10_000);

    const started = performance.now();
    const focus = buildFocusTree(bigIndex, mask, {
      groupBy: 'gewerk',
      sizeMode: 'cost',
      parents: bigParents,
    });
    const dauer = performance.now() - started;

    expect(focus?.hitCount).toBe(10_000);
    // Zielwert „Filterwechsel < 100 ms" aus docs/scope.md; die Isolation ist
    // nur ein Teil davon, deshalb die Hälfte als Schranke.
    expect(dauer).toBeLessThan(50);
  });
});
