// Rulesets für Nicht-Bauteil-Positionen. Eigenes, kleineres Schema — kein
// bauteiltyp/beton/tragend (docs/architecture/data-model.md). Bewusst minimal und
// inkrementell erweiterbar. Die Stichworte stehen in der Mappingtabelle
// (Dimensionen `qualifikation`, `planungsart`, `einrichtungsart`).

import { matchTextOf } from '../mapping';
import type { NonBauteilRuleset, RulesetContext } from './types';

export const personalRuleset: NonBauteilRuleset = {
  id: 'personal',
  positionsart: 'personal',
  extract(context: RulesetContext): Record<string, unknown> {
    const qualifikation =
      context.mapping.match('qualifikation', [matchTextOf(context.text)])?.code ?? null;
    return {
      qualifikation,
      zeiteinheit: context.item.unit,
    };
  },
};

export const planungRuleset: NonBauteilRuleset = {
  id: 'planung',
  positionsart: 'planung',
  extract(context: RulesetContext): Record<string, unknown> {
    const planungsart =
      context.mapping.match('planungsart', [matchTextOf(context.text)])?.code ?? null;
    return { planungsart };
  },
};

export const baustelleneinrichtungRuleset: NonBauteilRuleset = {
  id: 'baustelleneinrichtung',
  positionsart: 'baustelleneinrichtung',
  extract(context: RulesetContext): Record<string, unknown> {
    const einrichtungsart =
      context.mapping.match('einrichtungsart', [matchTextOf(context.text)])?.code ?? null;
    return { einrichtungsart };
  },
};

export const nonBauteilRulesets: readonly NonBauteilRuleset[] = [
  personalRuleset,
  planungRuleset,
  baustelleneinrichtungRuleset,
];
