// Eine Gewerk-Farbskala für alle Ansichten (WP-L, Schritt 5,
// docs/decisions/0013-gewerk-farbskala.md).

import { describe, expect, it } from 'vitest';
import {
  buildColorScale,
  CATEGORY_COLORS,
  EMPTY_COLOR_SCALE,
  NEUTRAL_COLOR,
} from '../../src/lib/colors';

describe('buildColorScale', () => {
  it('gibt demselben Gewerk immer denselben Ton', () => {
    const scale = buildColorScale(['Betonarbeiten', 'Erdarbeiten', 'Malerarbeiten']);
    expect(scale.of('Erdarbeiten')).toBe(scale.of('Erdarbeiten'));
    expect(scale.of('Betonarbeiten')).not.toBe(scale.of('Erdarbeiten'));
  });

  it('vergibt die Töne in der übergebenen Reihenfolge', () => {
    const scale = buildColorScale(['A', 'B']);
    expect(scale.entries).toEqual([
      ['A', CATEGORY_COLORS[0]],
      ['B', CATEGORY_COLORS[1]],
    ]);
  });

  it('läuft bei mehr Werten als Tönen um, statt Zwischentöne zu erfinden', () => {
    const values = Array.from({ length: CATEGORY_COLORS.length + 2 }, (_, i) => `G${i}`);
    const scale = buildColorScale(values);
    expect(scale.entries).toHaveLength(values.length);
    expect(scale.of('G0')).toBe(scale.of(`G${CATEGORY_COLORS.length}`));
    expect(new Set(scale.entries.map(([, color]) => color)).size).toBe(CATEGORY_COLORS.length);
  });

  it('zählt Wiederholungen und Leerwerte nicht mit', () => {
    const scale = buildColorScale(['A', 'A', '', 'B']);
    expect(scale.entries.map(([value]) => value)).toEqual(['A', 'B']);
  });

  it('gibt unbekannten Werten und `null` den farblosen Ton', () => {
    const scale = buildColorScale(['A']);
    expect(scale.of('unbekannt')).toBe(NEUTRAL_COLOR);
    expect(scale.of(null)).toBe(NEUTRAL_COLOR);
    expect(EMPTY_COLOR_SCALE.of('A')).toBe(NEUTRAL_COLOR);
  });
});
