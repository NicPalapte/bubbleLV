import { describe, expect, it } from 'vitest';
import { formatWhen } from '../../src/lib/format';

describe('formatWhen', () => {
  const now = new Date(2026, 9, 12, 0, 10).getTime();

  it('zählt Kalendertage, nicht 24 Stunden', () => {
    expect(formatWhen(new Date(2026, 9, 12, 0, 5).getTime(), now)).toBe('heute 00:05');
    expect(formatWhen(new Date(2026, 9, 11, 23, 50).getTime(), now)).toBe('gestern 23:50');
  });

  it('zeigt ältere Tage als Datum', () => {
    expect(formatWhen(new Date(2026, 9, 8, 16, 42).getTime(), now)).toBe('08.10.2026');
  });
});
