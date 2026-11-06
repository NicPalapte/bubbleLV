// Auswahl per Fenster wie im CAD: links→rechts nur ganz drin, rechts→links auch berührt.

import { describe, expect, it } from 'vitest';
import {
  hitsWindow,
  selectInWindow,
  windowModeOf,
  windowOf,
  type SelectShape,
} from '../../src/plan/selectWindow';

const square = (x: number, y: number, size: number): SelectShape => ({
  points: [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ],
  closed: true,
});

describe('Fensterauswahl', () => {
  const w = windowOf([10, 10], [0, 0]);
  it('Richtung bestimmt die Art', () => {
    expect(windowModeOf([0, 0], [10, 10])).toBe('inside');
    expect(windowModeOf([10, 10], [0, 0])).toBe('crossing');
    expect(w).toEqual({ x0: 0, y0: 0, x1: 10, y1: 10 });
  });
  it('„inside“ nimmt nur, was ganz im Fenster liegt', () => {
    expect(hitsWindow(w, square(2, 2, 3), 'inside')).toBe(true);
    expect(hitsWindow(w, square(8, 8, 5), 'inside')).toBe(false);
  });
  it('„crossing“ nimmt auch Geschnittenes', () => {
    expect(hitsWindow(w, square(8, 8, 5), 'crossing')).toBe(true);
    // Linie quer durchs Fenster, beide Enden draußen.
    expect(
      hitsWindow(
        w,
        {
          points: [
            [-5, 5],
            [15, 5],
          ],
          closed: false,
        },
        'crossing',
      ),
    ).toBe(true);
    expect(
      hitsWindow(
        w,
        {
          points: [
            [20, 20],
            [30, 30],
          ],
          closed: false,
        },
        'crossing',
      ),
    ).toBe(false);
  });
  it('Fenster ganz in einer Fläche berührt sie, nicht aber einen Linienzug', () => {
    expect(hitsWindow(w, square(-10, -10, 40), 'crossing')).toBe(true);
    const open = { ...square(-10, -10, 40), closed: false };
    expect(hitsWindow(w, open, 'crossing')).toBe(false);
  });
  it('liefert die Kennungen der Treffer', () => {
    const shapes = [
      { id: 'a', ...square(1, 1, 2) },
      { id: 'b', ...square(9, 9, 5) },
    ];
    expect(selectInWindow(w, shapes, 'inside')).toEqual(['a']);
    expect(selectInWindow(w, shapes, 'crossing')).toEqual(['a', 'b']);
  });
});

describe('lose Punkte', () => {
  it('zählt im Kreuzen nur Punkte im Fenster, keine Linie dazwischen', () => {
    const w = windowOf([4, 4], [6, 6]);
    const shape: SelectShape = {
      points: [
        [0, 5],
        [10, 5],
      ],
      closed: false,
      loose: true,
    };
    expect(hitsWindow(w, shape, 'crossing')).toBe(false);
    expect(hitsWindow(w, { ...shape, loose: false }, 'crossing')).toBe(true);
  });
});
