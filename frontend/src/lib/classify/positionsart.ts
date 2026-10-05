// Positionsart aus Stichworten (Mappingtabelle, Dimension `positionsart`) und
// Einheit. Bewusst klein und nicht-normativ (docs/domain/README.md) — im Zweifel
// "sonstige" statt raten.

import { matchTextOf, type DimensionMatch, type MappingIndex } from './mapping';
import type { NormalizedItem } from './text';
import { isPositionsart, type Positionsart } from './types';

/** Einheiten, die auf eine physische Bauleistung deuten (Länge/Fläche/Volumen/Masse/Stück). */
const BAUTEIL_UNITS = new Set([
  'm',
  'm2',
  'm²',
  'm3',
  'm³',
  'mm',
  'cm',
  'km',
  'stk',
  'st',
  'stck',
  'stück',
  'psch',
  't',
  'to',
  'kg',
  'l',
]);

const ZEIT_UNITS = new Set(['h', 'std', 'std.', 'min', 'd', 'tag', 'wo', 'mon', 'mt']);

/**
 * Positionsart bestimmen. Reihenfolge ist Absicht: explizite Stichworte (Gewicht in
 * der Tabelle: Baustelleneinrichtung, Personal, Planung, Nebenleistung) schlagen die
 * Einheiten-Heuristik, weil "Stundenlohnarbeiten … m³" sonst als Bauteil durchginge.
 * Der Abgleich läuft nur auf dem benennenden Text — siehe subjectText().
 */
export interface PositionsartErgebnis {
  positionsart: Positionsart;
  /** Der Stichwort-Treffer, falls er entschieden hat; bei der Einheit `null`. */
  treffer: DimensionMatch | null;
}

export function detectPositionsart(
  item: NormalizedItem,
  mapping: MappingIndex,
): PositionsartErgebnis {
  const hit = mapping.match('positionsart', [matchTextOf(item)]);
  if (hit !== null && isPositionsart(hit.code)) return { positionsart: hit.code, treffer: hit };

  const unit = item.unit;
  const byUnit: Positionsart =
    unit !== null && ZEIT_UNITS.has(unit)
      ? 'personal'
      : unit !== null && BAUTEIL_UNITS.has(unit)
        ? 'bauteil'
        : 'sonstige';
  return { positionsart: byUnit, treffer: null };
}
