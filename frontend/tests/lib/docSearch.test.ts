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
});
