// Rückfallregel der Größenmodi (WP-Q, Schritt 4): ein Maß, das für die geladene
// Datei oder den aktiven Filter nichts aussagt, fällt auf „Anzahl" zurück.
// Größe **und** Sortierung lesen dieselbe Regel — sonst ordnete der Graph nach
// einer Zahl, die er daneben gar nicht mehr zeigt.

import { describe, expect, it } from 'vitest';
import { effectiveSizeMode } from '../../src/lib/graph/constants';

describe('effectiveSizeMode', () => {
  it('lässt ein tragendes Maß stehen', () => {
    expect(effectiveSizeMode('cost', { priceless: false, unit: null })).toBe('cost');
    expect(effectiveSizeMode('quantity', { priceless: true, unit: 'm³' })).toBe('quantity');
    expect(effectiveSizeMode('count', { priceless: true, unit: null })).toBe('count');
    expect(effectiveSizeMode('uniform', { priceless: true, unit: null })).toBe('uniform');
  });

  it('fällt bei einer Datei ohne Preise von „Gesamtpreis" zurück', () => {
    expect(effectiveSizeMode('cost', { priceless: true, unit: 'm³' })).toBe('count');
  });

  it('fällt bei gemischten Einheiten von „Menge" zurück', () => {
    // Genau der Fall aus docs/decisions/0019: erst auf m³ gefiltert und „Menge"
    // gewählt, dann den Filter geweitet — der Modus bleibt im Zustand stehen.
    expect(effectiveSizeMode('quantity', { priceless: false, unit: null })).toBe('count');
  });
});
