import { describe, expect, it } from 'vitest';
import { docNeedleOf, hitsInPage } from '../../src/lib/docs/docSearch';

describe('docSearch', () => {
  it('fasst Leerraum zusammen, ignoriert Groß/klein und zu kurze Begriffe', () => {
    expect(docNeedleOf('  WU-\n Beton ')).toBe('wu- beton');
    expect(docNeedleOf('a')).toBe('');
  });

  it('findet alle Vorkommen mit Lage und Originaltext', () => {
    expect(hitsInPage('Beton, beton, BETON', 'beton', 4)).toEqual([
      { page: 4, start: 0, text: 'Beton' },
      { page: 4, start: 7, text: 'beton' },
      { page: 4, start: 14, text: 'BETON' },
    ]);
    expect(hitsInPage('Beton', '', 1)).toEqual([]);
  });

  it('findet einen Begriff über Zeilen, auch wenn im Seitentext Leerraum fehlt oder doppelt ist', () => {
    const needle = docNeedleOf('Bitumen\ndickbeschichtung  WU-Beton');
    expect(hitsInPage('…Bitumendickbeschichtung WU-Beton', needle, 1)).toEqual([
      { page: 1, start: 1, text: 'Bitumendickbeschichtung WU-Beton' },
    ]);
    expect(hitsInPage('Bitumen dickbeschichtungWU-Beton.', needle, 2)).toEqual([
      { page: 2, start: 0, text: 'Bitumen dickbeschichtungWU-Beton' },
    ]);
  });

  it('bleibt bei Emoji und Sonderzeichen an der richtigen Stelle', () => {
    expect(hitsInPage('a😀 beton', 'beton', 1)).toEqual([{ page: 1, start: 4, text: 'beton' }]);
    expect(hitsInPage('İ Beton', 'beton', 1)).toEqual([{ page: 1, start: 2, text: 'Beton' }]);
  });
});
