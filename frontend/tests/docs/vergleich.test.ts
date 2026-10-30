// Vorschläge im Begleitdokument nach dem Umzug ins Regelformat (Entscheidung 0087): mit den
// Grundstock-Regeln genau wie vorher (`vorschlaege-vorher.json`, Stand v0.45.2). Dazu, was
// die Regeln schalten und einstellen. Alle Texte sind erfunden (`vorschlagPdf.ts`).

import { describe, expect, it } from 'vitest';
import type { Rule } from '@core';
import { suggestIndexOf, suggestionsInPage } from '../../src/lib/docs/docSuggest';
import { suggestRulesOf } from '../../src/lib/docs/suggestRules';
import { GRUNDSTOCK } from '../../src/lib/rules/rules';
import vorher from './vorschlaege-vorher.json';
import { POSITIONEN, SEITEN } from './vorschlagPdf';

const alle = (rules: readonly Rule[]) => {
  const index = suggestIndexOf(POSITIONEN, suggestRulesOf(rules));
  return SEITEN.map((text, i) => suggestionsInPage(text, index, i + 1));
};

const mit = (id: string, change: (rule: Rule) => Rule): Rule[] =>
  GRUNDSTOCK.map((rule) => (rule.id === id ? change(rule) : rule));

const parameter = (rule: Rule, key: string, value: number): Rule => {
  const block = rule.bedingung.alle?.[0];
  if (block === undefined || !('eingebaut' in block)) throw new Error('kein eingebauter Baustein');
  return {
    ...rule,
    bedingung: { ...rule.bedingung, alle: [{ ...block, parameter: { [key]: value } }] },
  };
};

describe('Vorschläge aus den Grundstock-Regeln', () => {
  it('liefern genau dasselbe wie vorher', () => {
    expect(JSON.parse(JSON.stringify(alle(GRUNDSTOCK)))).toEqual(vorher);
  });

  it('stehen beide im Grundstock, mit den bisherigen Werten', () => {
    expect(suggestRulesOf(GRUNDSTOCK)).toEqual({
      oz: { nearOz: 80 },
      menge: { minInteger: 10 },
    });
  });

  it('eine Regel aus: nur ihre Art fällt weg, die andere bleibt unverändert', () => {
    const ohneMenge = alle(mit('pdf-menge', (rule) => ({ ...rule, status: 'aus' })));
    const ohneOz = alle(mit('pdf-oz', (rule) => ({ ...rule, status: 'entwurf' })));
    const nur = (source: string) =>
      (vorher as { source: string }[][]).map((page) => page.filter((s) => s.source === source));
    expect(JSON.parse(JSON.stringify(ohneMenge))).toEqual(nur('oz'));
    expect(JSON.parse(JSON.stringify(ohneOz))).toEqual(nur('menge'));
  });

  it('ohne Regeln gibt es keine Vorschläge', () => {
    expect(alle([]).flat()).toEqual([]);
  });

  it('die Parameter wirken: kleinste ganze Zahl und Abstand der Menge hinter der OZ', () => {
    const page = 'Pos. 3.1.40 mit 8 St Abläufen. Es sind 8 St Straßenabläufe zu setzen.';
    const finde = (rules: readonly Rule[]) =>
      suggestionsInPage(page, suggestIndexOf(POSITIONEN, suggestRulesOf(rules)), 1);
    expect(finde(GRUNDSTOCK).map((s) => s.source)).toEqual(['oz']);
    const ab5 = mit('pdf-menge', (rule) => parameter(rule, 'kleinste-ganze-zahl', 5));
    expect(finde(ab5).map((s) => s.source)).toEqual(['oz', 'menge']);
    expect(finde(GRUNDSTOCK)[0].amount?.pdf).toBe('8 St');
    const kurz = mit('pdf-oz', (rule) => parameter(rule, 'menge-hinter-oz', 3));
    expect(finde(kurz)[0].amount).toBeUndefined();
  });

  it('kaputter Parameter: der bisherige Wert gilt', () => {
    const block = { eingebaut: 'menge-im-pdf', parameter: { 'kleinste-ganze-zahl': 'zehn' } };
    const rules = mit('pdf-menge', (rule) => ({
      ...rule,
      bedingung: { ...rule.bedingung, alle: [block] },
    }));
    expect(suggestRulesOf(rules).menge).toEqual({ minInteger: 10 });
  });
});
