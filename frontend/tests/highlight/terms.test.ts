// Gelernte Begriffe als Regeln (Entscheidungen 0053, 0088): reine Funktionen.

import { describe, expect, it } from 'vitest';
import { toRule, type Rule } from '@core';
import {
  learnedRule,
  materialTermsOf,
  patternOf,
  termOfRule,
  termRule,
  termsToRules,
  type LearnedTerm,
} from '../../src/lib/highlight/terms';
import { applyRules, GRUNDSTOCK } from '../../src/lib/rules/rules';
import type { Span } from '../../src/lib/classify';
import type { PositionSummary } from '../../src/types/lvNode';

const TEXT = 'Ortbeton C30/37, Sichtbetonklasse SB2, Wasserhaltung bauseits.';
const beton: Span = { key: 'material', start: 0, end: 15, label: 'Ortbeton C30/37' };
const POSITION = { longText: TEXT, shortText: '', attributes: {} } as unknown as PositionSummary;

const regeln = (terms: LearnedTerm[]): Rule[] => termsToRules(terms, []);
const anwenden = (spans: Span[], terms: LearnedTerm[]) =>
  applyRules(POSITION, spans, regeln(terms)).map((span) => [
    span.key,
    TEXT.slice(span.start, span.end),
  ]);

describe('Begriff als Regel', () => {
  it('ergänzt gelernte Begriffe, ohne Fundstellen der Klassifizierung zu überdecken', () => {
    expect(
      anwenden(
        [beton],
        [
          { begriff: 'Sichtbetonklasse SB#', kategorie: 'wichtig' },
          { begriff: 'C#/#', kategorie: 'masse' },
        ],
      ),
    ).toEqual([
      ['material', 'Ortbeton C30/37'],
      ['wichtig', 'Sichtbetonklasse SB2'],
    ]);
  });

  it('nimmt mit „Nicht hervorheben" eine Fundstelle weg', () => {
    expect(anwenden([beton], [{ begriff: 'Ortbeton', kategorie: 'aus' }])).toEqual([]);
  });

  it('trifft ohne Groß/klein, nur ganze Wörter', () => {
    expect(anwenden([], [{ begriff: 'BAUSEITS', kategorie: 'wichtig' }])).toHaveLength(1);
    expect(anwenden([], [{ begriff: 'bause', kategorie: 'wichtig' }])).toEqual([]);
  });

  it('der längere Treffer gewinnt, egal in welcher Reihenfolge die Regeln stehen', () => {
    expect(
      anwenden(
        [],
        [
          { begriff: 'SB#', kategorie: 'masse' },
          { begriff: 'Sichtbetonklasse SB#', kategorie: 'wichtig' },
        ],
      ),
    ).toEqual([['wichtig', 'Sichtbetonklasse SB2']]);
  });

  it('ist eine gültige Regel im Format bubble-rule-v1, die der Begriff wiedererkennt', () => {
    const rule = termRule({ begriff: ' d = # cm ', kategorie: 'masse' }, new Set());
    expect(toRule(JSON.parse(JSON.stringify(rule)))).toEqual(rule);
    expect(rule).toMatchObject({ id: 'd-cm', name: 'd = # cm', status: 'freigegeben' });
    expect(termOfRule(rule)).toEqual({ begriff: 'd = # cm', kategorie: 'masse' });
    expect(GRUNDSTOCK.map(termOfRule).filter((term) => term !== null)).toEqual([]);
  });
});

describe('Lernen und Umzug', () => {
  it('neu lernen ersetzt die Regel mit gleichem Begriff und behält ihre Kennung', () => {
    const [erst] = regeln([{ begriff: 'Bauseits', kategorie: 'wichtig' }]);
    const alt: Rule = { ...erst, status: 'aus', bemerkung: 'Eigene Notiz' };
    const neu = learnedRule([alt], { begriff: 'bauseits', kategorie: 'aus' }, new Set([alt.id]));
    // Neu lernen schaltet wieder an und behält Name und Bemerkung.
    expect(neu).toMatchObject({
      id: alt.id,
      version: 2,
      name: 'Bauseits',
      bemerkung: 'Eigene Notiz',
      status: 'freigegeben',
      wirkung: { hervorheben: 'aus' },
    });
    const andere = learnedRule(
      [alt],
      { begriff: 'Kies', kategorie: 'material' },
      new Set([alt.id]),
    );
    expect(andere.id).toBe('kies');
  });

  it('zieht alte Begriffe ohne Doppelte und mit freien Kennungen um', () => {
    const vorhanden = termRule({ begriff: 'Kies', kategorie: 'material' }, new Set());
    const rules = termsToRules(
      [
        { begriff: 'kies', kategorie: 'material' },
        { begriff: 'Sand', kategorie: 'material' },
        { begriff: 'SAND', kategorie: 'wichtig' },
        { begriff: ' ', kategorie: 'wichtig' },
        { begriff: 'Frist in Tagen', kategorie: 'wichtig' },
      ],
      [vorhanden, ...GRUNDSTOCK],
    );
    expect(rules.map((rule) => rule.id)).toEqual(['sand', 'frist-in-tagen-2']);
  });

  it('nur aktive Material-Begriffe gehen in den Filter', () => {
    const [kies, sand, wichtig] = regeln([
      { begriff: 'Kies', kategorie: 'material' },
      { begriff: 'Sand', kategorie: 'material' },
      { begriff: 'bauseits', kategorie: 'wichtig' },
    ]);
    expect(materialTermsOf([kies, { ...sand, status: 'aus' }, wichtig])).toEqual([
      { begriff: 'Kies', kategorie: 'material' },
    ]);
  });

  it('macht aus Zahlen ein Muster', () => {
    expect(patternOf('C30/37')).toBe('C#/#');
    expect(patternOf('Wanddicke 24,5 cm')).toBe('Wanddicke # cm');
    expect(patternOf('bauseits')).toBeNull();
  });
});
