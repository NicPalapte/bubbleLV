// Einheiten im Filter zusammenführen. Zusammengeführt wird nur, was dieselbe
// Einheit anders **schreibt** — inhaltliche Gruppen ("Stk" = "Stück") sind eine
// Fachaussage und kommen mit WP-K aus einer gepflegten Liste, nicht von hier.

import { describe, expect, it } from 'vitest';
import { FACETS_BY_ID, facetOptionLabel } from '../../src/lib/facets';
import { canonicalUnit, unitLabel } from '../../src/lib/units';
import type { PositionSummary } from '../../src/types/lvNode';

function pos(unit: string | null): PositionSummary {
  return {
    oz: '01.0010',
    shortText: 'Position',
    longText: '',
    unit,
    quantity: 1,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
}

describe('canonicalUnit', () => {
  it('führt Groß-/Kleinschreibung zusammen', () => {
    expect(canonicalUnit('PSCH')).toBe('psch');
    expect(canonicalUnit('psch')).toBe('psch');
    expect(canonicalUnit('Psch')).toBe('psch');
  });

  it('führt hochgestellte Ziffern mit den flachen zusammen', () => {
    expect(canonicalUnit('m³')).toBe('m3');
    expect(canonicalUnit('m3')).toBe('m3');
    expect(canonicalUnit('M³')).toBe('m3');
    expect(canonicalUnit('m²')).toBe('m2');
  });

  it('ignoriert Leerraum um und in der Angabe', () => {
    expect(canonicalUnit('  m³ ')).toBe('m3');
    expect(canonicalUnit('m 3')).toBe('m3');
  });

  it('hält lfm und m auseinander — das ist keine Schreibweise', () => {
    expect(canonicalUnit('lfm')).toBe('lfm');
    expect(canonicalUnit('m')).toBe('m');
    expect(canonicalUnit('lfm')).not.toBe(canonicalUnit('m'));
  });

  it('rät keine inhaltlichen Gruppen (bleibt WP-K vorbehalten)', () => {
    expect(canonicalUnit('Stk')).not.toBe(canonicalUnit('Stück'));
    expect(canonicalUnit('to')).not.toBe(canonicalUnit('t'));
    expect(canonicalUnit('h')).not.toBe(canonicalUnit('Std'));
  });

  it('behandelt fehlende und leere Angaben als keine Einheit', () => {
    expect(canonicalUnit(null)).toBeNull();
    expect(canonicalUnit('')).toBeNull();
    expect(canonicalUnit('   ')).toBeNull();
  });
});

describe('unitLabel', () => {
  it('zeigt Flächen und Volumen in der üblichen Schreibweise', () => {
    expect(unitLabel('m2')).toBe('m²');
    expect(unitLabel('m3')).toBe('m³');
  });

  it('lässt alles andere, wie es ist', () => {
    expect(unitLabel('psch')).toBe('psch');
    expect(unitLabel('lfm')).toBe('lfm');
  });
});

describe('Facette „Einheit"', () => {
  const facet = FACETS_BY_ID.get('einheit')!;

  it('steckt unterschiedlich geschriebene Einheiten unter einen Wert', () => {
    expect(facet.get(pos('PSCH'))).toEqual(facet.get(pos('psch')));
    expect(facet.get(pos('m³'))).toEqual(facet.get(pos('m3')));
  });

  it('beschriftet den Wert lesbar', () => {
    expect(facetOptionLabel(facet, 'm3')).toBe('m³');
    expect(facetOptionLabel(facet, 'psch')).toBe('psch');
  });

  it('lässt eine Position ohne Einheit aus der Facette heraus', () => {
    expect(facet.get(pos(null))).toEqual([]);
  });
});
