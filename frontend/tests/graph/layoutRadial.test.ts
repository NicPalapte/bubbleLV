// Layout-Regeln des Bubble-Graphen: Kinder sitzen als Kreis um ihren
// Elternknoten, der Kreisradius folgt der Größe der Teilbäume (Issue #11);
// dazu das Auflösen einer Cluster-Bubble (Issue #10).

import { describe, expect, it } from 'vitest';
import { layoutRadial } from '../../src/lib/graph/layoutRadial';
import { buildTree } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft, SectionDraft } from '../../src/types/lvDraft';

function positions(prefix: string, count: number): PositionDraft[] {
  return Array.from({ length: count }, (_, index) => ({
    oz: `${prefix}.${String(index + 1).padStart(4, '0')}`,
    shortText: `Position ${index + 1}`,
    longText: '',
    unit: 'm3',
    quantity: 1,
    unitPrice: 10,
    positionType: 'NORMAL' as const,
    attributes: {},
  }));
}

/** Ein Los mit je einem Abschnitt pro Eintrag in `sizes`. */
function draftWith(sizes: readonly number[]): LVDraft {
  const sections: SectionDraft[] = sizes.map((size, index) => ({
    number: `001.${String(index + 1).padStart(3, '0')}`,
    label: `Abschnitt ${index + 1}`,
    positions: positions(`001.${String(index + 1).padStart(3, '0')}`, size),
    sections: [],
  }));
  return {
    projectName: 'Layout-Test',
    client: null,
    lots: [{ number: '001', label: 'Los 1', sections }],
  };
}

/** Winkelspanne zwischen erstem und letztem Kind eines Knotens. */
function angleSpan(nodes: Map<string, { angle: number }>, ids: readonly string[]): number {
  const angles = ids.map((id) => nodes.get(id)?.angle ?? 0);
  return Math.max(...angles) - Math.min(...angles);
}

/** Abstand eines platzierten Knotens zu einem anderen. */
function distance(
  nodes: Map<string, { cx: number; cy: number }>,
  fromId: string,
  toId: string,
): number {
  const a = nodes.get(fromId);
  const b = nodes.get(toId);
  if (a === undefined || b === undefined) return Number.NaN;
  return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

describe('layoutRadial', () => {
  it('legt die Kinder als Kreis um ihren Elternknoten', () => {
    const tree = buildTree(draftWith([4, 4, 4]));
    const lot = tree.children[0];
    const { nodes } = layoutRadial(tree, {});

    // Alle Abschnitte haben denselben Abstand zu ihrem Los — nicht zum Ursprung.
    const distances = lot.children.map((section) => distance(nodes, lot.id, section.id));
    for (const value of distances) {
      expect(value).toBeCloseTo(distances[0], 6);
    }
    // Und sie liegen nicht alle in derselben Richtung.
    expect(angleSpan(nodes, lot.children.map((section) => section.id))).toBeGreaterThan(0.5);
  });

  it('gibt dem größeren Teilbaum den breiteren Winkel', () => {
    const tree = buildTree(draftWith([6, 2]));
    const [big, small] = tree.children[0].children;
    const { nodes } = layoutRadial(tree, {});

    const spanBig = angleSpan(nodes, big.children.map((child) => child.id));
    const spanSmall = angleSpan(nodes, small.children.map((child) => child.id));
    expect(spanBig).toBeGreaterThan(spanSmall * 2);
  });

  it('vergrößert die Abstände mit der Menge der Positionen', () => {
    // 3 gegen 24 Positionen im Abschnitt: der Kreis der Positionen muss
    // mitwachsen, sonst würden sich die Bubbles überlagern.
    const smallTree = buildTree(draftWith([3]));
    const largeTree = buildTree(draftWith([24]));
    const small = layoutRadial(smallTree, {});
    const large = layoutRadial(largeTree, {});

    const smallSection = smallTree.children[0].children[0];
    const largeSection = largeTree.children[0].children[0];
    expect(distance(large.nodes, largeSection.id, largeSection.children[0].id)).toBeGreaterThan(
      distance(small.nodes, smallSection.id, smallSection.children[0].id),
    );
    expect(large.extent).toBeGreaterThan(small.extent);
  });

  it('fasst viele Geschwister zu einer Cluster-Bubble zusammen', () => {
    const tree = buildTree(draftWith([30]));
    const section = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, {});
    expect(nodes.has(`cluster:${section.id}`)).toBe(true);
    expect(nodes.has(section.children[0].id)).toBe(false);
  });

  it('löst eine aufgeklappte Cluster-Bubble in Punkte auf', () => {
    const tree = buildTree(draftWith([30]));
    const section = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, {}, { [section.id]: true });
    expect(nodes.has(`cluster:${section.id}`)).toBe(false);
    for (const child of section.children) {
      expect(nodes.get(child.id)?.dotted).toBe(true);
    }
  });
});
