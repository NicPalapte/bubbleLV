// Facetten-Definitionen. Die Werte entstehen dynamisch aus den geladenen Daten —
// ein neues Klassifizierungs-Attribut taucht automatisch als Filterwert auf
// (docs/architecture/data-model.md).

import { attrString, attrStrings } from './attributes';
import { materialKatalog } from './classify/material/katalog';
import { canonicalUnit, unitLabel } from './units';
import type { PositionSummary } from '../types/lvNode';

export interface Facet {
  id: string;
  label: string;
  /** Alle Werte, unter denen die Position in dieser Facette einsortiert ist. */
  get(position: PositionSummary): string[];
  /** Anzeigename eines Werts, falls er vom Rohwert abweicht. */
  optionLabel?(value: string): string;
  sortValues?(values: string[]): string[];
  /**
   * Merkmal eines Materials: Anzeigename des Materials (Wert der Facette `material`).
   * Die Filterleiste ordnet es dort unter (Material → Beton → Art …).
   */
  material?: string;
  /** Kurzname unter dem Material, z. B. „Art" statt „Art (Beton)". */
  subLabel?: string;
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

/** Druckfestigkeit und Exposition kommen aus eigenen Extraktoren, gehören aber zum Beton. */
const BETON = materialKatalog().find((material) => material.id === 'beton')?.name;

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
    id: 'beton',
    label: 'Druckfestigkeit',
    get: (p) => single(attrString(p.attributes, 'beton')),
    material: BETON,
  },
  {
    id: 'expo',
    label: 'Exposition',
    get: (p) => attrStrings(p.attributes, 'expo'),
    material: BETON,
  },
  // Material und seine Merkmale aus den Materialtabellen (Entscheidung 0045):
  // eine neue Tabelle bringt ihre Filter mit.
  {
    id: 'material',
    label: 'Material',
    get: (p) => attrStrings(p.attributes, 'material'),
  },
  ...materialKatalog().flatMap((material) =>
    material.merkmale.map((merkmal): Facet => ({
      id: merkmal.key,
      label: `${merkmal.name} (${material.name})`,
      get: (p) => attrStrings(p.attributes, merkmal.key),
      material: material.name,
      subLabel: merkmal.name,
      // Reihenfolge wie in der Tabelle, nicht alphabetisch.
      sortValues: byOrder(merkmal.werte.flatMap(({ wert }) => (wert === null ? [] : [wert]))),
    })),
  ),
  {
    id: 'keywords',
    label: 'Besonderheiten',
    get: (p) => attrStrings(p.attributes, 'keywords'),
  },
  // Merkmale der Extraktoren (WP-J). Ihre Werte kommen aus
  // einem geschlossenen Vokabular, damit die Filterliste kurz bleibt; der
  // Wortlaut der Fundstelle steht im Span, nicht im Filterwert.
  {
    id: 'normen',
    label: 'Normen',
    get: (p) => attrStrings(p.attributes, 'normen'),
  },
  {
    id: 'fristen',
    label: 'Zeitbezug',
    get: (p) => attrStrings(p.attributes, 'fristen'),
  },
  {
    id: 'platzhalter',
    label: 'Offene Stellen',
    get: (p) => attrStrings(p.attributes, 'platzhalter'),
  },
  {
    id: 'positionstyp',
    label: 'Positionstyp',
    get: (p) => [p.positionType],
    optionLabel: (value) => POSITIONSTYP_LABELS[value] ?? value,
    sortValues: byOrder(POSITIONSTYP_ORDER),
  },
  {
    // Der Filterwert ist der Vergleichsschlüssel, nicht der Wortlaut: "psch" und
    // "PSCH" sind eine Einheit und gehören unter einen Knopf (lib/units.ts).
    // Tabelle und Panel zeigen weiter, was in der Datei steht.
    id: 'einheit',
    label: 'Einheit',
    get: (p) => single(canonicalUnit(p.unit)),
    optionLabel: unitLabel,
  },
];

export const FACETS_BY_ID: ReadonlyMap<string, Facet> = new Map(
  FACETS.map((facet) => [facet.id, facet]),
);

export function facetOptionLabel(facet: Facet, value: string): string {
  return facet.optionLabel === undefined ? value : facet.optionLabel(value);
}
