// Gliederung des Graphen (docs/decisions/0035-graph-gliederung.md): „nach LV"
// mit Los-Hüllen, „frei" als Matrix aus Merkmalen, Kreispackung, Größe der
// Positionen und Platzsuche der Hinweisschilder.

import { describe, expect, it } from 'vitest';
import { groupRadius } from '../../src/lib/graph/constants';
import { layoutMap, NO_VALUE, type MapOptions } from '../../src/lib/graph/layoutMap';
import { packCircles } from '../../src/lib/graph/pack';
import { placePins, type PinAnchor } from '../../src/lib/graph/pins';
import { isPauschal, positionRadii } from '../../src/lib/graph/sizes';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildTree, indexParents } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

function position(
  oz: string,
  unit: string,
  quantity: number | null,
  gewerk: string | null,
): PositionDraft {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: '',
    unit,
    quantity,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: gewerk === null ? {} : { gewerk },
  };
}

/** Zwei Lose; das erste mit einem verschachtelten Abschnitt. */
const draft: LVDraft = {
  projectName: 'Testprojekt',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Rohbau',
      sections: [
        {
          number: '01.01',
          label: 'Erdarbeiten',
          positions: [
            position('01.01.0010', 'm3', 100, 'Erdarbeiten'),
            position('01.01.0020', 'm3', 25, 'Erdarbeiten'),
          ],
          sections: [],
        },
        {
          number: '01.02',
          label: 'Beton',
          positions: [],
          sections: [
            {
              number: '01.02.01',
              label: 'Wände',
              positions: [
                position('01.02.01.0010', 'm2', 40, 'Betonarbeiten'),
                position('01.02.01.0020', 'm3', 12, 'Betonarbeiten'),
              ],
              sections: [],
            },
          ],
        },
      ],
    },
    {
      number: '02',
      label: 'Ausbau',
      sections: [
        {
          number: '02.01',
          label: 'Maler',
          positions: [
            position('02.01.0010', 'm2', 300, null),
            position('02.01.0020', 'psch', 1, null),
          ],
          sections: [],
        },
      ],
    },
  ],
};

const tree = buildTree(draft);
const index = buildPositionIndex(tree);
const parents = indexParents(tree);

function options(overrides: Partial<MapOptions> = {}): MapOptions {
  return {
    layout: 'lv',
    rows: 'einheit',
    cols: null,
    radii: positionRadii(index, 'uniform'),
    mask: null,
    hide: false,
    selected: {},
    ...overrides,
  };
}

function maskOf(predicate: (slot: number) => boolean): Uint8Array {
  const mask = new Uint8Array(index.size);
  for (let slot = 0; slot < index.size; slot++) mask[slot] = predicate(slot) ? 1 : 0;
  return mask;
}

const slotOf = (oz: string): number => index.positions.findIndex((p) => p.oz === oz);

describe('Gliederung „nach LV"', () => {
  it('macht den Elternabschnitt jeder Position zur Gruppe', () => {
    const map = layoutMap(index, parents, options());
    expect(map.groups.map((group) => group.slots.length)).toEqual([2, 2, 2]);
    expect(map.groups.map((group) => group.nodeId)).not.toContain(null);
  });

  it('zieht um jedes Los eine Hülle mit seinen Positionen', () => {
    const map = layoutMap(index, parents, options());
    expect(map.hulls.map((hull) => hull.title)).toEqual(['Rohbau', 'Ausbau']);
    expect(map.hulls[0].slots).toHaveLength(4);
    for (const hull of map.hulls) {
      for (const slot of hull.slots) {
        expect(Math.hypot(map.px[slot] - hull.x, map.py[slot] - hull.y)).toBeLessThan(hull.r);
      }
    }
  });

  it('nennt bei verschachtelten Abschnitten die Ebene darüber', () => {
    const map = layoutMap(index, parents, options());
    const walls = map.groups.find((group) => group.title.includes('Wände'));
    expect(walls?.context).toBe('01.02  Beton');
    // Nur die eigene Nummer im Titel — die Ebene darüber steht schon daneben.
    expect(walls?.title).toBe('01  Wände');
  });

  it('summiert die Menge nur, wenn eine Gruppe genau eine Einheit hat', () => {
    const map = layoutMap(index, parents, options());
    const erd = map.groups.find((group) => group.title.includes('Erdarbeiten'));
    const walls = map.groups.find((group) => group.title.includes('Wände'));
    expect(erd?.sum).toBe('Σ 125 m³');
    expect(walls?.sum).toBe('');
  });

  it('lässt Nicht-Treffer beim Ausblenden aus dem Layout fallen', () => {
    const mask = maskOf((slot) => index.positions[slot].oz.startsWith('02'));
    const map = layoutMap(index, parents, options({ mask, hide: true }));
    expect(map.groups).toHaveLength(1);
    expect(map.hulls.map((hull) => hull.title)).toEqual(['Ausbau']);
    expect(Number.isNaN(map.px[slotOf('01.01.0010')])).toBe(true);
  });
});

describe('Gliederung „frei"', () => {
  it('bildet ohne Spalten eine Gruppe je Wert, Fehlendes als „ohne Angabe"', () => {
    const map = layoutMap(index, parents, options({ layout: 'frei', rows: 'gewerk' }));
    expect(map.axes).toBeNull();
    expect(map.groups.map((group) => group.title).sort()).toEqual(
      ['Betonarbeiten', 'Erdarbeiten', 'Ohne Gewerk'].sort(),
    );
  });

  it('legt mit Spalten eine Matrix samt Achsen an', () => {
    const map = layoutMap(
      index,
      parents,
      options({ layout: 'frei', rows: 'einheit', cols: 'gewerk' }),
    );
    expect(map.axes?.rowKey).toBe('Einheit');
    expect(map.axes?.colKey).toBe('Gewerk');
    const rows = map.axes?.rows.length ?? 0;
    const cols = map.axes?.cols.length ?? 0;
    expect(map.groups).toHaveLength(rows * cols);
    // Jede Zeile steht auf einer Höhe, jede Spalte auf einer Breite.
    const ys = new Set(map.groups.map((group) => group.y));
    const xs = new Set(map.groups.map((group) => group.x));
    expect(ys.size).toBe(rows);
    expect(xs.size).toBe(cols);
  });

  it('nimmt als Achse die gewählten Filterwerte, auch wenn eine Zelle leer bleibt', () => {
    const selected = { einheit: new Set(['m2', 'm3']) };
    const mask = maskOf((slot) => ['m2', 'm3'].includes(index.positions[slot].unit ?? ''));
    const map = layoutMap(
      index,
      parents,
      options({ layout: 'frei', rows: 'einheit', cols: 'gewerk', mask, selected }),
    );
    expect(map.axes?.rows.map((row) => row.label)).toEqual(['m²', 'm³']);
    expect(map.groups.some((group) => group.slots.length === 0)).toBe(true);
  });

  it('sammelt gedämpfte Nicht-Treffer in „übrige", beim Ausblenden nicht', () => {
    const mask = maskOf((slot) => index.positions[slot].unit === 'm3');
    const dim = layoutMap(index, parents, options({ layout: 'frei', mask }));
    expect(dim.groups.find((group) => group.rest)?.slots).toHaveLength(3);
    const hide = layoutMap(index, parents, options({ layout: 'frei', mask, hide: true }));
    expect(hide.groups.some((group) => group.rest)).toBe(false);
  });

  it('führt Positionen ohne Wert unter „ohne Angabe"', () => {
    const map = layoutMap(index, parents, options({ layout: 'frei', rows: 'bauteiltyp' }));
    expect(map.groups.map((group) => group.title)).toEqual([NO_VALUE]);
  });
});

describe('Größe der Positionen', () => {
  it('misst Mengen nur innerhalb derselben Einheit', () => {
    const radii = positionRadii(index, 'quantity');
    // Größte Menge je Einheit → größter Radius, egal wie groß die Zahl absolut ist.
    expect(radii[slotOf('01.01.0010')]).toBeCloseTo(radii[slotOf('02.01.0010')]);
    expect(radii[slotOf('01.01.0020')]).toBeLessThan(radii[slotOf('01.01.0010')]);
  });

  it('lässt Pauschalen beim Grundradius', () => {
    expect(isPauschal('psch')).toBe(true);
    expect(isPauschal('PSCH.')).toBe(true);
    expect(isPauschal('m2')).toBe(false);
    const uniform = positionRadii(index, 'uniform');
    const radii = positionRadii(index, 'quantity');
    expect(radii[slotOf('02.01.0020')]).toBe(uniform[0]);
  });

  it('macht Gruppen nach Anzahl größer, nie kleiner als den Mindestradius', () => {
    expect(groupRadius(0)).toBe(34);
    expect(groupRadius(400)).toBeGreaterThan(groupRadius(100));
  });
});

describe('Kreispackung', () => {
  it('legt Kreise überschneidungsfrei und eng um den Ursprung', () => {
    const circles = Array.from({ length: 60 }, (_, i) => ({ r: 5 + (i % 7) * 4, x: 0, y: 0 }));
    const radius = packCircles(circles);
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-6);
      }
    }
    const area = circles.reduce((sum, c) => sum + Math.PI * c.r * c.r, 0);
    // Dicht gepackt: der Umkreis ist höchstens gut doppelt so groß wie nötig.
    expect(Math.PI * radius * radius).toBeLessThan(area * 2.5);
  });
});

describe('Hinweisschilder', () => {
  const anchor = (id: string, sx: number, sy: number, strong = false): PinAnchor => ({
    id,
    sx,
    sy,
    rr: 6,
    label: `⚠ ${id} · Regel`,
    strong,
  });
  const stage = { width: 800, height: 600 };

  it('legt sich nie über ein anderes Schild', () => {
    const anchors = Array.from({ length: 30 }, (_, i) => anchor(`P${i}`, 300 + (i % 5) * 8, 300));
    const pins = placePins(anchors, stage, []);
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i].box;
        const b = pins[j].box;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
    // Es passen nicht alle hin — die übrigen entfallen statt zu überlappen.
    expect(pins.length).toBeLessThan(anchors.length);
  });

  it('weicht Fenstern aus und lässt Bubbles außerhalb des Bildes weg', () => {
    const blocked = [{ x: 0, y: 0, w: 800, h: 280 }];
    const pins = placePins([anchor('A', 400, 300), anchor('B', -20, 300)], stage, blocked);
    expect(pins.map((pin) => pin.anchor.id)).toEqual(['A']);
    expect(pins[0].box.y).toBeGreaterThanOrEqual(280);
  });

  it('platziert „beachten" vor den übrigen Hinweisen', () => {
    const pins = placePins(
      [anchor('leicht', 400, 300), anchor('schwer', 404, 300, true)],
      stage,
      [],
    );
    expect(pins[0].anchor.id).toBe('schwer');
  });
});
