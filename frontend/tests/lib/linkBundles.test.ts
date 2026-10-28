// Marken am PDF-Rand: Stellen in Nachbarzeilen teilen sich eine Marke.

import { describe, expect, it } from 'vitest';
import { bundleSpots } from '../../src/lib/docs/linkBundles';

describe('bundleSpots', () => {
  it('fasst nahe Stellen zusammen und lässt ferne einzeln', () => {
    const placed = [
      { spot: 'c', top: 140 },
      { spot: 'a', top: 100 },
      { spot: 'b', top: 115 },
    ];
    expect(bundleSpots(placed, 20)).toEqual([
      { top: 100, spots: ['a', 'b'] },
      { top: 140, spots: ['c'] },
    ]);
  });

  it('misst ab der obersten Stelle, damit ein Bündel nicht endlos wächst', () => {
    const placed = [0, 12, 24, 36].map((top, at) => ({ spot: at, top }));
    expect(bundleSpots(placed, 20).map((bundle) => bundle.spots)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('liefert für keine Stelle keine Marke', () => {
    expect(bundleSpots([], 20)).toEqual([]);
  });
});
