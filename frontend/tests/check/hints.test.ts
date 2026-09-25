// Hinweise je Position (WP-R, R1). Der Graph fragt die Prüfergebnisse in der
// Gegenrichtung ab: nicht „welche Positionen fand Regel V4?", sondern „was
// steckt an dieser Position?".

import { describe, expect, it } from 'vitest';
import { groupByRule, hintsByPosition } from '../../src/lib/check';
import type { CheckResult, Flag } from '../../src/lib/check';

function flag(id: string, positionId: string, severity: Flag['severity']): Flag {
  return {
    id,
    category: 'vob',
    severity,
    positionId,
    title: `${id} an ${positionId}`,
  };
}

function result(...flags: Flag[]): CheckResult {
  return { flags, rules: [] };
}

describe('hintsByPosition', () => {
  it('sammelt alle Funde einer Position', () => {
    const hints = hintsByPosition(
      result(flag('V1', 'p1', 'hinweis'), flag('V4', 'p1', 'hinweis'), flag('V1', 'p2', 'hinweis')),
    );
    expect(hints.get('p1')?.flags).toHaveLength(2);
    expect(hints.get('p2')?.flags).toHaveLength(1);
  });

  it('nennt den schwersten Fund als Schwere der Position', () => {
    const hints = hintsByPosition(
      result(flag('V1', 'p1', 'hinweis'), flag('V4', 'p1', 'beachten')),
    );
    expect(hints.get('p1')?.severity).toBe('beachten');
  });

  it('bleibt bei „hinweis", solange nichts Schwereres dabei ist', () => {
    const hints = hintsByPosition(result(flag('V1', 'p1', 'hinweis')));
    expect(hints.get('p1')?.severity).toBe('hinweis');
  });

  it('lässt Positionen ohne Fund weg, statt sie leer zu führen', () => {
    const hints = hintsByPosition(result(flag('V1', 'p1', 'hinweis')));
    expect(hints.has('p2')).toBe(false);
    expect(hints.size).toBe(1);
  });

  it('überspringt abgeschaltete Regeln — ein Filterzustand, alle Ansichten', () => {
    const hints = hintsByPosition(
      result(flag('V1', 'p1', 'beachten'), flag('V4', 'p1', 'hinweis')),
      new Set(['V1']),
    );
    expect(hints.get('p1')?.flags.map((entry) => entry.id)).toEqual(['V4']);
    // Die abgeschaltete Regel war die schwerere — sie darf die Farbe nicht mehr setzen.
    expect(hints.get('p1')?.severity).toBe('hinweis');
  });

  it('lässt eine Position ganz weg, wenn ihre einzige Regel abgeschaltet ist', () => {
    const hints = hintsByPosition(result(flag('V1', 'p1', 'beachten')), new Set(['V1']));
    expect(hints.size).toBe(0);
  });
});

describe('groupByRule', () => {
  it('bündelt nach Regel und behält deren Reihenfolge', () => {
    const groups = groupByRule([
      flag('V4', 'p1', 'hinweis'),
      flag('V1', 'p1', 'hinweis'),
      flag('V4', 'p1', 'hinweis'),
    ]);
    expect(groups.map(([id, flags]) => [id, flags.length])).toEqual([
      ['V4', 2],
      ['V1', 1],
    ]);
  });
});
