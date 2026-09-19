// Streuung und Ausreißer (WP-M, Schritt 4). Der Plan verlangt ausdrücklich
// Median und Quartilsabstand statt Mittelwert — der erste Test hält genau das
// fest: ein einzelner Extremwert darf die Bezugsgröße nicht mitziehen.

import { describe, expect, it } from 'vitest';
import {
  MIN_FOR_OUTLIERS,
  outlierBounds,
  outlierDirection,
  quantile,
  spread,
  statsOf,
} from '../../src/lib/relate/stats';

describe('quantile', () => {
  it('interpoliert zwischen den Nachbarn', () => {
    const sorted = [1, 2, 3, 4];
    expect(quantile(sorted, 0.5)).toBeCloseTo(2.5, 10);
    expect(quantile(sorted, 0.25)).toBeCloseTo(1.75, 10);
    expect(quantile(sorted, 0.75)).toBeCloseTo(3.25, 10);
  });

  it('gibt bei einem einzigen Wert diesen zurück', () => {
    expect(quantile([7], 0.25)).toBe(7);
  });
});

describe('statsOf', () => {
  it('lässt einen Extremwert den Median nicht verschieben', () => {
    const stats = statsOf([10, 10, 11, 11, 1000]);
    expect(stats).not.toBeNull();
    expect(stats!.median).toBe(11);
    expect(stats!.max).toBe(1000);
  });

  it('übergeht fehlende Werte statt sie als 0 zu zählen', () => {
    const stats = statsOf([Number.NaN, 4, 6]);
    expect(stats!.count).toBe(2);
    expect(stats!.min).toBe(4);
  });

  it('gibt null zurück, wenn kein Wert vorliegt', () => {
    expect(statsOf([Number.NaN, Number.NaN])).toBeNull();
    expect(statsOf([])).toBeNull();
  });
});

describe('outlierBounds', () => {
  it('schweigt bei zu wenigen Werten', () => {
    const werte = Array.from({ length: MIN_FOR_OUTLIERS - 1 }, (_, i) => i + 1);
    expect(outlierBounds(statsOf(werte)!)).toBeNull();
  });

  it('schweigt, wenn die halbe Gruppe auf demselben Wert liegt', () => {
    // Quartilsabstand 0: jede Abweichung wäre ein „Ausreißer" — das ist kein
    // Hinweis, sondern Rauschen.
    expect(outlierBounds(statsOf([5, 5, 5, 5, 9])!)).toBeNull();
  });

  it('spannt den Erwartungsbereich um die Quartile', () => {
    const stats = statsOf([10, 12, 14, 16, 100])!;
    const bounds = outlierBounds(stats)!;
    expect(bounds).not.toBeNull();
    expect(outlierDirection(100, bounds)).toBe('hoch');
    expect(outlierDirection(14, bounds)).toBeNull();
    expect(outlierDirection(-500, bounds)).toBe('niedrig');
    expect(outlierDirection(Number.NaN, bounds)).toBeNull();
  });
});

describe('spread', () => {
  it('ist 0, wenn alle Werte gleich sind', () => {
    expect(spread(statsOf([8, 8, 8])!)).toBe(0);
  });

  it('misst dimensionslos, damit sich 12 € und 1.200 € vergleichen lassen', () => {
    const klein = spread(statsOf([10, 12, 14, 16])!);
    const gross = spread(statsOf([1000, 1200, 1400, 1600])!);
    expect(klein).toBeCloseTo(gross, 10);
  });
});
