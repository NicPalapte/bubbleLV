// Einheiten im Filter zusammenführen — in zwei Stufen:
//  1. Schreibweise (Groß-/Kleinschreibung, Leerraum, hochgestellte Ziffern) —
//     objektiv, steht im Code.
//  2. Inhaltliche Gruppen ("Stk" = "Stück") — Fachaussage, steht in
//     docs/domain/reference/einheiten-gruppen.csv.
// "lfm" und "m" bleiben in beiden Stufen getrennt: eine Abrechnungsart ist
// keine Schreibweise.

import { describe, expect, it } from 'vitest';
import { FACETS_BY_ID, facetOptionLabel } from '../../src/lib/facets';
import { canonicalUnit, unitGroups, unitLabel, unitSpelling } from '../../src/lib/units';
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

  it('führt die gepflegten Gruppen zusammen', () => {
    expect(canonicalUnit('Stk')).toBe(canonicalUnit('Stück'));
    expect(canonicalUnit('stck')).toBe(canonicalUnit('St'));
    expect(canonicalUnit('to')).toBe(canonicalUnit('t'));
    expect(canonicalUnit('h')).toBe(canonicalUnit('Std'));
    expect(canonicalUnit('Stunden')).toBe(canonicalUnit('h'));
  });

  it('nimmt die Gruppen aus der Referenzdatei, nicht aus dem Code', () => {
    const namen = unitGroups().map((gruppe) => gruppe.name);
    expect(namen).toEqual(expect.arrayContaining(['Stück', 'Tonne', 'Stunde']));
  });

  it('trennt Schreibweise und Gruppe sauber', () => {
    // Stufe 1 kennt keine Gruppen — "stk" bleibt "stk".
    expect(unitSpelling('Stk')).toBe('stk');
    expect(unitSpelling('Stück')).toBe('stück');
    // Erst Stufe 2 legt beide zusammen.
    expect(canonicalUnit('Stk')).toBe('Stück');
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
