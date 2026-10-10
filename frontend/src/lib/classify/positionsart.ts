// Heuristischer Fallback für Stufe 0: Positionsart aus Stichworten/Einheit, wenn
// der STLB-Referenzkatalog keinen Leistungsbereich liefert. Bewusst klein und
// nicht-normativ (docs/domain/README.md) — im Zweifel "sonstige" statt raten.

import { containsAny, subjectText, type NormalizedItem } from './text';
import type { Positionsart } from './types';
import {
  GUTACHTEN_WORTE,
  STUNDENLOHN_WORTE,
  VORHALTEN_WORTE,
  WERKPLANUNG_WORTE,
} from './vocabulary';

const BAUSTELLENEINRICHTUNG = [
  'baustelleneinrichtung',
  'baustelle einrichten',
  'baustelle räumen',
  'bauzaun',
  'baustrom',
  'bauwasser',
  'baustellenverkehr',
  'bürocontainer',
  'aufenthaltscontainer',
  'sanitärcontainer',
  'krananlage',
  'turmdrehkran',
  'sicherheitseinrichtung',
];

const PERSONAL = [
  ...STUNDENLOHN_WORTE,
  'vorarbeiter',
  'facharbeiter',
  'werker',
  'polier',
  'bauhelfer',
];

const PLANUNG = [
  ...WERKPLANUNG_WORTE,
  'werk- und montageplanung',
  'schalplanung',
  'bewehrungsplanung',
  'statische berechnung',
  'statischer nachweis',
  'standsicherheitsnachweis',
  'nachweisführung',
  ...GUTACHTEN_WORTE,
  'aufmaß erstellen',
];

const NEBENLEISTUNG = [
  'nebenleistung',
  'besondere leistung',
  ...VORHALTEN_WORTE,
  'andienung',
  'baustellendokumentation',
  'schlussreinigung',
  'bauendreinigung',
];

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
 * Positionsart ohne LB-Treffer bestimmen. Reihenfolge ist Absicht: explizite
 * Stichworte schlagen die Einheiten-Heuristik, weil "Stundenlohnarbeiten … m³"
 * sonst als Bauteil durchginge.
 */
export function detectPositionsart(item: NormalizedItem): Positionsart {
  // Nur der benennende Text — siehe subjectText().
  const subject = subjectText(item);
  if (containsAny(subject, BAUSTELLENEINRICHTUNG)) return 'baustelleneinrichtung';
  if (containsAny(subject, PERSONAL)) return 'personal';
  if (containsAny(subject, PLANUNG)) return 'planung';
  if (containsAny(subject, NEBENLEISTUNG)) return 'nebenleistung';

  const unit = item.unit;
  if (unit !== null && ZEIT_UNITS.has(unit)) return 'personal';
  if (unit !== null && BAUTEIL_UNITS.has(unit)) return 'bauteil';
  return 'sonstige';
}
