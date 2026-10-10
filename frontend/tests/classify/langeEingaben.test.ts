// Sehr lange, ungewöhnliche Langtexte (Issue #108, Anschluss an #89). Ein Muster
// ohne Anker kann bei langen Wiederholungen quadratisch langsam werden und die
// Klassifizierung minutenlang blockieren. Geprüft werden alle Extraktoren auf
// einmal, mit Eingaben, die genau die Anfänge ihrer Muster wiederholen.
//
// Die Grenze ist großzügig, damit ein langsamer CI-Runner den Test nicht rot
// färbt; ein quadratisches Muster brauchte bei dieser Länge Sekunden.

import { describe, expect, it } from 'vitest';
import { runExtractors } from '../../src/lib/classify/extractors';
import { extractKeywords } from '../../src/lib/classify/keywords';
import { normalizeItem } from '../../src/lib/classify/text';
import { escapeRegExp } from '../../src/lib/escapeRegExp';
import type { ExtractorContext } from '../../src/lib/classify/extractors';

const GRENZE_MS = 2000;

function context(longText: string): ExtractorContext {
  return {
    shortText: '',
    longText,
    unit: null,
    text: normalizeItem({ shortText: '', longText, unit: null }),
    catalog: [],
  };
}

const FORMEN: Record<string, string> = {
  ziffern: '1'.repeat(50_000),
  leerzeichen: `Wand${' '.repeat(50_000)}cm`,
  punkte: '.'.repeat(50_000),
  unterstriche: '_'.repeat(50_000),
  normAnfaenge: 'DIN EN '.repeat(8_000),
  verweisAnfaenge: 'siehe '.repeat(8_000),
  positionsverweise: 'siehe Pos. 01.'.repeat(4_000),
  fristAnfaenge: 'bis zum '.repeat(8_000),
  datumsteile: '12.'.repeat(20_000),
  masseOhneEinheit: 'd = '.repeat(12_000),
};

describe('Extraktoren bei sehr langen Eingaben', () => {
  for (const [name, text] of Object.entries(FORMEN)) {
    it(`bleibt schnell: ${name}`, () => {
      const start = performance.now();
      const result = runExtractors(context(text));
      extractKeywords(normalizeItem({ shortText: '', longText: text, unit: null }));
      expect(performance.now() - start).toBeLessThan(GRENZE_MS);
      // Fundstellen müssen im Text liegen, auch bei solchen Eingaben.
      for (const span of result.spans) {
        expect(span.start).toBeGreaterThanOrEqual(0);
        expect(span.end).toBeLessThanOrEqual(text.length);
      }
    });
  }
});

describe('escapeRegExp', () => {
  it('macht jedes Sonderzeichen wörtlich', () => {
    const sonderzeichen = '.*+?^${}()|[]\\';
    const muster = new RegExp(`^${escapeRegExp(sonderzeichen)}$`);
    expect(muster.test(sonderzeichen)).toBe(true);
    expect(muster.test('x'.repeat(sonderzeichen.length))).toBe(false);
  });

  it('bleibt bei einem Suchbegriff mit Sonderzeichen schnell', () => {
    // Ohne Maskierung wäre „(a+)+" ein Muster mit katastrophalem Backtracking.
    const begriff = '(a+)+'.repeat(1_000);
    const text = `${'a'.repeat(50_000)}!`;
    const start = performance.now();
    expect(new RegExp(escapeRegExp(begriff), 'gi').test(text)).toBe(false);
    expect(performance.now() - start).toBeLessThan(GRENZE_MS);
  });
});
