// jsdom rechnet kein Layout: der Graph misst sich mit 0×0, passt sich nie ein und
// zeichnet nur, was zufällig am Ursprung liegt. Hier bekommt nur die Graph-Fläche
// eine feste Größe; alle anderen Elemente messen weiter wie jsdom.

import { afterAll, beforeAll } from 'vitest';

export function giveGraphASize(width = 1200, height = 800): void {
  const original = Element.prototype.getBoundingClientRect;
  beforeAll(() => {
    Element.prototype.getBoundingClientRect = function rect(this: Element): DOMRect {
      if (!this.getAttribute('aria-label')?.startsWith('Bubble-Graph')) {
        return original.call(this);
      }
      return {
        width,
        height,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
  });
  afterAll(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}
