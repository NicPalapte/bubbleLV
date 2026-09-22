// Merkmalszeilen des Vergleichs (WP-N, Schritt 2).

import { describe, expect, it } from 'vitest';
import { compareRows } from '../../src/lib/compare/rows';
import type { PositionSummary } from '../../src/types/lvNode';

function position(overrides: Partial<PositionSummary> = {}): PositionSummary {
  return {
    oz: '001.0010',
    shortText: 'Wand herstellen',
    longText: '',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand', beton: 'C25/30' },
    ...overrides,
  };
}

function row(rows: ReturnType<typeof compareRows>, key: string) {
  return rows.find((entry) => entry.key === key);
}

describe('compareRows', () => {
  it('stellt Menge, Einheitspreis und Gesamtpreis nach vorn', () => {
    const rows = compareRows([position(), position()]);
    expect(rows.slice(0, 3).map((entry) => entry.key)).toEqual([
      'menge',
      'einheitspreis',
      'gesamtpreis',
    ]);
    expect(row(rows, 'gesamtpreis')?.values[0]).toContain('1.000');
  });

  it('markiert nur die Zeilen, die sich unterscheiden', () => {
    const rows = compareRows([
      position(),
      position({ attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand', beton: 'C30/37' } }),
    ]);
    expect(row(rows, 'beton')?.differs).toBe(true);
    expect(row(rows, 'gewerk')?.differs).toBe(false);
    expect(row(rows, 'menge')?.differs).toBe(false);
  });

  it('zeigt ein Merkmal, das nur eine Seite führt — das ist der Unterschied', () => {
    const rows = compareRows([
      position(),
      position({ attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand' } }),
    ]);
    const beton = row(rows, 'beton');
    expect(beton?.values).toEqual(['C25/30', null]);
    expect(beton?.differs).toBe(true);
  });

  it('schreibt die Einheit nicht zweimal hin', () => {
    const rows = compareRows([position(), position()]);
    // Sie steht an der Menge — eine eigene Zeile wäre dieselbe Aussage, und
    // bei einer abweichenden Einheit stünden zwei Unterschiede statt einem.
    expect(row(rows, 'menge')?.values[0]).toContain('m³');
    expect(row(rows, 'einheit')).toBeUndefined();
  });

  it('gibt der Einheit eine eigene Zeile, wenn keine Menge dasteht', () => {
    const ohneMenge = position({ quantity: null });
    const rows = compareRows([ohneMenge, ohneMenge]);
    expect(row(rows, 'menge')).toBeUndefined();
    expect(row(rows, 'einheit')?.values[0]).toBe('m³');
  });

  it('zeigt die Einheit, wenn eine Spalte sie ohne Menge führt', () => {
    // Bedarfsposition: eigene Einheit, aber keine Menge. Ihre Menge-Zelle
    // bleibt leer — ohne eigene Zeile wäre ihre Einheit nirgends zu sehen und
    // der Unterschied zu m³ unsichtbar.
    const rows = compareRows([position(), position({ unit: 'm2', quantity: null })]);
    expect(row(rows, 'menge')?.values[1]).toBeNull();
    expect(row(rows, 'einheit')?.values).toEqual(['m³', 'm²']);
    expect(row(rows, 'einheit')?.differs).toBe(true);
  });

  it('lässt Zahlenzeilen weg, die keine Position führt', () => {
    const ohnePreis = position({ unitPrice: null });
    const rows = compareRows([ohnePreis, ohnePreis]);
    expect(row(rows, 'einheitspreis')).toBeUndefined();
    expect(row(rows, 'gesamtpreis')).toBeUndefined();
    expect(row(rows, 'menge')).toBeDefined();
  });

  it('gibt ohne Positionen nichts zurück', () => {
    expect(compareRows([])).toEqual([]);
  });
});
