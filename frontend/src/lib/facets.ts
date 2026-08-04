// Facetten-Definitionen. Die Werte entstehen dynamisch aus den geladenen Daten —
// ein neues Klassifizierungs-Attribut taucht automatisch als Filterwert auf
// (docs/architecture/data-model.md).

import { attrString, attrStrings } from './attributes';
import { POSITION_STATUS } from './status';
import type { PositionSummary } from '../types/lvNode';

export interface Facet {
  id: string;
  label: string;
  /** Alle Werte, unter denen die Position in dieser Facette einsortiert ist. */
  get(position: PositionSummary): string[];
  /** Anzeigename eines Werts, falls er vom Rohwert abweicht. */
  optionLabel?(value: string): string;
  sortValues?(values: string[]): string[];
}

const POSITIONSART_LABELS: Record<string, string> = {
  bauteil: 'Bauteil',
  personal: 'Personal',
  planung: 'Planung',
  baustelleneinrichtung: 'Baustelleneinrichtung',
  nebenleistung: 'Nebenleistung',
  sonstige: 'Sonstige',
};

const POSITIONSTYP_LABELS: Record<string, string> = {
  NORMAL: 'Normalposition',
  ALTERNATIV: 'Alternativposition',
  BEDARF: 'Bedarfsposition',
  ZULAGENPOSITION: 'Zulageposition',
};

const POSITIONSTYP_ORDER = ['NORMAL', 'ALTERNATIV', 'BEDARF', 'ZULAGENPOSITION'];

function byOrder(order: readonly string[]) {
  return (values: string[]): string[] =>
    [...values].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia < 0 && ib < 0) return a.localeCompare(b, 'de');
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
}

function single(value: string | null): string[] {
  return value === null ? [] : [value];
}

export const FACETS: readonly Facet[] = [
  {
    id: 'positionsart',
    label: 'Positionsart',
    get: (p) => single(attrString(p.attributes, 'positionsart')),
    optionLabel: (value) => POSITIONSART_LABELS[value] ?? value,
    sortValues: byOrder(Object.keys(POSITIONSART_LABELS)),
  },
  {
    id: 'gewerk',
    label: 'Gewerk',
    get: (p) => single(attrString(p.attributes, 'gewerk')),
  },
  {
    id: 'bauteiltyp',
    label: 'Bauteiltyp',
    get: (p) => single(attrString(p.attributes, 'bauteiltyp')),
  },
  {
    id: 'beton',
    label: 'Druckfestigkeit',
    get: (p) => single(attrString(p.attributes, 'beton')),
  },
  {
    id: 'expo',
    label: 'Exposition',
    get: (p) => attrStrings(p.attributes, 'expo'),
  },
  {
    id: 'keywords',
    label: 'Besonderheiten',
    get: (p) => attrStrings(p.attributes, 'keywords'),
  },
  {
    id: 'positionstyp',
    label: 'Positionstyp',
    get: (p) => [p.positionType],
    optionLabel: (value) => POSITIONSTYP_LABELS[value] ?? value,
    sortValues: byOrder(POSITIONSTYP_ORDER),
  },
  {
    id: 'einheit',
    label: 'Einheit',
    get: (p) => single(p.unit),
  },
  {
    id: 'status',
    label: 'Status',
    // Status kommt als Default aus dem Import und ist nur Filter-Facette,
    // nicht editierbar (.claude/CLAUDE.md#kritische-constraints).
    get: () => [POSITION_STATUS],
  },
];

export const FACETS_BY_ID: ReadonlyMap<string, Facet> = new Map(
  FACETS.map((facet) => [facet.id, facet]),
);

export function facetOptionLabel(facet: Facet, value: string): string {
  return facet.optionLabel === undefined ? value : facet.optionLabel(value);
}
