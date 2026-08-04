// Stabile Oberfläche der Klassifizierung (docs/architecture/pipeline.md#klassifizierung).
// Aufrufer importieren ausschließlich diese Typen und getClassifier() — nie eine
// konkrete Implementierung.

/** Quellen-agnostischer Eingabesatz — bewusst ohne GAEB-/LVDraft-Bezug. */
export interface ClassifierInput {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
}

/** Provenance-Block, landet als `attributes._meta` (docs/architecture/data-model.md). */
export interface ClassificationMeta {
  classifier: string;
  /** Aufgelöster Ruleset-Key oder "fallback". */
  ruleset: string;
  version: number;
  confidence: number;
}

export interface ClassificationResult {
  attributes: Record<string, unknown>;
  meta: ClassificationMeta;
}

export interface Classifier {
  /** Synchron und deterministisch — darf nie werfen. */
  classify(item: ClassifierInput): ClassificationResult;
}

/**
 * Arbeits-Taxonomie, bewusst nicht normativ (siehe docs/domain/README.md).
 * `bauteil` ist der einzige Wert, der Stufe 1 + Bauteil-Rulesets auslöst.
 */
export type Positionsart =
  'bauteil' | 'personal' | 'planung' | 'baustelleneinrichtung' | 'nebenleistung' | 'sonstige';

export const POSITIONSARTEN: readonly Positionsart[] = [
  'bauteil',
  'personal',
  'planung',
  'baustelleneinrichtung',
  'nebenleistung',
  'sonstige',
];

export function isPositionsart(value: string): value is Positionsart {
  return (POSITIONSARTEN as readonly string[]).includes(value);
}
