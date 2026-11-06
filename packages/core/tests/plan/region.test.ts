// Fläche per Antippen finden (Entscheidung 0095): Füllen, Rand nachfahren, vereinfachen.

import { describe, expect, it } from 'vitest';
import { polygonArea } from '../../src/plan/measure';
import { findRegion, maskFromRgba, thicken, type LineMask } from '../../src/plan/region';

/** Maske aus Zeilen: `#` ist Linie, alles andere frei. */
function maskOf(rows: string[]): LineMask {
  const width = rows[0].length;
  const data = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) if (row[x] === '#') data[y * width + x] = 1;
  });
  return { width, height: rows.length, data };
}

/** Rahmen `w × h` mit Rand 1, darin frei; Rand des Bildes 2 frei. */
function room(w: number, h: number): LineMask {
  const rows: string[] = [];
  for (let y = 0; y < h + 4; y += 1) {
    let row = '';
    for (let x = 0; x < w + 4; x += 1) {
      const border =
        x >= 1 &&
        x <= w + 2 &&
        y >= 1 &&
        y <= h + 2 &&
        (x === 1 || x === w + 2 || y === 1 || y === h + 2);
      row += border ? '#' : '.';
    }
    rows.push(row);
  }
  return maskOf(rows);
}

describe('findRegion', () => {
  it('findet ein Rechteck als vier Ecken mit passender Fläche', () => {
    const found = findRegion(room(40, 20), 10, 10);
    expect(found?.open).toBe(false);
    expect(found?.pixels).toBe(40 * 20);
    expect(found?.polygon).toHaveLength(4);
    // Rand durch die Mitten der Randpunkte: (40−1) × (20−1).
    expect(polygonArea(found?.polygon ?? [])).toBeCloseTo(39 * 19);
  });
  it('findet ein L, Text im Raum stört nicht', () => {
    const found = findRegion(
      maskOf([
        '..........',
        '.########.',
        '.#......#.',
        '.#.##...#.',
        '.#......#.',
        '.#...####.',
        '.#...#....',
        '.#####....',
      ]),
      2,
      2,
      0.5,
    );
    expect(found?.open).toBe(false);
    expect(found?.polygon).toHaveLength(6);
  });
  it('meldet offen, wenn die Füllung den Bildrand erreicht', () => {
    const found = findRegion(maskOf(['....', '.#..', '....']), 0, 0);
    expect(found?.open).toBe(true);
  });
  it('auf einer Linie gibt es nichts', () => {
    expect(findRegion(maskOf(['.#.']), 1, 0)).toBeNull();
  });
});

describe('maskFromRgba und thicken', () => {
  it('dunkle Punkte sind Linie, durchsichtige frei', () => {
    const mask = maskFromRgba(3, 1, [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0]);
    expect([...mask.data]).toEqual([1, 0, 0]);
  });
  it('verdickt Linien und schließt kleine Lücken', () => {
    const gap = maskOf(['#.#']);
    expect([...thicken(gap, 1).data]).toEqual([1, 1, 1]);
  });
});
