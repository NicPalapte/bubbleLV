// WP-F: Der Graph muss Richtung ~10k Positionen tragen. Geprüft wird die Engine
// (Layout, Dichte-Klassifizierung, Culling) — nicht das Rendering.

import { describe, expect, it } from 'vitest';
import { sizeModeById, tierOf } from '../../src/lib/graph/constants';
import { cullBounds, isInView } from '../../src/lib/graph/culling';
import { classifyChildren, collapseFrom, layoutRadial } from '../../src/lib/graph/layoutRadial';
import { buildTree } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft, SectionDraft } from '../../src/types/lvDraft';

/** 1 Los × 10 Abschnitte × 10 Unterabschnitte × 100 Positionen = 10 000 Positionen. */
function syntheticDraft(): LVDraft {
  const sections: SectionDraft[] = [];
  for (let s = 1; s <= 10; s++) {
    const subsections: SectionDraft[] = [];
    for (let u = 1; u <= 10; u++) {
      const positions: PositionDraft[] = [];
      for (let p = 1; p <= 100; p++) {
        positions.push({
          oz: `001.${s}.${u}.${String(p).padStart(4, '0')}`,
          shortText: `Position ${p}`,
          longText: '',
          unit: 'm3',
          quantity: 1,
          unitPrice: 100,
          positionType: 'NORMAL',
          attributes: {},
        });
      }
      subsections.push({ number: `001.${s}.${u}`, label: `Unter ${u}`, positions, sections: [] });
    }
    sections.push({
      number: `001.${s}`,
      label: `Abschnitt ${s}`,
      positions: [],
      sections: subsections,
    });
  }
  return {
    projectName: 'Skalierungstest',
    client: null,
    lots: [{ number: '001', label: 'Los 1', sections }],
  };
}

const tree = buildTree(syntheticDraft());

describe('Graph-Engine bei ~10k Positionen', () => {
  it('aggregiert den Baum vollständig', () => {
    expect(tree.positionCount).toBe(10_000);
    expect(tree.totalPrice).toBe(1_000_000);
  });

  it('zeichnet im Standardzustand nur die oberen Ebenen', () => {
    const { nodes } = layoutRadial(tree, collapseFrom(tree, 2));
    // Projekt + Los + 10 Abschnitte + je eine Cluster-Bubble ist die Obergrenze;
    // die 10 000 Positionen bleiben eingeklappt.
    expect(nodes.size).toBeLessThan(50);
  });

  it('fasst mehr als CLUSTER_AT Geschwister zu einer Cluster-Bubble zusammen', () => {
    const { nodes } = layoutRadial(tree, {});
    const subsection = tree.children[0].children[0].children[0];
    expect(classifyChildren(subsection.children)).toBe('cluster');
    expect(nodes.has(`cluster:${subsection.id}`)).toBe(true);
    // Die 100 Positionen darunter werden nicht einzeln platziert.
    expect(nodes.has(subsection.children[0].id)).toBe(false);
  });

  it('platziert bei aufgeklappten Ebenen in vertretbarer Zeit', () => {
    const started = performance.now();
    const { nodes } = layoutRadial(tree, {});
    expect(nodes.size).toBeGreaterThan(100);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('reduziert die Zeichenmenge durch Viewport-Culling deutlich', () => {
    const { nodes } = layoutRadial(tree, {});
    const count = (tx: number, ty: number, k: number): number => {
      const bounds = cullBounds({ tx, ty, k, width: 1200, height: 800 });
      let visible = 0;
      for (const node of nodes.values()) if (isInView(bounds, node.cx, node.cy, 40)) visible++;
      return visible;
    };

    const overview = count(600, 400, 1);
    const zoomedIn = count(600, 400, 2);
    expect(overview).toBeGreaterThan(0);
    expect(overview).toBeLessThan(nodes.size);
    // Weiter hineinzoomen zeigt weniger Knoten …
    expect(zoomedIn).toBeLessThan(overview);
    // … und ein weit weggeschobener Viewport gar keine.
    expect(count(-100_000, -100_000, 1)).toBe(0);
  });

  it('leitet die Anzeige-Ebene aus Knotenart und Tiefe ab', () => {
    const lot = tree.children[0];
    const section = lot.children[0];
    const subsection = section.children[0];
    expect(tierOf(tree, 0)).toBe('project');
    expect(tierOf(lot, 1)).toBe('lot');
    expect(tierOf(section, 2)).toBe('section');
    expect(tierOf(subsection, 3)).toBe('subsection');
    expect(tierOf(subsection.children[0], 4)).toBe('position');
  });

  it('liefert je Größenmodus den passenden Aggregatwert', () => {
    expect(sizeModeById('count').get(tree)).toBe(10_000);
    expect(sizeModeById('cost').get(tree)).toBe(1_000_000);
    expect(sizeModeById('uniform').get(tree)).toBe(1);
  });
});
