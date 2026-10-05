// WP-F: Der Graph muss Richtung ~10k Positionen tragen. Geprüft wird die Engine
// (Layout, Größe, Culling) — nicht das Rendering.

import { describe, expect, it } from 'vitest';
import { cullBounds, isInView } from '../../src/lib/graph/culling';
import { layoutMap, type MapOptions } from '../../src/lib/graph/layoutMap';
import { positionRadii } from '../../src/lib/graph/sizes';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildTree, indexParents } from '../../src/lib/tree/buildTree';
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

const index = buildPositionIndex(tree);
const parents = indexParents(tree);

function options(overrides: Partial<MapOptions> = {}): MapOptions {
  return {
    layout: 'lv',
    rows: 'einheit',
    cols: null,
    radii: positionRadii(index, 'quantity'),
    mask: null,
    hide: false,
    selected: {},
    ...overrides,
  };
}

describe('Graph-Engine bei ~10k Positionen', () => {
  it('aggregiert den Baum vollständig', () => {
    expect(tree.positionCount).toBe(10_000);
    expect(tree.totalPrice).toBe(1_000_000);
  });

  it('macht jeden Abschnitt der untersten Ebene zu einer Gruppe', () => {
    const map = layoutMap(index, parents, options());
    expect(map.groups).toHaveLength(100);
    expect(map.groups.every((group) => group.slots.length === 100)).toBe(true);
    // Das eine Los wird zur Hülle um alle Gruppen.
    expect(map.hulls).toHaveLength(1);
    expect(map.hulls[0].slots).toHaveLength(10_000);
  });

  it('nennt die Ebene darüber als Beschriftung am Kreis', () => {
    const map = layoutMap(index, parents, options());
    const group = map.groups.find((candidate) => candidate.nodeId !== null);
    expect(group?.context).toMatch(/Abschnitt \d+/);
  });

  it('platziert alle Positionen in vertretbarer Zeit', () => {
    const started = performance.now();
    const map = layoutMap(index, parents, options());
    expect(performance.now() - started).toBeLessThan(1000);
    expect(map.px.every(Number.isFinite)).toBe(true);
  });

  it('lässt keine zwei Gruppen einander überdecken', () => {
    const { groups } = layoutMap(index, parents, options());
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i];
        const b = groups[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 0.01);
      }
    }
  });

  it('hält jede Position in ihrem Gruppenkreis', () => {
    const map = layoutMap(index, parents, options());
    for (const group of map.groups) {
      for (const slot of group.slots) {
        const distance = Math.hypot(map.px[slot] - group.x, map.py[slot] - group.y);
        expect(distance).toBeLessThanOrEqual(group.r);
      }
    }
  });

  it('reduziert die Zeichenmenge durch Viewport-Culling deutlich', () => {
    const map = layoutMap(index, parents, options());
    const count = (tx: number, ty: number, k: number): number => {
      const bounds = cullBounds({ tx, ty, k, width: 1200, height: 800 });
      let visible = 0;
      for (let slot = 0; slot < index.size; slot++) {
        if (isInView(bounds, map.px[slot], map.py[slot], 8)) visible++;
      }
      return visible;
    };
    const { x0, x1 } = map.bounds;
    const k = 1200 / (x1 - x0);
    const tx = -x0 * k;
    const overview = count(tx, 400, k);
    const zoomedIn = count(600 - ((x0 + x1) / 2) * k * 4, 400, k * 4);
    expect(overview).toBeGreaterThan(0);
    // Weiter hineinzoomen zeigt weniger Positionen …
    expect(zoomedIn).toBeLessThan(overview);
    // … und ein weit weggeschobener Ausschnitt gar keine.
    expect(count(-100_000, -100_000, k)).toBe(0);
  });
});
