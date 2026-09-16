// Stabile Oberfläche der Klassifizierung (docs/architecture/pipeline.md#klassifizierung).
// Aufrufer importieren ausschließlich diese Typen und getClassifier() — nie eine
// konkrete Implementierung.

/** Quellen-agnostischer Eingabesatz — bewusst ohne GAEB-/LVDraft-Bezug. */
export interface ClassifierInput {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
  /**
   * Überschriften der übergeordneten Abschnitte und Lose, die nächstgelegene
   * zuerst. In realen LVs steht das Gewerk regelmäßig nur dort ("Titel 02
   * Erdarbeiten") und nicht im Positionstext; findet der Positionstext keinen
   * Leistungsbereich, prüft Stufe 0 diese Überschriften.
   */
  headings?: readonly string[];
}

/** Woher der Leistungsbereich stammt (Stufe 0). */
export type GewerkQuelle = 'position' | 'abschnitt';

/** Provenance-Block, landet als `attributes._meta` (docs/architecture/data-model.md). */
export interface ClassificationMeta {
  classifier: string;
  /** Aufgelöster Ruleset-Key oder "fallback". */
  ruleset: string;
  version: number;
  confidence: number;
  /**
   * `position` = der Leistungsbereich steht im Positionstext, `abschnitt` = er
   * stammt aus einer übergeordneten Überschrift, `null` = kein Treffer. Die
   * Herkunft ist sichtbar, weil ein geerbtes Gewerk eine Ableitung ist und
   * keine Angabe der Position selbst.
   */
  gewerkQuelle: GewerkQuelle | null;
}

/**
 * Fundstelle eines Merkmals im **Langtext** (docs/architecture/data-model.md#spans).
 * Die Indizes zeigen auf den Rohtext der Position, nicht auf die normalisierte
 * Fassung aus text.ts — sonst ließe sich im Panel nichts markieren.
 */
export interface Span {
  /** Attribut-Key, zu dem die Stelle gehört, z. B. "beton" oder "normen". */
  key: string;
  /** Zeichen-Index im Langtext, inklusiv. */
  start: number;
  /** Zeichen-Index im Langtext, exklusiv. */
  end: number;
  /** Anzeigetext der Stelle, z. B. "DIN EN 206". */
  label: string;
}

export interface ClassificationResult {
  attributes: Record<string, unknown>;
  meta: ClassificationMeta;
  /** Fundstellen im Langtext, aufsteigend nach `start`. Leer, wenn keine. */
  spans: Span[];
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
