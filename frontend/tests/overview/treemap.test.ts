// Squarified Treemap (WP-L): Fläche = Wert, und die Kacheln bleiben im Rahmen.
// Ohne diese beiden Zusagen wäre die Ansicht eine hübsche Lüge.

import { describe, expect, it } from 'vitest';
import { squarify, type Placed, type Rect } from '../../src/lib/overview/treemap';

const RECT: Rect = { x: 0, y: 0, width: 400, height: 300 };

function area(entry: Placed<{ value: number }>): number {
  return entry.rect.width * entry.rect.height;
}

function overlaps(a: Rect, b: Rect): boolean {
  // Ein Pixel Toleranz: die Kacheln stoßen aneinander, sie überlappen nicht.
  const eps = 0.001;
  return (
    a.x + a.width - eps > b.x &&
    b.x + b.width - eps > a.x &&
    a.y + a.height - eps > b.y &&
    b.y + b.height - eps > a.y
  );
}

describe('squarify', () => {
  it('teilt die Fläche im Verhältnis der Werte auf', () => {
    const items = [{ value: 50 }, { value: 30 }, { value: 20 }];
    const placed = squarify(items, RECT);
    const total = RECT.width * RECT.height;
    expect(placed).toHaveLength(3);
    for (const entry of placed) {
      expect(area(entry) / total).toBeCloseTo(entry.item.value / 100, 5);
    }
  });

  it('füllt das Rechteck aus und lässt die Kacheln nicht überlappen', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ value: (i + 1) * 3 }));
    const placed = squarify(items, RECT);
    const covered = placed.reduce((sum, entry) => sum + area(entry), 0);
    expect(covered).toBeCloseTo(RECT.width * RECT.height, 3);

    for (const entry of placed) {
      expect(entry.rect.x).toBeGreaterThanOrEqual(RECT.x - 0.001);
      expect(entry.rect.y).toBeGreaterThanOrEqual(RECT.y - 0.001);
      expect(entry.rect.x + entry.rect.width).toBeLessThanOrEqual(RECT.x + RECT.width + 0.001);
      expect(entry.rect.y + entry.rect.height).toBeLessThanOrEqual(RECT.y + RECT.height + 0.001);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(overlaps(placed[i].rect, placed[j].rect)).toBe(false);
      }
    }
  });

  it('legt die größte Kachel zuerst', () => {
    const placed = squarify([{ value: 1 }, { value: 99 }, { value: 10 }], RECT);
    expect(placed.map((entry) => entry.item.value)).toEqual([99, 10, 1]);
  });

  it('hält die Kacheln halbwegs quadratisch statt als Streifen', () => {
    const placed = squarify(
      Array.from({ length: 12 }, () => ({ value: 1 })),
      { x: 0, y: 0, width: 600, height: 400 },
    );
    for (const entry of placed) {
      const ratio =
        Math.max(entry.rect.width, entry.rect.height) /
        Math.min(entry.rect.width, entry.rect.height);
      expect(ratio).toBeLessThan(3);
    }
  });

  it('lässt Werte ohne Fläche weg', () => {
    expect(squarify([{ value: 0 }, { value: -5 }], RECT)).toEqual([]);
    expect(squarify([{ value: 10 }], { x: 0, y: 0, width: 0, height: 100 })).toEqual([]);
    expect(squarify([], RECT)).toEqual([]);
  });

  it('versetzt die Kacheln in einem Rechteck, das nicht im Ursprung liegt', () => {
    const placed = squarify([{ value: 1 }], { x: 40, y: 20, width: 100, height: 50 });
    expect(placed[0].rect).toEqual({ x: 40, y: 20, width: 100, height: 50 });
  });
});
