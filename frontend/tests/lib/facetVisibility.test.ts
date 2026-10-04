// Filter „Material" ist ausgeblendet, solange er keine Werte hat (Issue #99).
// Die Werte kommen nur aus der Spalte `keywords` des STLB-Katalogs
// (docs/decisions/0011); ist sie leer, wäre der Knopf ein Dropdown mit
// „Keine Werte" und ohne jede Erklärung.

import { describe, expect, it } from 'vitest';
import { FACETS, FACETS_BY_ID, isFacetVisible } from '../../src/lib/facets';

const OHNE_WERTE = new Map<string, number>();
const MIT_WERTEN = new Map([['Stahlbeton', 3]]);

describe('isFacetVisible', () => {
  it('blendet Material ohne Werte aus', () => {
    const material = FACETS_BY_ID.get('material')!;
    expect(isFacetVisible(material, OHNE_WERTE)).toBe(false);
    expect(isFacetVisible(material, undefined)).toBe(false);
  });

  it('zeigt Material, sobald es Werte gibt', () => {
    expect(isFacetVisible(FACETS_BY_ID.get('material')!, MIT_WERTEN)).toBe(true);
  });

  it('zeigt Material trotzdem, solange ein Wert gewählt ist', () => {
    // Ein Teilen-Link kann `f.material=Beton` setzen, bevor es eine Liste gibt. Ein
    // aktiver, aber unsichtbarer Filter versteckt Treffer ohne erkennbaren Grund.
    const material = FACETS_BY_ID.get('material')!;
    expect(isFacetVisible(material, OHNE_WERTE, true)).toBe(true);
    expect(isFacetVisible(material, undefined, true)).toBe(true);
    expect(isFacetVisible(material, OHNE_WERTE, false)).toBe(false);
  });

  it('lässt alle anderen Filter auch ohne Werte stehen', () => {
    // Ein leerer „Exposition"-Filter sagt etwas: dieses LV nennt keine. Nur Material
    // fehlt aus einem Grund, der nicht an der Datei liegt (fehlende Referenzliste).
    for (const facet of FACETS.filter((f) => f.id !== 'material')) {
      expect(isFacetVisible(facet, OHNE_WERTE), facet.id).toBe(true);
    }
  });

  it('kennt genau einen ausgeblendeten Filter', () => {
    expect(FACETS.filter((f) => f.hideWhenEmpty === true).map((f) => f.id)).toEqual(['material']);
  });
});
