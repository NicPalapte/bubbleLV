// Pluggable Eigenschafts-Extraktion (docs/architecture/pipeline.md#klassifizierung).
// Nur ruleBased.ts kennt Registry und einzelne Rulesets.

import type { MappingIndex } from '../mapping';
import type { NormalizedItem } from '../text';
import type { ClassifierInput, Positionsart } from '../types';

export interface RulesetKey {
  bauteiltyp: string;
  /** STLB-Bau-LB-Nummer, nicht die Freitext-Bezeichnung. */
  gewerkLb: string;
}

export interface RulesetContext {
  item: ClassifierInput;
  text: NormalizedItem;
  bauteiltyp: string | null;
  gewerkLb: string | null;
  positionsart: Positionsart;
  /** Mappingtabelle, aus der ein Ruleset seine Stichworte bezieht. */
  mapping: MappingIndex;
}

export interface PropertyRuleset {
  /** Stabile Kennung, landet als `_meta.ruleset`. */
  id: string;
  extract(context: RulesetContext): Record<string, unknown>;
}

/** Bauteil-Ruleset: gilt für ein Gewerk (LB) und eine Menge von Bauteiltypen. */
export interface BauteilRuleset extends PropertyRuleset {
  keys: readonly RulesetKey[];
}

/** Ruleset für Nicht-Bauteil-Positionen, ausgewählt über die Positionsart. */
export interface NonBauteilRuleset extends PropertyRuleset {
  positionsart: Positionsart;
}
