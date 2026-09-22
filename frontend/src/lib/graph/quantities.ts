// Mengen für den Größenmodus „Menge" (WP-Q, Schritt 4; Issue #51).
//
// Warum nicht einfach ein Aggregat am Baum wie `totalPrice`: Mengen sind nur
// innerhalb **einer** Einheit vergleichbar. 300 m³ Beton und 300 Stück Anker
// zu einer Zahl zu addieren ergibt nichts, was man in eine Bubble schreiben
// könnte. Der Modus steht deshalb nur zur Wahl, solange die gefilterte Menge
// genau eine Einheit enthält — und gerechnet wird dann auch nur über die
// Treffer, nicht über das ganze LV.

import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

export interface FilteredQuantities {
  /**
   * Die eine Einheit der gefilterten Menge, bereits als Anzeigename;
   * `null`, sobald mehrere (oder keine) vorkommen.
   */
  unit: string | null;
  /**
   * Summe der Mengen je Knoten — Position, Abschnitt, Los, Projekt. `null`,
   * solange der Modus „Menge" nicht aktiv ist: dann rechnet niemand.
   */
  byNode: ReadonlyMap<string, number> | null;
}

export const NO_QUANTITIES: FilteredQuantities = { unit: null, byNode: null };

/**
 * Die eine Einheit der gefilterten Menge oder `null`. Bricht ab, sobald eine
 * zweite auftaucht — bei 10k Positionen ist das der Normalfall und kostet
 * dann nichts.
 */
export function singleUnit(index: PositionIndex, mask: Uint8Array): string | null {
  let found: string | null = null;
  for (let i = 0; i < index.size; i++) {
    if (mask[i] !== 1) continue;
    const unit = canonicalUnit(index.positions[i].unit);
    if (unit === null) continue;
    if (found === null) {
      found = unit;
      continue;
    }
    if (found !== unit) return null;
  }
  return found === null ? null : unitLabel(found);
}

/**
 * Mengensumme je Knoten über die Treffer. Jede Position trägt ihre Menge zu
 * sich selbst und zu jedem Knoten über ihr bei; Positionen ohne Menge tragen
 * nichts bei (nicht 0 — eine fehlende Menge ist keine Menge von null).
 */
export function quantitiesByNode(
  index: PositionIndex,
  mask: Uint8Array,
  parents: ReadonlyMap<string, LVNode | null>,
): ReadonlyMap<string, number> {
  const byNode = new Map<string, number>();
  for (let i = 0; i < index.size; i++) {
    if (mask[i] !== 1) continue;
    const value = index.quantity[i];
    if (!Number.isFinite(value)) continue;
    let id: string | null = index.nodes[i].id;
    while (id !== null) {
      byNode.set(id, (byNode.get(id) ?? 0) + value);
      id = parents.get(id)?.id ?? null;
    }
  }
  return byNode;
}
