import { describe, expect, it } from 'vitest';
import {
  guessPageKind,
  polygonArea,
  polylineLength,
  ratioFromUnit,
  ratiosInText,
  unitFromDistance,
  unitFromRatio,
} from '../../src/plan/measure';

describe('polylineLength', () => {
  it('summiert die Teilstrecken', () => {
    expect(
      polylineLength([
        [0, 0],
        [3, 4],
        [3, 10],
      ]),
    ).toBe(11);
  });
  it('ist 0 bei weniger als zwei Punkten', () => {
    expect(polylineLength([[1, 1]])).toBe(0);
  });
});

describe('polygonArea', () => {
  it('rechnet die Fläche unabhängig von der Umlaufrichtung', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 5],
      [0, 5],
    ] as const;
    expect(polygonArea(square)).toBe(50);
    expect(polygonArea([...square].reverse())).toBe(50);
  });
  it('ist 0 unter drei Punkten', () => {
    expect(
      polygonArea([
        [0, 0],
        [1, 1],
      ]),
    ).toBe(0);
  });
});

describe('Maßstab', () => {
  it('1:100 in Originalgröße: 72 Einheiten (1 Zoll) sind 2,54 m', () => {
    expect(72 * unitFromRatio(100)).toBeCloseTo(2.54, 10);
    expect(ratioFromUnit(unitFromRatio(50))).toBeCloseTo(50, 10);
  });
  it('aus einer bekannten Strecke', () => {
    expect(unitFromDistance(200, 5)).toBe(0.025);
    expect(unitFromDistance(0, 5)).toBeNull();
    expect(unitFromDistance(200, 0)).toBeNull();
  });
});

describe('ratiosInText', () => {
  it('findet Maßstäbe hinter M oder Maßstab, häufigste zuerst', () => {
    expect(ratiosInText('Grundriss UG M 1:100 · Detail M. 1 : 20 · Schnitt M 1:100')).toEqual([
      100, 20,
    ]);
    expect(ratiosInText('Maßstab 1:50')).toEqual([50]);
  });
  it('übersieht Uhrzeiten, Verhältnisse und unübliche Zahlen', () => {
    expect(ratiosInText('Beginn 1:30 Uhr, Mischung 1:3, M 1:37')).toEqual([]);
  });
});

describe('guessPageKind', () => {
  it('A4 hoch mit Text ist Text', () => {
    expect(guessPageKind({ width: 595, height: 842, chars: 3000 })).toBe('text');
  });
  it('A1 ist Plan, auch mit viel Text', () => {
    expect(guessPageKind({ width: 2384, height: 1684, chars: 5000 })).toBe('plan');
  });
  it('A4 quer mit wenig Text ist Plan, mit viel Text nicht', () => {
    expect(guessPageKind({ width: 842, height: 595, chars: 300 })).toBe('plan');
    expect(guessPageKind({ width: 842, height: 595, chars: 4000 })).toBe('text');
  });
});
