// Ein Regelformat für alles (Entscheidung 0085): neue Bausteine, Suchort PDF, Wirkungen
// Prüfhinweis und Verknüpfen mit PDF. Erfundene Texte, keine echten LVs.
import { describe, expect, it } from 'vitest';
import {
  blockKindOf,
  matchCondition,
  positionLinkOf,
  toRule,
  type BuiltinRule,
  type RuleCondition,
  type RuleContext,
  type RuleText,
} from '../../src';

const position = (
  langtext: string,
  angaben: RuleText['angaben'] = { menge: 10, einheit: 'm2', art: 'normal' },
): RuleText => ({ kurztext: '', langtext, angaben });

const CONTEXT: RuleContext = {
  listen: new Map([['hersteller', ['Acme*', 'Beispielwerk']]]),
  einheitGruppen: new Map([['Stunde', ['h', 'Std', 'Stunde']]]),
};

const base = (condition: Partial<RuleCondition>): RuleCondition => ({
  bereich: 'satz',
  wo: ['langtext'],
  ...condition,
});

const rule = (overrides: Record<string, unknown>): unknown => ({
  schema: 'bubble-rule-v1',
  id: 'test-regel',
  version: 1,
  name: 'Test',
  bedingung: { alle: [{ begriff: 'Beton' }], bereich: 'satz', wo: ['langtext'] },
  wirkung: { hervorheben: 'wichtig' },
  geltung: 'unternehmen',
  status: 'entwurf',
  ...overrides,
});

describe('neue Bausteine einlesen', () => {
  it('liest Liste, Einheit, Angabe und eingebauten Baustein', () => {
    const read = toRule(
      rule({
        bedingung: {
          eines: [
            { liste: 'hersteller' },
            { einheit: { gruppe: 'Stunde' } },
            { feld: 'art', ist: ['bedarf', 'alternativ'] },
          ],
          bereich: 'satz',
          wo: ['langtext'],
        },
      }),
    );
    expect(read?.bedingung.eines?.map(blockKindOf)).toEqual(['liste', 'einheit', 'feld']);
    const builtin = toRule(
      rule({
        bedingung: {
          alle: [{ eingebaut: 'offene-stelle', parameter: { punktreihe: 5 } }],
          bereich: 'feld',
          wo: ['langtext'],
        },
      }),
    );
    expect(builtin?.bedingung.alle).toEqual([
      { eingebaut: 'offene-stelle', parameter: { punktreihe: 5 } },
    ]);
  });

  it('verwirft Unbrauchbares statt abzustürzen', () => {
    const condition = (alle: unknown[]): unknown =>
      rule({ bedingung: { alle, bereich: 'satz', wo: ['langtext'] } });
    expect(toRule(condition([{ liste: 'Groß Buchstaben' }]))).toBeNull();
    expect(toRule(condition([{ feld: 'menge', ist: ['zehn'] }]))).toBeNull();
    expect(toRule(condition([{ feld: 'menge', ist: ['0x10'] }]))).toBeNull();
    expect(toRule(condition([{ feld: 'menge', ist: ['2,5'] }]))).not.toBeNull();
    expect(toRule(condition([{ feld: 'art', ist: ['sonder'] }]))).toBeNull();
    // Eingebaut steht allein.
    expect(toRule(condition([{ eingebaut: 'g3' }, { begriff: 'x' }]))).toBeNull();
    expect(toRule(condition([{ unbekannt: true }]))).toBeNull();
  });
});

describe('neue Wirkungen einlesen', () => {
  const hint = {
    kategorie: 'vob',
    schwere: 'hinweis',
    text: 'Bedarfsposition: Menge ist unsicher.',
    norm: { verweis: 'VOB/A § 7 Abs. 1 Nr. 4', stand: 'bestaetigt' },
  };

  it('liest einen Prüfhinweis mit Norm', () => {
    const read = toRule(rule({ geltung: 'allgemein', wirkung: { pruefhinweis: hint } }));
    expect(read?.wirkung).toEqual({ pruefhinweis: hint });
  });

  it('ohne Norm-Verweis erlaubt, ein Verweis ohne Stand gilt als zu bestätigen', () => {
    const wirkung = { pruefhinweis: { ...hint, norm: undefined } };
    const ohneNorm = { kategorie: hint.kategorie, schwere: hint.schwere, text: hint.text };
    expect(toRule(rule({ geltung: 'allgemein', wirkung }))?.wirkung).toEqual({
      pruefhinweis: ohneNorm,
    });
    const ohneStand = { pruefhinweis: { ...hint, norm: { verweis: 'VOB/A § 7' } } };
    expect(toRule(rule({ geltung: 'unternehmen', wirkung: ohneStand }))?.wirkung).toEqual({
      pruefhinweis: { ...hint, norm: { verweis: 'VOB/A § 7', stand: 'zu_bestaetigen' } },
    });
  });

  it('Verknüpfen mit PDF nur, wenn die Bedingung allein im PDF sucht', () => {
    const wirkung = { verknuepfen: { ziel: 'pdf' } };
    const pdf = { alle: [{ begriff: 'Pos.' }], bereich: 'satz', wo: ['pdf'] };
    const read = toRule(rule({ bedingung: pdf, wirkung }));
    expect(read).not.toBeNull();
    expect(read === null ? null : positionLinkOf(read.wirkung)).toBeNull();
    expect(toRule(rule({ wirkung }))).toBeNull();
    expect(toRule(rule({ bedingung: pdf }))).toBeNull();
    expect(toRule(rule({ bedingung: { ...pdf, wo: ['pdf', 'langtext'] }, wirkung }))).toBeNull();
  });
});

describe('Auswerter: Wortliste', () => {
  it('trifft ein Wort aus der Liste, ohne Liste nichts', () => {
    const condition = base({ alle: [{ liste: 'hersteller' }] });
    const input = position('Fliesen Fabrikat Acmeline verlegen.');
    expect(matchCondition(condition, input, CONTEXT)[0]?.marks).toEqual([{ start: 17, end: 25 }]);
    expect(matchCondition(condition, input)).toEqual([]);
  });

  it('„nicht“ mit einer Liste verwirft den Satz', () => {
    const condition = base({
      alle: [{ begriff: 'Fabrikat' }],
      nicht: [{ liste: 'hersteller' }],
    });
    expect(matchCondition(condition, position('Fabrikat Beispielwerk.'), CONTEXT)).toEqual([]);
    expect(matchCondition(condition, position('Fabrikat frei wählbar.'), CONTEXT)).toHaveLength(1);
  });
});

describe('Auswerter: Angaben der Position', () => {
  const stunden = position('Facharbeiter', { menge: 20, einheit: 'Std.', art: 'normal' });
  const leer = position('Baustelle räumen', { menge: null, einheit: null, art: 'bedarf' });

  it('Einheiten-Gruppe trifft die ganze Position', () => {
    const condition = base({ alle: [{ einheit: { gruppe: 'Stunde' } }] });
    expect(matchCondition(condition, stunden, CONTEXT)).toEqual([
      { feld: 'position', start: 0, end: 0, marks: [] },
    ]);
    expect(matchCondition(condition, leer, CONTEXT)).toEqual([]);
    // Ohne Gruppe trifft nichts.
    expect(matchCondition(condition, stunden)).toEqual([]);
  });

  it('Menge oder Einheit leer, Art aus einer Liste', () => {
    expect(matchCondition(base({ alle: [{ feld: 'menge', ist: 'leer' }] }), leer)).toHaveLength(1);
    expect(matchCondition(base({ alle: [{ feld: 'einheit', ist: 'leer' }] }), leer)).toHaveLength(
      1,
    );
    const art = base({ alle: [{ feld: 'art', ist: ['bedarf', 'alternativ'] }] });
    expect(matchCondition(art, leer)).toHaveLength(1);
    expect(matchCondition(art, stunden)).toEqual([]);
    const nullMenge = position('x', { menge: 0, einheit: 'm', art: 'normal' });
    // Menge 0 ist nicht leer, sondern ein eigener Wert.
    expect(matchCondition(base({ alle: [{ feld: 'menge', ist: 'leer' }] }), nullMenge)).toEqual([]);
    expect(matchCondition(base({ alle: [{ feld: 'menge', ist: ['0'] }] }), nullMenge)).toHaveLength(
      1,
    );
  });

  it('bei „alle“ müssen Angaben stimmen, damit der Text zählt', () => {
    const condition = base({ alle: [{ einheit: { gruppe: 'Stunde' } }, { begriff: 'Facharb*' }] });
    expect(matchCondition(condition, stunden, CONTEXT)).toHaveLength(1);
    expect(matchCondition(condition, position('Facharbeiter'), CONTEXT)).toEqual([]);
  });

  it('bei „eines“ reicht eine Angabe oder ein Begriff', () => {
    const condition = base({
      eines: [{ einheit: { gruppe: 'Stunde' } }, { begriff: 'Stundenlohn*' }],
    });
    expect(matchCondition(condition, stunden, CONTEXT)).toHaveLength(1);
    expect(matchCondition(condition, position('Stundenlohnarbeiten.'), CONTEXT)).toHaveLength(1);
    expect(matchCondition(condition, position('Beton.'), CONTEXT)).toEqual([]);
    // Angabe und Begriff zugleich: die Fundstelle steht vorn.
    const beides = position('Stundenlohnarbeiten.', { menge: 5, einheit: 'h', art: 'normal' });
    expect(matchCondition(condition, beides, CONTEXT).map((hit) => hit.feld)).toEqual([
      'langtext',
      'position',
    ]);
  });

  it('eine stimmende Angabe unter „nicht“ verwirft alles', () => {
    const condition = base({
      alle: [{ begriff: 'Baustelle' }],
      nicht: [{ feld: 'art', ist: ['bedarf'] }],
    });
    expect(matchCondition(condition, leer)).toEqual([]);
  });

  it('ohne Angaben (z. B. PDF) trifft kein Angaben-Baustein', () => {
    const condition = base({ alle: [{ feld: 'menge', ist: 'leer' }] });
    expect(matchCondition(condition, { kurztext: '', langtext: 'x' })).toEqual([]);
  });
});

describe('Auswerter: PDF und eingebaute Bausteine', () => {
  it('sucht im PDF-Text', () => {
    const condition = base({ alle: [{ begriff: 'Bodenplatte' }], wo: ['pdf'] });
    const input: RuleText = { kurztext: '', langtext: '', pdf: 'Die Bodenplatte aus WU-Beton.' };
    expect(matchCondition(condition, input)[0]).toMatchObject({ feld: 'pdf', start: 0 });
  });

  it('ruft die eingebaute Logik mit ihren Parametern', () => {
    const seen: unknown[] = [];
    const logic: BuiltinRule = (input, parameter, wo) => {
      seen.push(parameter, wo);
      return input.langtext.includes('.....')
        ? [{ feld: 'langtext', start: 0, end: 5, marks: [{ start: 0, end: 5 }] }]
        : [];
    };
    const condition = base({
      alle: [{ eingebaut: 'offene-stelle', parameter: { punktreihe: 5 } }],
    });
    const context: RuleContext = { eingebaut: new Map([['offene-stelle', logic]]) };
    expect(matchCondition(condition, position('Fabrikat: .....'), context)).toHaveLength(1);
    expect(seen).toEqual([{ punktreihe: 5 }, ['langtext']]);
    // Unbekannt: kein Treffer, kein Fehler.
    expect(matchCondition(condition, position('Fabrikat: .....'))).toEqual([]);
  });
});
