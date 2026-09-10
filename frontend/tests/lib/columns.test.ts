// Spaltenkonfiguration der Positionstabelle (Issue #41): reine Funktionen,
// die Reihenfolge, Sichtbarkeit und Breite unveränderlich fortschreiben.

import { describe, expect, it } from 'vitest';
import {
  defaultColumnConfig,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  moveColumn,
  resizeColumn,
  toggleColumn,
  visibleColumnKeys,
} from '../../src/lib/table/columns';

const ORDER = ['oz', 'shortText', 'unit', 'quantity'];
const WIDTHS = { oz: 100, shortText: 200, unit: 60, quantity: 80 };
const LOCKED = new Set(['oz', 'shortText']);

describe('columns', () => {
  it('startet mit allen Spalten sichtbar in Vorgabereihenfolge', () => {
    const config = defaultColumnConfig(ORDER, WIDTHS);
    expect(visibleColumnKeys(config)).toEqual(ORDER);
    expect(config.widths.unit).toBe(60);
  });

  it('verschiebt eine Spalte um eine Stelle und stoppt am Rand', () => {
    const config = defaultColumnConfig(ORDER, WIDTHS);
    expect(moveColumn(config, 'unit', -1).order).toEqual(['oz', 'unit', 'shortText', 'quantity']);
    expect(moveColumn(config, 'quantity', 1)).toBe(config);
    expect(moveColumn(config, 'oz', -1)).toBe(config);
    expect(moveColumn(config, 'fremd', 1)).toBe(config);
    // Das Original bleibt unverändert.
    expect(config.order).toEqual(ORDER);
  });

  it('blendet Spalten aus und wieder ein, gesperrte nie', () => {
    const config = defaultColumnConfig(ORDER, WIDTHS);
    const hidden = toggleColumn(config, 'unit', LOCKED);
    expect(visibleColumnKeys(hidden)).toEqual(['oz', 'shortText', 'quantity']);
    // Die Reihenfolge merkt sich auch ausgeblendete Spalten.
    expect(hidden.order).toEqual(ORDER);
    expect(visibleColumnKeys(toggleColumn(hidden, 'unit', LOCKED))).toEqual(ORDER);
    expect(toggleColumn(config, 'oz', LOCKED)).toBe(config);
    expect(toggleColumn(config, 'fremd', LOCKED)).toBe(config);
  });

  it('begrenzt die Breite auf den erlaubten Bereich', () => {
    const config = defaultColumnConfig(ORDER, WIDTHS);
    expect(resizeColumn(config, 'unit', 10).widths.unit).toBe(MIN_COLUMN_WIDTH);
    expect(resizeColumn(config, 'unit', 5000).widths.unit).toBe(MAX_COLUMN_WIDTH);
    expect(resizeColumn(config, 'unit', 123.6).widths.unit).toBe(124);
    expect(resizeColumn(config, 'unit', 60)).toBe(config);
    expect(resizeColumn(config, 'fremd', 300)).toBe(config);
  });
});
