// Öffentliche Oberfläche der Klassifizierung. Aufrufer importieren ausschließlich
// von hier — nie ruleBased.ts oder ein einzelnes Ruleset.

import { RuleBasedClassifier, type RuleBasedOptions } from './ruleBased';
import type { Classifier } from './types';

export { classifyDraft } from './classifyDraft';
export { POSITIONSARTEN, isPositionsart } from './types';
export type {
  Classifier,
  ClassificationMeta,
  ClassificationResult,
  ClassifierInput,
  Positionsart,
} from './types';
export { getStlbCatalog, parseStlbCsv } from './stlbCatalog';
export type { StlbLeistungsbereich } from './stlbCatalog';

let shared: Classifier | null = null;

/**
 * Einziger Zugang zum Klassifizierer. Ohne Optionen wird eine geteilte Instanz
 * mit dem mitgelieferten STLB-Katalog wiederverwendet.
 */
export function getClassifier(options?: RuleBasedOptions): Classifier {
  if (options !== undefined) return new RuleBasedClassifier(options);
  shared ??= new RuleBasedClassifier();
  return shared;
}
