// Aggregate über das ganze LV: Facetten-Zähler und Wertebereiche. Sie entstehen
// einmal beim Laden — im Worker, sobald der Umweg lohnt (lib/pipeline/loadLv.ts)
// — und liegen danach fertig im Viewer-State. Kein Render rechnet sie erneut
// (WP-I, Schritt 2).
//
// Vorher zählte jeder Facetten-Knopf seine Werte selbst über alle Positionen;
// bei neun Facetten und ~10k Positionen war das neunmal derselbe Durchlauf, und
// zwar jedes Mal, wenn sich die Positionsliste neu ergab.

import { FACETS } from '../facets';
import type { PositionIndex } from './positionIndex';

/** Kleinster und größter vorkommender Wert einer numerischen Spalte. */
export interface ValueRange {
  readonly min: number;
  readonly max: number;
}

export interface LVSummary {
  readonly positionCount: number;
  /**
   * Facetten-ID → Wert → Anzahl Positionen. Die Werte stehen bereits in
   * Anzeigereihenfolge (`Facet.sortValues`, sonst alphabetisch nach de-DE).
   */
  readonly facets: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Wertebereich der Mengen; `null`, wenn die Datei keine führt. */
  readonly quantity: ValueRange | null;
  /** Wertebereich der Einheitspreise; `null` bei x83 ohne Preise. */
  readonly unitPrice: ValueRange | null;
  /** Summe Menge × EP über alle Positionen. */
  readonly totalPrice: number;
}

export const EMPTY_SUMMARY: LVSummary = {
  positionCount: 0,
  facets: new Map(),
  quantity: null,
  unitPrice: null,
  totalPrice: 0,
};

/** Min/Max einer typisierten Spalte; `NaN`-Einträge (kein Wert) zählen nicht. */
function rangeOf(column: Float64Array): ValueRange | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < column.length; i++) {
    const value = column[i];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return Number.isFinite(min) ? { min, max } : null;
}

function sumOf(column: Float64Array): number {
  let total = 0;
  for (let i = 0; i < column.length; i++) {
    if (Number.isFinite(column[i])) total += column[i];
  }
  return total;
}

export function summarize(index: PositionIndex): LVSummary {
  const counts = FACETS.map(() => new Map<string, number>());
  for (const facts of index.facts) {
    for (let slot = 0; slot < counts.length; slot++) {
      const target = counts[slot];
      for (const value of facts.facetValues[slot]) {
        target.set(value, (target.get(value) ?? 0) + 1);
      }
    }
  }

  const facets = new Map<string, ReadonlyMap<string, number>>();
  FACETS.forEach((facet, slot) => {
    const raw = counts[slot];
    const keys =
      facet.sortValues === undefined
        ? [...raw.keys()].sort((a, b) => a.localeCompare(b, 'de'))
        : facet.sortValues([...raw.keys()]);
    // Neu aufgebaut statt sortiert: eine Map bewahrt die Einfügereihenfolge,
    // und die Anzeige soll sie ohne weiteres Sortieren übernehmen können.
    facets.set(facet.id, new Map(keys.map((key) => [key, raw.get(key) ?? 0])));
  });

  return {
    positionCount: index.size,
    facets,
    quantity: rangeOf(index.quantity),
    unitPrice: rangeOf(index.unitPrice),
    totalPrice: sumOf(index.totalPrice),
  };
}
