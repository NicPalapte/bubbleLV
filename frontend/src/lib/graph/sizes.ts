// Größe der Positionen im Graphen. Gruppen messen immer die Anzahl ihrer
// Positionen (constants.ts, `groupRadius`); die Wahl hier betrifft nur die Punkte.
//
// Mengen werden nur innerhalb derselben Einheit verglichen
// (docs/decisions/0019-mengen-nur-je-einheit.md): jede Position misst sich an der
// größten Menge ihrer Einheit. Pauschalen und Positionen ohne Menge haben nichts
// zu vergleichen und bleiben beim Grundradius.

import { POSITION_R, POSITION_R_MAX, POSITION_R_MIN } from './constants';
import { canonicalUnit, unitSpelling } from '../units';
import type { PositionIndex } from '../index/positionIndex';

export type SizeModeId = 'uniform' | 'quantity' | 'cost';

export const SIZE_MODES: ReadonlyArray<{ id: SizeModeId; label: string; title: string }> = [
  { id: 'uniform', label: 'gleich', title: 'Alle Positionen gleich groß' },
  { id: 'quantity', label: 'Menge', title: 'Menge, verglichen nur innerhalb derselben Einheit' },
  { id: 'cost', label: 'Preis', title: 'Gesamtpreis der Position' },
];

/** Schreibweisen der Pauschale — eine Menge „1 psch" sagt nichts über die Größe. */
const PAUSCHAL = new Set(['psch', 'pausch', 'pauschal', 'pschl', 'pa']);

export function isPauschal(unit: string | null): boolean {
  const spelling = unitSpelling(unit);
  return spelling !== null && PAUSCHAL.has(spelling.replace(/\.$/, ''));
}

function scaled(value: number, max: number): number {
  return POSITION_R_MIN + (POSITION_R_MAX - POSITION_R_MIN) * Math.sqrt(value / max);
}

/** Radius je Indexeintrag. Fällt `cost` mangels Preisen aus, sind alle gleich. */
export function positionRadii(index: PositionIndex, mode: SizeModeId): Float64Array {
  const radii = new Float64Array(index.size).fill(POSITION_R);
  if (mode === 'uniform') return radii;

  if (mode === 'cost') {
    let max = 0;
    for (let i = 0; i < index.size; i++) max = Math.max(max, index.totalPrice[i]);
    if (max <= 0) return radii;
    for (let i = 0; i < index.size; i++) {
      const value = index.totalPrice[i];
      radii[i] = value > 0 ? scaled(value, max) : POSITION_R_MIN;
    }
    return radii;
  }

  const units = new Array<string | null>(index.size);
  const maxByUnit = new Map<string, number>();
  for (let i = 0; i < index.size; i++) {
    const raw = index.positions[i].unit;
    const unit = isPauschal(raw) ? null : canonicalUnit(raw);
    units[i] = unit;
    const value = index.quantity[i];
    if (unit === null || !(value > 0)) continue;
    maxByUnit.set(unit, Math.max(maxByUnit.get(unit) ?? 0, value));
  }
  for (let i = 0; i < index.size; i++) {
    const unit = units[i];
    const value = index.quantity[i];
    if (unit === null || !(value > 0)) continue;
    radii[i] = scaled(value, maxByUnit.get(unit) ?? value);
  }
  return radii;
}
