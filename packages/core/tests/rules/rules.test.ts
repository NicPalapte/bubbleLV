// Testfälle für `bubble-rule-v1`: erfundene Texte, Regel, erwartete Treffer.
import { describe, expect, it } from 'vitest';
import {
  blocksFromSelection,
  matchCondition,
  parseRuleFile,
  ruleIdOf,
  suggestLinks,
  toRule,
  type LinkCandidate,
  type RuleCondition,
  type RuleText,
} from '../../src';

const text = (langtext: string, kurztext = ''): RuleText => ({ kurztext, langtext });
const found = (input: RuleText, condition: RuleCondition): string[] =>
  matchCondition(condition, input).map((hit) =>
    (hit.feld === 'kurztext' ? input.kurztext : input.langtext).slice(hit.start, hit.end),
  );

describe('matchCondition', () => {
  const nachtrag: RuleCondition = {
    alle: [{ begriff: 'Nachtrag' }, { begriff: 'ausgeschlossen' }],
    bereich: 'satz',
    wo: ['langtext'],
  };

  it('trifft zwei Begriffe im selben Satz', () => {
    const input = text('Betonstahl verlegen. Ein Nachtrag für Mehrmengen ist ausgeschlossen.');
    expect(found(input, nachtrag)).toEqual(['Ein Nachtrag für Mehrmengen ist ausgeschlossen.']);
  });

  it('trifft nicht, wenn die Begriffe in verschiedenen Sätzen stehen', () => {
    const input = text('Ein Nachtrag ist möglich. Mehrmengen sind ausgeschlossen.');
    expect(found(input, nachtrag)).toEqual([]);
  });

  it('„rd.“ und Tausenderpunkte beenden den Satz nicht', () => {
    const input = text('Fläche rd. 1.050 m² herstellen; ein Nachtrag ist ausgeschlossen.');
    const condition: RuleCondition = {
      alle: [{ begriff: 'Fläche' }, { menge: {} }],
      bereich: 'satz',
      wo: ['langtext'],
    };
    expect(matchCondition(condition, input)).toHaveLength(1);
  });

  it('„eines“ reicht ein Baustein, je Satz ein Treffer', () => {
    const input = text('Frist 14 Tage. Danach Vertragsstrafe. Sonst nichts.');
    const condition: RuleCondition = {
      eines: [{ begriff: '# Tage' }, { begriff: 'Vertragsstrafe' }],
      bereich: 'satz',
      wo: ['langtext'],
    };
    expect(found(input, condition)).toEqual(['Frist 14 Tage.', 'Danach Vertragsstrafe.']);
  });

  it('„nicht“ verwirft den Bereich', () => {
    const condition: RuleCondition = {
      alle: [{ begriff: 'Sichtbeton*' }],
      nicht: [{ begriff: 'DIN' }],
      bereich: 'feld',
      wo: ['langtext'],
    };
    expect(found(text('Sichtbetonklasse SB3 nach DBV-Merkblatt.'), condition)).toHaveLength(1);
    expect(found(text('Sichtbetonklasse SB3 nach DIN 18217.'), condition)).toEqual([]);
  });

  it('Zeichenabstand begrenzt, wie weit die Teile auseinander stehen', () => {
    const condition: RuleCondition = {
      alle: [{ begriff: 'Bohrpf*' }, { menge: { einheit: 'm' } }],
      bereich: { zeichen: 20 },
      wo: ['langtext'],
    };
    expect(matchCondition(condition, text('Bohrpfähle gesamt 120 m'))).toHaveLength(1);
    const far = text(`Bohrpfähle ${'x'.repeat(40)} 120 m`);
    expect(matchCondition(condition, far)).toEqual([]);
  });

  it('Menge mit Einheit unterscheidet die Schreibweise nicht', () => {
    const condition: RuleCondition = {
      alle: [{ menge: { einheit: 'm³' } }],
      bereich: 'feld',
      wo: ['langtext'],
    };
    expect(matchCondition(condition, text('Menge 85,5 m3'))).toHaveLength(1);
    expect(matchCondition(condition, text('Menge 12 t'))).toEqual([]);
  });

  it('Norm trifft nur die Fundstellen, die der Aufrufer liefert', () => {
    const condition: RuleCondition = { alle: [{ norm: {} }], bereich: 'feld', wo: ['langtext'] };
    const input = text('nach DIN EN 1536 herstellen');
    expect(matchCondition(condition, input)).toEqual([]);
    const withNorm = { ...input, normen: { langtext: [{ start: 5, end: 16 }] } };
    expect(matchCondition(condition, withNorm)[0].marks).toEqual([{ start: 5, end: 16 }]);
  });

  it('sucht nur in den gewählten Texten', () => {
    const condition: RuleCondition = {
      alle: [{ begriff: 'Widerlager' }],
      bereich: 'feld',
      wo: ['kurztext'],
    };
    expect(matchCondition(condition, text('Widerlager herstellen', 'Schalung'))).toEqual([]);
    expect(matchCondition(condition, text('', 'Widerlager Ortbeton'))[0].feld).toBe('kurztext');
  });

  it('ein leerer Begriff trifft nichts', () => {
    const condition: RuleCondition = {
      alle: [{ begriff: ' ' }],
      bereich: 'feld',
      wo: ['langtext'],
    };
    expect(matchCondition(condition, text('irgendwas'))).toEqual([]);
  });
});

describe('suggestLinks', () => {
  const candidate = (id: string, kurztext: string, abschnitt: string): LinkCandidate => ({
    id,
    text: { kurztext, langtext: '' },
    abschnitt,
    einheit: 'm3',
  });
  const stahl: RuleCondition = {
    alle: [{ begriff: 'Betonstahl' }],
    bereich: 'feld',
    wo: ['kurztext'],
  };
  const beton: RuleCondition = {
    alle: [{ begriff: 'Ortbeton' }],
    bereich: 'feld',
    wo: ['kurztext'],
  };
  const lv = [
    candidate('a', 'Betonstahl B500B', '02'),
    candidate('b', 'Widerlager Ortbeton', '02'),
    candidate('c', 'Stützwand Ortbeton', '03'),
  ];

  it('verbindet nur innerhalb desselben Abschnitts', () => {
    const { pairs } = suggestLinks(stahl, beton, ['abschnitt'], lv);
    expect(pairs.map((pair) => [pair.from, pair.to])).toEqual([['a', 'b']]);
  });

  it('ohne „gleich“ alle passenden Paare, jedes nur einmal', () => {
    const { pairs } = suggestLinks(beton, beton, [], lv);
    expect(pairs.map((pair) => [pair.from, pair.to])).toEqual([['b', 'c']]);
  });

  it('bricht bei zu vielen Paaren ab', () => {
    const { pairs, truncated } = suggestLinks(stahl, beton, [], lv, 1);
    expect(pairs).toHaveLength(1);
    expect(truncated).toBe(true);
  });
});

describe('toRule / parseRuleFile', () => {
  const rule = {
    schema: 'bubble-rule-v1',
    id: 'nachtrag',
    version: 1,
    name: 'Nachtrag ausgeschlossen',
    bedingung: { alle: [{ begriff: 'Nachtrag' }], bereich: 'satz', wo: ['langtext'] },
    wirkung: { hervorheben: 'wichtig' },
    geltung: 'unternehmen',
    status: 'freigegeben',
    herkunft: 'nutzer',
  };

  it('liest eine gültige Regel', () => {
    expect(toRule(rule)).toEqual(rule);
  });

  it('verwirft Regeln mit „alle“ und „eines“ zugleich oder ohne Text', () => {
    expect(toRule({ ...rule, bedingung: { ...rule.bedingung, eines: [] } })).toBeNull();
    expect(toRule({ ...rule, bedingung: { ...rule.bedingung, wo: [] } })).toBeNull();
    expect(toRule({ ...rule, schema: 'anders' })).toBeNull();
    expect(toRule({ ...rule, id: 'Mit Leerzeichen' })).toBeNull();
  });

  it('liest eine Verknüpfungsregel', () => {
    const link = {
      ...rule,
      wirkung: { verknuepfen: { ziel: rule.bedingung, gleich: ['abschnitt', 'quatsch'] } },
    };
    expect(toRule(link)?.wirkung).toEqual({
      verknuepfen: { ziel: rule.bedingung, gleich: ['abschnitt'] },
    });
  });

  it('nimmt aus einer Datei nur brauchbare Regeln, jede Kennung einmal', () => {
    const file = { schema: 'bubble-rule-v1', regeln: [rule, rule, { kaputt: true }] };
    expect(parseRuleFile(file)).toHaveLength(1);
    expect(parseRuleFile({ regeln: [rule] })).toEqual([]);
  });

  it('ruleIdOf macht eine freie Kennung aus dem Namen', () => {
    expect(ruleIdOf('Größe & Maße')).toBe('groesse-masse');
    expect(ruleIdOf('Frist', new Set(['frist']))).toBe('frist-2');
  });
});

describe('blocksFromSelection', () => {
  it('kurze Markierung bleibt ein Begriff, Zahlen werden #', () => {
    expect(blocksFromSelection('Beton C30/37')).toEqual([{ begriff: 'Beton C#/#' }]);
  });

  it('Menge wird Baustein, lange Markierung gibt die tragenden Wörter', () => {
    expect(blocksFromSelection('Gesamtlänge der Bohrpfähle sind rund 120 m herzustellen')).toEqual([
      { begriff: 'Gesamtlänge' },
      { begriff: 'Bohrpfähle' },
      { begriff: 'herzustellen' },
      { menge: {} },
    ]);
  });

  it('nichts Brauchbares gibt keine Bausteine', () => {
    expect(blocksFromSelection(' .; ')).toEqual([]);
  });
});
