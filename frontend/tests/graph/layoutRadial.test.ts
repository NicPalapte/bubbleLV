// Layout-Regeln des Bubble-Graphen: Abschnitte sitzen als Kreis um ihren
// Elternknoten, der Kreisradius folgt der Größe der Teilbäume (Issue #11);
// Positionen sitzen als Wolke um ihren Abschnitt (WP-41-5, Issue #46); dazu
// das Auflösen einer Cluster-Bubble (Issue #10).

import { describe, expect, it } from 'vitest';
import { RADII, SIZE_MAX_FACTOR, sizedRadius } from '../../src/lib/graph/constants';
import { allExpanded, layoutRadial } from '../../src/lib/graph/layoutRadial';
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

/** Abschnitt mit Unterabschnitten statt Positionen — Kinder für den Ring. */
function nested(sizes: readonly number[]): SectionDraft {
  return {
    number: '001.001',
    label: 'Hauptabschnitt',
    positions: [],
    sections: sizes.map((size, index) => ({
      number: `001.001.${String(index + 1).padStart(3, '0')}`,
      label: `Unterabschnitt ${index + 1}`,
      positions: positions(`001.001.${String(index + 1).padStart(3, '0')}`, size),
      sections: [],
    })),
  };
}

/** Ein Los mit genau einem Hauptabschnitt, der `sizes` Unterabschnitte trägt. */
function draftNested(sizes: readonly number[]): LVDraft {
  return {
    projectName: 'Layout-Test',
    client: null,
    lots: [{ number: '001', label: 'Los 1', sections: [nested(sizes)] }],
  };
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
    const { nodes } = layoutRadial(tree, allExpanded(tree));

    // Alle Abschnitte haben denselben Abstand zu ihrem Los — nicht zum Ursprung.
    const distances = lot.children.map((section) => distance(nodes, lot.id, section.id));
    for (const value of distances) {
      expect(value).toBeCloseTo(distances[0], 6);
    }
    // Und sie liegen nicht alle in derselben Richtung.
    expect(
      angleSpan(
        nodes,
        lot.children.map((section) => section.id),
      ),
    ).toBeGreaterThan(0.5);
  });

  it('gibt dem größeren Teilbaum den breiteren Winkel', () => {
    // Zwei Unterabschnitte am selben Hauptabschnitt: der mit mehr Positionen
    // ist breiter und bekommt den größeren Winkelanteil.
    const tree = buildTree(draftNested([200, 2, 2, 2]));
    const main = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, allExpanded(tree));

    const angles = main.children.map((child) => nodes.get(child.id)?.angle ?? 0);
    const gapBig = Math.abs(angles[1] - angles[0]);
    const gapSmall = Math.abs(angles[3] - angles[2]);
    expect(gapBig).toBeGreaterThan(gapSmall * 1.5);
  });

  it('vergrößert die Wolke mit der Menge der Positionen', () => {
    const smallTree = buildTree(draftWith([3]));
    const largeTree = buildTree(draftWith([24]));
    const small = layoutRadial(smallTree, allExpanded(smallTree));
    const large = layoutRadial(largeTree, allExpanded(largeTree));

    const smallSection = smallTree.children[0].children[0];
    const largeSection = largeTree.children[0].children[0];
    expect(large.clouds.get(largeSection.id)?.radius ?? 0).toBeGreaterThan(
      small.clouds.get(smallSection.id)?.radius ?? 0,
    );
    expect(large.extent).toBeGreaterThan(small.extent);
  });

  it('fasst viele Geschwister-Abschnitte zu einer Cluster-Bubble zusammen', () => {
    // Mehr als CLUSTER_AT (40) Unterabschnitte — Positionen werden dagegen nie
    // geclustert, sie liegen in der Wolke.
    const tree = buildTree(draftNested(Array.from({ length: 45 }, () => 1)));
    const main = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, allExpanded(tree));
    expect(nodes.has(`cluster:${main.id}`)).toBe(true);
    expect(nodes.has(main.children[0].id)).toBe(false);
  });

  it('löst eine aufgeklappte Cluster-Bubble in einzelne Bubbles auf', () => {
    const tree = buildTree(draftNested(Array.from({ length: 45 }, () => 1)));
    const main = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, allExpanded(tree), new Set([main.id]));
    expect(nodes.has(`cluster:${main.id}`)).toBe(false);
    for (const child of main.children) {
      expect(nodes.has(child.id)).toBe(true);
    }
  });

  it('clustert Positionen nie, sondern legt sie als Wolke um den Abschnitt', () => {
    // Der Befund aus Issue #46: Abschnitts-Bubble plus Sammelknoten waren zwei
    // Knoten für eine Sache.
    const tree = buildTree(draftWith([92]));
    const section = tree.children[0].children[0];
    const { nodes, clouds } = layoutRadial(tree, allExpanded(tree));
    expect(nodes.has(`cluster:${section.id}`)).toBe(false);
    expect(clouds.get(section.id)?.count).toBe(92);
    for (const child of section.children) {
      expect(nodes.get(child.id)?.cloudOf).toBe(section.id);
    }
  });

  it('trägt den größten Knoten einer Ebene innerhalb der Layout-Reserve', () => {
    // `layoutRadial` rechnet mit SIZE_MAX_FACTOR; kein Größenmodus darf darüber
    // hinaus wachsen, sonst überlappen die Bubbles nach dem Umschalten.
    const range = { min: 1, max: 400 };
    expect(sizedRadius('section', 400, range, false)).toBeCloseTo(
      RADII.section * SIZE_MAX_FACTOR,
      6,
    );
    expect(sizedRadius('section', 1, range, false)).toBeLessThan(RADII.section);
  });
});

describe('sizedRadius', () => {
  it('spreizt die Radien innerhalb einer Ebene sichtbar', () => {
    const range = { min: 3, max: 15 };
    const big = sizedRadius('section', 15, range, false);
    const small = sizedRadius('section', 3, range, false);
    // Ohne spürbare Spreizung wirkt der Größenmodus wie ein toter Knopf.
    expect(big / small).toBeGreaterThan(1.5);
  });

  it('bleibt beim Basisradius, wenn es nichts zu vergleichen gibt', () => {
    // Im Modus "Anz. Positionen" zählt jede Position 1 — alle gleich groß,
    // aber eben nicht alle auf Maximalgröße aufgeblasen.
    const range = { min: 1, max: 1 };
    expect(sizedRadius('position', 1, range, false)).toBe(RADII.position);
  });

  it('ignoriert den Wert im Modus „Einheitlich"', () => {
    expect(sizedRadius('lot', 999, { min: 1, max: 999 }, true)).toBe(RADII.lot);
  });
});

describe('Positionswolke (WP-41-5)', () => {
  it('wächst mit der Wurzel der Positionszahl statt linear', () => {
    // Der alte Ring wuchs linear: 92 Positionen ergaben Radius ~1.460. Die
    // Wolke füllt eine Fläche, viermal so viele Positionen kosten deshalb nur
    // den doppelten Radius.
    const hundred = buildTree(draftWith([100]));
    const fourHundred = buildTree(draftWith([400]));
    const small = layoutRadial(hundred, allExpanded(hundred));
    const large = layoutRadial(fourHundred, allExpanded(fourHundred));

    const r1 = small.clouds.get(hundred.children[0].children[0].id)?.radius ?? 0;
    const r2 = large.clouds.get(fourHundred.children[0].children[0].id)?.radius ?? 0;
    expect(r2 / r1).toBeGreaterThan(1.7);
    expect(r2 / r1).toBeLessThan(2.2);
  });

  it('hält die Wolken von Geschwister-Abschnitten auseinander', () => {
    const tree = buildTree(draftWith([40, 40, 40]));
    const { nodes, clouds } = layoutRadial(tree, allExpanded(tree));
    const sections = tree.children[0].children;

    for (let a = 0; a < sections.length; a++) {
      for (let b = a + 1; b < sections.length; b++) {
        const ra = clouds.get(sections[a].id)?.radius ?? 0;
        const rb = clouds.get(sections[b].id)?.radius ?? 0;
        expect(distance(nodes, sections[a].id, sections[b].id)).toBeGreaterThanOrEqual(ra + rb);
      }
    }
  });

  it('legt die Positionen ohne Überlappung in die Wolke', () => {
    const tree = buildTree(draftWith([200]));
    const section = tree.children[0].children[0];
    const { nodes } = layoutRadial(tree, allExpanded(tree));
    const points = section.children.map((child) => nodes.get(child.id));

    // Der Punkt-Slot des Layouts: zwei Positionen dürfen sich nicht berühren.
    // Positionen skalieren nicht mit dem Größenmodus (Issue #41), deshalb ist
    // ihr Radius fest.
    const slot = RADII.position;
    let closest = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        if (a === undefined || b === undefined) continue;
        closest = Math.min(closest, Math.hypot(a.cx - b.cx, a.cy - b.cy));
      }
    }
    expect(closest).toBeGreaterThanOrEqual(2 * slot);
  });

  it('hält die Beispieldatei aus Issue #41 im lesbaren Rahmen', () => {
    // 29 Unterabschnitte à 23 Positionen — der alte Ring kam auf rund 40.000
    // Einheiten Durchmesser.
    const tree = buildTree(draftNested(Array.from({ length: 29 }, () => 23)));
    const { extent } = layoutRadial(tree, allExpanded(tree));
    expect(2 * extent).toBeLessThan(6000);
  });

  it('layoutet 10.000 Positionen in einem Abschnitt schnell genug', () => {
    const tree = buildTree(draftWith([10_000]));
    const started = performance.now();
    const { nodes, clouds } = layoutRadial(tree, allExpanded(tree));
    const elapsed = performance.now() - started;
    expect(nodes.size).toBeGreaterThan(10_000);
    expect(clouds.get(tree.children[0].children[0].id)?.count).toBe(10_000);
    expect(elapsed).toBeLessThan(100);
  });

  it('schrumpft im Modus „Ausblenden" auf die Treffer zusammen', () => {
    const tree = buildTree(draftWith([100]));
    const section = tree.children[0].children[0];
    const keep = new Set(section.children.slice(0, 5).map((child) => child.id));
    const full = layoutRadial(tree, allExpanded(tree));
    const filtered = layoutRadial(
      tree,
      allExpanded(tree),
      new Set(),
      (node) => node.kind === 'position' && !keep.has(node.id),
    );

    expect(filtered.clouds.get(section.id)?.count).toBe(5);
    expect(filtered.clouds.get(section.id)?.radius ?? 0).toBeLessThan(
      full.clouds.get(section.id)?.radius ?? 0,
    );
    expect(filtered.nodes.has(section.children[50].id)).toBe(false);
  });
});
