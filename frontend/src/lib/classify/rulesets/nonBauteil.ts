// Rulesets für Nicht-Bauteil-Positionen. Eigenes, kleineres Schema — kein
// bauteiltyp/beton/tragend (docs/architecture/data-model.md). Bewusst minimal und
// inkrementell erweiterbar.

import { extractMasse } from './fallback';
import type { NonBauteilRuleset, RulesetContext } from './types';

const QUALIFIKATIONEN: ReadonlyArray<{ label: string; keywords: readonly string[] }> = [
  { label: 'Polier', keywords: ['polier'] },
  { label: 'Vorarbeiter', keywords: ['vorarbeiter'] },
  { label: 'Facharbeiter', keywords: ['facharbeiter', 'geselle'] },
  { label: 'Werker', keywords: ['werker', 'bauhelfer', 'helfer'] },
];

export const personalRuleset: NonBauteilRuleset = {
  id: 'personal',
  positionsart: 'personal',
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const qualifikation =
      QUALIFIKATIONEN.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))
        ?.label ?? null;
    return {
      qualifikation,
      zeiteinheit: context.item.unit,
    };
  },
};

const PLANUNGSARTEN: ReadonlyArray<{ label: string; keywords: readonly string[] }> = [
  { label: 'Statik', keywords: ['statische berechnung', 'statischer nachweis', 'standsicherheit'] },
  { label: 'Bewehrungsplanung', keywords: ['bewehrungsplanung', 'bewehrungsplan'] },
  { label: 'Schalplanung', keywords: ['schalplanung', 'schalplan'] },
  { label: 'Werkplanung', keywords: ['werkplanung', 'ausführungsplanung', 'montageplanung'] },
  { label: 'Gutachten', keywords: ['gutachten', 'bestandsaufnahme'] },
];

export const planungRuleset: NonBauteilRuleset = {
  id: 'planung',
  positionsart: 'planung',
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const planungsart =
      PLANUNGSARTEN.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))
        ?.label ?? null;
    return { planungsart };
  },
};

const EINRICHTUNGSARTEN: ReadonlyArray<{ label: string; keywords: readonly string[] }> = [
  { label: 'Einrichten', keywords: ['einrichten', 'liefern und aufstellen', 'antransport'] },
  { label: 'Vorhalten', keywords: ['vorhalten', 'vorhaltung'] },
  { label: 'Räumen', keywords: ['räumen', 'abbauen', 'abtransport'] },
];

export const baustelleneinrichtungRuleset: NonBauteilRuleset = {
  id: 'baustelleneinrichtung',
  positionsart: 'baustelleneinrichtung',
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const einrichtungsart =
      EINRICHTUNGSARTEN.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))
        ?.label ?? null;
    return { einrichtungsart, ...extractMasse(context) };
  },
};

export const nonBauteilRulesets: readonly NonBauteilRuleset[] = [
  personalRuleset,
  planungRuleset,
  baustelleneinrichtungRuleset,
];
