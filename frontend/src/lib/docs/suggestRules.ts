// Vorschläge im Begleitdokument aus den Regeln (Entscheidung 0087): „OZ im Dokument“
// (`oz-im-pdf`) und „Menge im Dokument“ (`menge-im-pdf`) sind Grundstock-Regeln mit
// eingebauter Logik in `docSuggest.ts`. Hier steht nur, welche davon aktiv ist und mit
// welchen Parametern. Fehlt eine Regel oder ist sie aus, gibt es diese Art nicht.

import { blocksOf, type Rule } from '@core';
import {
  AMOUNT_MIN_INTEGER,
  AMOUNT_NEAR_OZ,
  type LinkSource,
  type SuggestRules,
} from './docSuggest';

/** Name des eingebauten Bausteins je Art von Vorschlag. */
export const SUGGEST_BUILTINS: Readonly<Record<LinkSource, string>> = {
  oz: 'oz-im-pdf',
  menge: 'menge-im-pdf',
};

type Parameter = Readonly<Record<string, unknown>>;

/** Parameter der ersten aktiven PDF-Regel mit diesem Baustein; `null`: keine aktiv. */
function activeParameter(rules: readonly Rule[], name: string): Parameter | null {
  for (const rule of rules) {
    if (rule.status !== 'freigegeben') continue;
    if (!rule.bedingung.wo.includes('pdf')) continue;
    const [block] = blocksOf(rule.bedingung);
    if (block !== undefined && 'eingebaut' in block && block.eingebaut === name) {
      return block.parameter ?? {};
    }
  }
  return null;
}

/** Ganze Zahl ab 0 aus einem Parameter, sonst der Ersatzwert. */
function countOf(parameter: Parameter, key: string, fallback: number): number {
  const value = parameter[key];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

/** Welche Vorschläge die Regeln einschalten und mit welchen Werten. */
export function suggestRulesOf(rules: readonly Rule[]): SuggestRules {
  const oz = activeParameter(rules, SUGGEST_BUILTINS.oz);
  const menge = activeParameter(rules, SUGGEST_BUILTINS.menge);
  return {
    oz: oz === null ? null : { nearOz: countOf(oz, 'menge-hinter-oz', AMOUNT_NEAR_OZ) },
    menge:
      menge === null
        ? null
        : { minInteger: countOf(menge, 'kleinste-ganze-zahl', AMOUNT_MIN_INTEGER) },
  };
}
