// Positionsart aus Stichworten (Mappingtabelle, Dimension `positionsart`) und
// Einheit. Bewusst klein und nicht-normativ (docs/domain/README.md) — im Zweifel
// "sonstige" statt raten.

import { matchTextOf, type MappingIndex } from './mapping';
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
export function detectPositionsart(item: NormalizedItem, mapping: MappingIndex): Positionsart {
  const hit = mapping.match('positionsart', [matchTextOf(item)]);
  if (hit !== null && isPositionsart(hit.code)) return hit.code;

  const unit = item.unit;
  if (unit !== null && ZEIT_UNITS.has(unit)) return 'personal';
  if (unit !== null && BAUTEIL_UNITS.has(unit)) return 'bauteil';
  return 'sonstige';
}
