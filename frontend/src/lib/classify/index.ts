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
  Span,
} from './types';

let shared: Classifier | null = null;

/** Einziger Zugang zum Klassifizierer. Ohne Optionen eine geteilte Instanz. */
export function getClassifier(options?: RuleBasedOptions): Classifier {
  if (options !== undefined) return new RuleBasedClassifier(options);
  shared ??= new RuleBasedClassifier();
  return shared;
}
