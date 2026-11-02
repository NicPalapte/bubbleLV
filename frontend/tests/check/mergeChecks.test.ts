// Prüfung mit den Regeln dieser Firma (Entscheidungen 0089, 0090): Ergebnis aus dem Laden
// und neu gerechnete Regeln zusammensetzen.

import { describe, expect, it } from 'vitest';
import { mergeChecks } from '../../src/lib/check';
import type { CheckResult, Flag, RuleStatus } from '../../src/lib/check/types';

const flag = (id: string, positionId: string): Flag => ({ id, positionId }) as unknown as Flag;
const status = (id: string, count: number): RuleStatus => ({ id, count }) as unknown as RuleStatus;

const LOADED: CheckResult = {
  flags: [flag('a', 'p1'), flag('b', 'p2'), flag('c', 'p3')],
  rules: [status('a', 1), status('b', 1), status('c', 1)],
};

describe('mergeChecks', () => {
  it('ohne Änderung dasselbe Objekt', () => {
    expect(mergeChecks(LOADED, new Set(), null)).toBe(LOADED);
    expect(mergeChecks(LOADED, new Set(), { flags: [], rules: [] })).toBe(LOADED);
  });

  it('lässt abgeschaltete Regeln weg', () => {
    const merged = mergeChecks(LOADED, new Set(['b']), null);
    expect(merged.rules.map((rule) => rule.id)).toEqual(['a', 'c']);
    expect(merged.flags.map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('hängt eigene Regeln hinten an', () => {
    const merged = mergeChecks(LOADED, new Set(), {
      flags: [flag('eigen', 'p9')],
      rules: [status('eigen', 1)],
    });
    expect(merged.rules.map((rule) => rule.id)).toEqual(['a', 'b', 'c', 'eigen']);
    expect(merged.flags.map((f) => f.positionId)).toEqual(['p1', 'p2', 'p3', 'p9']);
  });

  it('ersetzt neu gerechnete Grundstock-Regeln an ihrer Stelle', () => {
    const merged = mergeChecks(LOADED, new Set(['c']), {
      flags: [flag('b', 'p7'), flag('b', 'p8')],
      rules: [status('b', 2)],
    });
    expect(merged.rules).toEqual([status('a', 1), status('b', 2)]);
    expect(merged.flags.map((f) => `${f.id}:${f.positionId}`)).toEqual(['a:p1', 'b:p7', 'b:p8']);
  });
});
