// isOverlayEvent: Überlagerungen am Graphen erkennen — auch, wenn das Ziel aus dem
// eigenen Browserfenster stammt (andere `Element`-Klasse, Entscheidung 0039).

import { describe, expect, it } from 'vitest';
import { isOverlayEvent } from '../../src/lib/graph/overlay';

describe('isOverlayEvent', () => {
  it('erkennt ein Ziel in einer markierten Überlagerung', () => {
    const wurzel = document.createElement('div');
    wurzel.setAttribute('data-graph-overlay', '');
    const knopf = document.createElement('button');
    wurzel.append(knopf);
    expect(isOverlayEvent(knopf)).toBe(true);
    expect(isOverlayEvent(document.createElement('span'))).toBe(false);
  });

  it('erkennt ein Ziel aus einem anderen Fenster ohne instanceof Element', () => {
    const fremd = { closest: (selector: string) => (selector.includes('overlay') ? {} : null) };
    expect(isOverlayEvent(fremd as unknown as EventTarget)).toBe(true);
  });

  it('gibt bei null und Zielen ohne closest false', () => {
    expect(isOverlayEvent(null)).toBe(false);
    expect(isOverlayEvent({} as EventTarget)).toBe(false);
  });
});
