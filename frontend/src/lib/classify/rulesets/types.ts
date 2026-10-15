// Pluggable Eigenschafts-Extraktion (docs/architecture/pipeline.md#klassifizierung).
// Nur ruleBased.ts kennt Registry und einzelne Rulesets.

import type { NormalizedItem } from '../text';
import type { ClassifierInput, Positionsart } from '../types';

export interface RulesetContext {
  item: ClassifierInput;
  text: NormalizedItem;
  positionsart: Positionsart;
}

export interface PropertyRuleset {
  /** Stabile Kennung, landet als `_meta.ruleset`. */
  id: string;
  extract(context: RulesetContext): Record<string, unknown>;
}

/** Ruleset für Nicht-Bauteil-Positionen, ausgewählt über die Positionsart. */
export interface NonBauteilRuleset extends PropertyRuleset {
  positionsart: Positionsart;
}
