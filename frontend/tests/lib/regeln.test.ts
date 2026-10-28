// Regeln in der App (Entscheidung 0081): Grundstock, Hervorhebung im Langtext,
// Verbindungen aus Regeln samt Speichern unter dem Positions-Hash.
import { describe, expect, it } from 'vitest';
import { RULE_SCHEMA, type Rule } from '@core';
import { fromStored, rekey, toStored, EMPTY_ANNOTATIONS } from '../../src/lib/annotations';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { confirmedWith, forgetLink, judgeLink, linkOf, toLinks } from '../../src/lib/positionLinks';
import { linkSuggestionsOf } from '../../src/lib/rules/linkSuggestions';
import { applyRules, GRUNDSTOCK, nameOf, newRule } from '../../src/lib/rules/rules';
import { ruleSentence } from '../../src/lib/rules/sentence';
import { INITIAL_VIEWER_STATE, viewerReducer } from '../../src/state/viewer';
import type { LVNode, PositionSummary } from '../../src/types/lvNode';
import { TEST_HASHES } from '../support/hashes';

function position(shortText: string, longText = ''): PositionSummary {
  return {
    oz: '',
    shortText,
    longText,
    unit: 'm3',
    quantity: 10,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
    hashes: TEST_HASHES,
  };
}

function node(id: string, kind: LVNode['kind'], children: LVNode[] = [], pos?: PositionSummary) {
  return {
    id,
    kind,
    code: id,
    ownCode: id,
    label: null,
    positionCount: 0,
    totalPrice: 0,
    children,
    position: pos ?? null,
  } satisfies LVNode;
}

const rule = (overrides: Partial<Rule>): Rule => ({
  ...newRule(new Set(), [{ begriff: 'Nachtrag' }, { begriff: 'ausgeschlossen' }], 'Nachtrag'),
  status: 'freigegeben',
  ...overrides,
});

describe('Grundstock', () => {
  it('liest docs/domain/reference/regeln.json, alles mit Geltung „allgemein“', () => {
    expect(GRUNDSTOCK.length).toBeGreaterThan(0);
    expect(GRUNDSTOCK.every((entry) => entry.geltung === 'allgemein')).toBe(true);
    expect(GRUNDSTOCK.every((entry) => entry.schema === RULE_SCHEMA)).toBe(true);
  });
});

describe('applyRules', () => {
  const text = 'Betonstahl verlegen. Ein Nachtrag für Mehrmengen ist ausgeschlossen.';

  it('hebt die Fundstellen aktiver Regeln hervor', () => {
    const spans = applyRules(position('', text), [], [rule({})]);
    expect(spans.map((span) => text.slice(span.start, span.end))).toEqual([
      'Nachtrag',
      'ausgeschlossen',
    ]);
    expect(spans.every((span) => span.key === 'wichtig' && span.label === 'Nachtrag')).toBe(true);
  });

  it('Entwürfe und Verknüpfungsregeln färben nicht', () => {
    expect(applyRules(position('', text), [], [rule({ status: 'entwurf' })])).toEqual([]);
    const link = rule({
      wirkung: { verknuepfen: { ziel: rule({}).bedingung, gleich: [] } },
    });
    expect(applyRules(position('', text), [], [link])).toEqual([]);
  });

  it('Fundstellen der Klassifizierung haben Vorrang', () => {
    const own = { key: 'normen', start: 25, end: 33, label: 'x' };
    const spans = applyRules(position('', text), [own], [rule({})]);
    expect(spans.filter((span) => span.key === 'wichtig')).toHaveLength(1);
  });
});

describe('Regel als Satz', () => {
  it('liest sich wie die Bausteine', () => {
    expect(ruleSentence(rule({}))).toBe(
      'Wenn im Langtext „Nachtrag“ und „ausgeschlossen“ im selben Satz stehen, ' +
        'dann als „Wichtig“ hervorheben.',
    );
    expect(nameOf([{ begriff: 'Nachtrag' }, { menge: {} }])).toBe('Nachtrag + Menge');
  });
});

describe('Verbindungen', () => {
  it('ein Urteil je Paar, egal in welcher Richtung', () => {
    let links = judgeLink([], 'b', 'a', 'bestaetigt', 'r@1', 5);
    expect(links).toEqual([{ a: 'a', b: 'b', status: 'bestaetigt', regel: 'r@1', at: 5 }]);
    links = judgeLink(links, 'a', 'b', 'verworfen', 'r@1', 6);
    expect(links).toHaveLength(1);
    expect(linkOf(links, 'b', 'a')?.status).toBe('verworfen');
    expect(forgetLink(links, 'b', 'a')).toEqual([]);
    expect(judgeLink([], 'a', 'a', 'bestaetigt', 'r@1', 1)).toEqual([]);
  });

  it('confirmedWith nennt nur bestätigte Partner', () => {
    const links = [
      ...judgeLink([], 'a', 'b', 'bestaetigt', 'r@1', 1),
      ...judgeLink([], 'a', 'c', 'verworfen', 'r@1', 1),
    ];
    expect(confirmedWith(links, 'a').map((entry) => entry.other)).toEqual(['b']);
  });

  it('wird unter dem Hash gespeichert und wieder gelesen', () => {
    const annotations = {
      ...EMPTY_ANNOTATIONS,
      links: judgeLink([], 'n1', 'n2', 'bestaetigt', 'r@1', 7),
    };
    const toHash = new Map([
      ['n1', 'hash-z'],
      ['n2', 'hash-a'],
    ]);
    const stored = toStored(rekey(annotations, toHash));
    expect(stored.links).toEqual([
      { a: 'hash-a', b: 'hash-z', status: 'bestaetigt', regel: 'r@1', at: 7 },
    ]);
    const toNode = new Map([...toHash].map(([id, hash]) => [hash, id]));
    const back = rekey(fromStored(JSON.parse(JSON.stringify(stored))), toNode);
    expect(back.links).toEqual(annotations.links);
  });

  it('ohne Verbindungen bleibt das Speicherformat wie bisher', () => {
    expect('links' in toStored(EMPTY_ANNOTATIONS)).toBe(false);
    expect(toLinks([{ a: 'x', b: 'x', status: 'bestaetigt', regel: 'r' }, 'kaputt'])).toEqual([]);
  });

  it('der Viewer merkt sich das Urteil in den Notizen', () => {
    const state = viewerReducer(INITIAL_VIEWER_STATE, {
      type: 'judgeLink',
      x: 'n2',
      y: 'n1',
      status: 'bestaetigt',
      regel: 'r@1',
      at: 1,
    });
    expect(state.annotations.links).toHaveLength(1);
    const back = viewerReducer(state, { type: 'forgetLink', x: 'n1', y: 'n2' });
    expect(back.annotations.links).toEqual([]);
  });
});

describe('linkSuggestionsOf', () => {
  const stahl = node('p1', 'position', [], position('Betonstahl B500B'));
  const beton = node('p2', 'position', [], position('Widerlager Ortbeton'));
  const fremd = node('p3', 'position', [], position('Stützwand Ortbeton'));
  const s1 = node('s1', 'section', [stahl, beton]);
  const s2 = node('s2', 'section', [fremd]);
  const root = node('root', 'project', [s1, s2]);
  const parents = new Map<string, LVNode | null>([
    ['p1', s1],
    ['p2', s1],
    ['p3', s2],
  ]);
  const index = buildPositionIndex(root);
  const linkRule = rule({
    bedingung: { alle: [{ begriff: 'Betonstahl*' }], bereich: 'feld', wo: ['kurztext'] },
    wirkung: {
      verknuepfen: {
        ziel: { alle: [{ begriff: 'Ortbeton*' }], bereich: 'feld', wo: ['kurztext'] },
        gleich: ['abschnitt'],
      },
    },
  });

  it('schlägt nur Paare im selben Abschnitt vor, in beiden Richtungen', () => {
    const result = linkSuggestionsOf(index, parents, [linkRule]);
    expect(result.get('p1')?.map((entry) => entry.other)).toEqual(['p2']);
    expect(result.get('p2')?.map((entry) => entry.other)).toEqual(['p1']);
    expect(result.has('p3')).toBe(false);
  });

  it('rechnet für denselben Stand nicht neu', () => {
    const first = linkSuggestionsOf(index, parents, [linkRule]);
    expect(linkSuggestionsOf(index, parents, [linkRule])).toBe(first);
    expect(linkSuggestionsOf(index, parents, [{ ...linkRule, status: 'entwurf' }]).size).toBe(0);
  });
});
