import { describe, expect, it } from 'vitest';
import { FACETS_BY_ID } from '../../src/lib/facets';
import { countActiveFilters, EMPTY_FILTERS, matchPos, type Filters } from '../../src/lib/matchPos';
import type { PositionSummary } from '../../src/types/lvNode';

function pos(overrides: Partial<PositionSummary> = {}): PositionSummary {
  return {
    oz: '001.0010',
    shortText: 'Stahlbetonwand',
    longText: 'Tragende Wand aus C30/37, Expositionsklassen XC2 und XD1.',
    unit: 'm3',
    quantity: 120,
    unitPrice: 180,
    positionType: 'NORMAL',
    attributes: {
      positionsart: 'bauteil',
      gewerk: 'Beton- und Stahlbetonarbeiten',
      gewerkLb: '013',
      bauteiltyp: 'Wand',
      beton: 'C30/37',
      expo: ['XC2', 'XD1'],
      keywords: ['WU-Beton'],
    },
    ...overrides,
  };
}

function filters(facets: Record<string, string[]>, menge: [number, number] | null = null): Filters {
  return {
    facets: Object.fromEntries(
      Object.entries(facets).map(([key, values]) => [key, new Set(values)]),
    ),
    menge,
  };
}

describe('matchPos', () => {
  it('lässt ohne Filter und Suche alles durch', () => {
    expect(matchPos(pos(), EMPTY_FILTERS, '')).toBe(true);
  });

  it('filtert über Klassifizierungs-Facetten', () => {
    expect(matchPos(pos(), filters({ bauteiltyp: ['Wand'] }), '')).toBe(true);
    expect(matchPos(pos(), filters({ bauteiltyp: ['Decke'] }), '')).toBe(false);
    expect(matchPos(pos(), filters({ positionsart: ['bauteil'] }), '')).toBe(true);
    expect(matchPos(pos(), filters({ positionsart: ['personal'] }), '')).toBe(false);
  });

  it('behandelt Listenwerte als ODER innerhalb der Facette', () => {
    expect(matchPos(pos(), filters({ expo: ['XD1'] }), '')).toBe(true);
    expect(matchPos(pos(), filters({ expo: ['XF3'] }), '')).toBe(false);
    expect(matchPos(pos(), filters({ expo: ['XF3', 'XC2'] }), '')).toBe(true);
  });

  it('verknüpft verschiedene Facetten als UND', () => {
    expect(matchPos(pos(), filters({ bauteiltyp: ['Wand'], einheit: ['m3'] }), '')).toBe(true);
    expect(matchPos(pos(), filters({ bauteiltyp: ['Wand'], einheit: ['m2'] }), '')).toBe(false);
  });

  it('filtert die GAEB-Positionsart (NORMAL/ALTERNATIV/BEDARF/ZULAGENPOSITION)', () => {
    expect(matchPos(pos(), filters({ positionstyp: ['NORMAL'] }), '')).toBe(true);
    expect(matchPos(pos({ positionType: 'BEDARF' }), filters({ positionstyp: ['NORMAL'] }), '')).toBe(
      false,
    );
    expect(matchPos(pos({ positionType: 'BEDARF' }), filters({ positionstyp: ['BEDARF'] }), '')).toBe(
      true,
    );
  });

  it('grenzt über den Mengenbereich ein', () => {
    expect(matchPos(pos(), filters({}, [100, 200]), '')).toBe(true);
    expect(matchPos(pos(), filters({}, [0, 50]), '')).toBe(false);
    expect(matchPos(pos({ quantity: null }), filters({}, [1, 10]), '')).toBe(false);
  });

  it('sucht in Kurztext, OZ, Langtext und Betongüte', () => {
    expect(matchPos(pos(), EMPTY_FILTERS, 'stahlbeton')).toBe(true);
    expect(matchPos(pos(), EMPTY_FILTERS, '001.0010')).toBe(true);
    expect(matchPos(pos(), EMPTY_FILTERS, 'expositionsklassen')).toBe(true);
    expect(matchPos(pos(), EMPTY_FILTERS, 'c30/37')).toBe(true);
    expect(matchPos(pos(), EMPTY_FILTERS, 'estrich')).toBe(false);
  });

  it('zählt aktive Filter inklusive Mengenbereich', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters(filters({ expo: ['XC2', 'XD1'] }, [1, 2]))).toBe(3);
  });

  it('liefert je Facette die Werte der Position', () => {
    const facet = FACETS_BY_ID.get('gewerk');
    expect(facet?.get(pos())).toEqual(['Beton- und Stahlbetonarbeiten']);
    expect(FACETS_BY_ID.get('status')?.get(pos())).toEqual(['offen']);
  });
});
