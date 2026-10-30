// Prüfregeln (WP-K). Je Regel ein Fall mit Treffer **und** einer ohne — eine
// Regel, die immer oder nie anschlägt, ist keine Regel.
//
// Zusätzlich die Zusagen aus docs/domain/vob-pruefungen.md: fehlende
// Referenzdaten machen eine Regel inaktiv statt fehlerhaft, und ein nicht
// bestätigter Norm-Verweis ist als solcher markiert. Seit Entscheidung 0085 sind die
// Prüfregeln Regeln im Format `bubble-rule-v1` (docs/domain/reference/regeln.json).

import { describe, expect, it } from 'vitest';
import { CHECK_RULES, checkBewehrung, codeOf, runChecks } from '../../src/lib/check';
import type { CheckBuiltin, CheckRule } from '../../src/lib/check';
import { materialKatalog } from '../../src/lib/classify/material/katalog';
import { RULE_CONTEXT } from '../../src/lib/rules/rules';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { buildTree, collectPositions, indexParents } from '../../src/lib/tree/buildTree';
import type { CheckResult, Fund, RuleStatus } from '../../src/lib/check';
import type { LVDraft, PositionDraft, RuleContext } from '@core';

const classifier = getClassifier();

function position(overrides: Partial<PositionDraft>): PositionDraft {
  return {
    oz: '01.001.0010',
    shortText: 'Position',
    longText: '',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

/** Ein LV aus den gegebenen Positionen, komplett durch die Pipeline gedreht. */
function check(...positions: PositionDraft[]): CheckResult {
  return checkMit({}, ...positions);
}

interface Abweichung {
  rules?: readonly CheckRule[];
  context?: RuleContext;
  builtins?: ReadonlyMap<string, CheckBuiltin>;
}

function checkMit(abweichung: Abweichung, ...positions: PositionDraft[]): CheckResult {
  const draft: LVDraft = {
    projectName: 'Prüf-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [{ number: '01.001', label: 'Abschnitt', sections: [], positions }],
      },
    ],
  };
  const tree = buildTree(classifyDraft(draft, classifier));
  const index = buildPositionIndex(tree);
  return runChecks(
    index,
    summarize(index),
    abweichung.rules,
    new Map(),
    abweichung.context,
    abweichung.builtins,
  );
}

/** Regelzustand über das Kürzel, z. B. „V1“. */
function rule(result: CheckResult, id: string): RuleStatus {
  const status = result.rules.find((entry) => entry.code === id);
  expect(status, `Regel ${id} ist nicht angemeldet`).toBeDefined();
  return status as RuleStatus;
}

function flagsOf(result: CheckResult, id: string) {
  return result.flags.filter((flag) => codeOf(flag.id) === id);
}

const regel = (code: string): CheckRule => {
  const found = CHECK_RULES.find((entry) => codeOf(entry.id) === code);
  expect(found, `Regel ${code} fehlt in regeln.json`).toBeDefined();
  return found as CheckRule;
};

describe('V1 · Bedarfs- und Alternativposition', () => {
  it('findet die Bedarfsposition und nur sie', () => {
    const result = check(
      position({ oz: '01.001.0010', positionType: 'NORMAL' }),
      position({ oz: '01.001.0020', positionType: 'BEDARF' }),
    );
    const flags = flagsOf(result, 'V1');
    expect(flags).toHaveLength(1);
    expect(flags[0].positionId).toContain('01.001.0020');
    expect(rule(result, 'V1').count).toBe(1);
  });

  it('findet auch die Alternativposition, mit eigenem Titel', () => {
    const result = check(
      position({ oz: '01.001.0010', positionType: 'BEDARF' }),
      position({ oz: '01.001.0020', positionType: 'ALTERNATIV' }),
    );
    expect(flagsOf(result, 'V1').map((flag) => flag.title)).toEqual([
      'Bedarfsposition',
      'Alternativposition',
    ]);
  });

  it('schweigt in einem LV ohne Bedarfspositionen', () => {
    expect(flagsOf(check(position({})), 'V1')).toHaveLength(0);
  });
});

describe('V2 · Stundenlohnarbeiten', () => {
  it('erkennt die Zeiteinheit über die gepflegte Gruppe', () => {
    const result = check(position({ oz: '01.001.0010', unit: 'Std' }));
    expect(flagsOf(result, 'V2').map((flag) => flag.title)).toEqual(['Einheit Std (Stunde)']);
  });

  it('erkennt Regiearbeit auch ohne Zeiteinheit', () => {
    const result = check(position({ longText: 'Abrechnung als Regiearbeit.' }));
    expect(flagsOf(result, 'V2')).toHaveLength(1);
  });

  it('schweigt bei einer normalen Position', () => {
    expect(flagsOf(check(position({ unit: 'm3' })), 'V2')).toHaveLength(0);
  });
});

describe('V3 · Produktname ohne „oder gleichwertig"', () => {
  it('findet einen Hersteller- oder Produktnamen im Lang- und Kurztext', () => {
    const result = check(
      position({ oz: '01.001.0010', longText: 'Kragplattenanschluss Schöck Isokorb Typ K.' }),
      position({ oz: '01.001.0020', shortText: 'Porenbetonwand Ytong d = 24 cm' }),
    );
    const flags = flagsOf(result, 'V3');
    expect(flags.map((flag) => flag.title)).toEqual(['Schöck, Isokorb', 'Ytong']);
    expect(flags[0].span?.label).toBe('Schöck');
    expect(flags[1].span).toBeUndefined();
  });

  it('schweigt, wenn die Position „oder gleichwertig" nennt', () => {
    const result = check(
      position({ oz: '01.001.0010', longText: 'Fabrikat Sika oder gleichwertig.' }),
      position({ oz: '01.001.0020', longText: 'Dichtstoff Sikaflex o. glw.' }),
    );
    expect(flagsOf(result, 'V3')).toHaveLength(0);
  });

  it('lässt den Zusatz nur für Namen in seiner Nähe gelten', () => {
    const fern = 'x'.repeat(200);
    const result = check(
      position({
        longText: `Kragplattenanschluss Schöck Isokorb. ${fern} Dichtband oder gleichwertig.`,
      }),
    );
    expect(flagsOf(result, 'V3').map((flag) => flag.title)).toEqual(['Schöck, Isokorb']);
  });

  it('trifft nur ganze Wörter', () => {
    const result = check(position({ longText: 'Stoßfuge schließen, Peripherie anpassen.' }));
    expect(flagsOf(result, 'V3')).toHaveLength(0);
  });
});

describe('V4 · Risiko-Formulierung', () => {
  it('findet die Formulierung samt Fundstelle im Langtext', () => {
    const longText = 'Das Risiko der Baugrundverhältnisse trägt der AN vollständig.';
    const result = check(position({ longText }));
    const [flag] = flagsOf(result, 'V4');
    expect(flag).toBeDefined();
    expect(flag.span).toBeDefined();
    expect(longText.slice(flag.span!.start, flag.span!.end)).toBe('trägt der AN');
  });

  it('schweigt ohne solche Formulierung und trifft nur ganze Wörter', () => {
    expect(flagsOf(check(position({ longText: 'Beton C30/37 einbauen.' })), 'V4')).toHaveLength(0);
    const anbieter = position({ longText: 'Mehrkosten trägt der ANbieter nicht.' });
    expect(flagsOf(check(anbieter), 'V4')).toHaveLength(0);
  });

  it('meldet eine Position einmal, mit allen Formulierungen im Titel', () => {
    const longText = 'Unabhängig von den angetroffenen Verhältnissen. Das trägt der AN.';
    const flags = flagsOf(check(position({ longText })), 'V4');
    expect(flags).toHaveLength(1);
    expect(flags[0].title).toBe('Unabhängig von den angetroffenen Verhältnissen, trägt der AN');
  });
});

describe('V5 · Menge oder Einheit fehlt', () => {
  it('meldet fehlende Menge, Menge 0 und fehlende Einheit', () => {
    const result = check(
      position({ oz: '01.001.0010', quantity: null }),
      position({ oz: '01.001.0020', quantity: 0 }),
      position({ oz: '01.001.0030', unit: null }),
      position({ oz: '01.001.0040' }),
    );
    const flags = flagsOf(result, 'V5');
    expect(flags).toHaveLength(3);
    expect(flags.map((flag) => flag.title)).toEqual(['keine Menge', 'Menge 0', 'keine Einheit']);
  });

  it('schweigt bei vollständigen Angaben', () => {
    expect(flagsOf(check(position({})), 'V5')).toHaveLength(0);
  });
});

describe('V6 · Verweis statt Angabe', () => {
  it('meldet den Verweis auf eine Unterlage außerhalb der Datei', () => {
    const result = check(position({ longText: 'Bodenkennwerte gemäß Bodengutachten.' }));
    const [flag] = flagsOf(result, 'V6');
    expect(flag).toBeDefined();
    expect(flag.title).toBe('gemäß Bodengutachten');
    expect(flag.span).toBeDefined();
  });

  it('wertet einen Verweis innerhalb des LV nicht als fehlende Angabe', () => {
    const result = check(position({ longText: 'Ausführung wie Pos. 01.001.0010.' }));
    expect(flagsOf(result, 'V6')).toHaveLength(0);
  });
});

describe('V7 · Offene Textergänzung', () => {
  it('meldet die Lücke und zählt sie', () => {
    const result = check(position({ longText: 'Breite von ........... cm, Höhe ....... cm.' }));
    const [flag] = flagsOf(result, 'V7');
    expect(flag).toBeDefined();
    expect(flag.title).toContain('2 offene Stellen');
  });

  it('schweigt bei vollständigem Text', () => {
    expect(flagsOf(check(position({ longText: 'Vollständig beschrieben.' })), 'V7')).toHaveLength(
      0,
    );
  });
});

describe('G3 · Einheit uneinheitlich geschrieben', () => {
  it('meldet dieselbe Einheit in zwei Schreibweisen', () => {
    const result = check(
      position({ oz: '01.001.0010', unit: 'psch' }),
      position({ oz: '01.001.0020', unit: 'PSCH' }),
    );
    const flags = flagsOf(result, 'G3');
    expect(flags).toHaveLength(2);
    expect(flags[0].title).toContain('PSCH');
  });

  it('schweigt bei einheitlicher Schreibweise', () => {
    const result = check(
      position({ oz: '01.001.0010', unit: 'm3' }),
      position({ oz: '01.001.0020', unit: 'm3' }),
    );
    expect(flagsOf(result, 'G3')).toHaveLength(0);
  });
});

// M1 steht in regeln.json auf `aus` (15.10.2026). Die eingebaute Logik bleibt,
// damit der Owner sie mit einem Wort wieder einschalten kann — getestet wird sie
// darum direkt, ohne runChecks.
describe('M1 · Bewehrung', () => {
  /** Zwei Hauptabschnitte, damit die Suche nach Betonstahl an der Grenze endet. */
  function zweiAbschnitte(
    rohbau: PositionDraft[],
    ausbau: PositionDraft[],
  ): Array<Fund & { positionId: string }> {
    const draft: LVDraft = {
      projectName: 'Bewehrung',
      client: null,
      lots: [
        {
          number: '01',
          label: 'Los',
          sections: [
            { number: '01.001', label: 'Rohbau', sections: [], positions: rohbau },
            { number: '01.002', label: 'Ausbau', sections: [], positions: ausbau },
          ],
        },
      ],
    };
    const tree = buildTree(classifyDraft(draft, classifier));
    const index = buildPositionIndex(tree);
    const context = { index, summary: summarize(index), parents: indexParents(tree) };
    const funde = checkBewehrung(context, materialKatalog(), 3);
    return [...funde].map(([slot, fund]) => ({ ...fund, positionId: index.nodes[slot].id }));
  }

  const wand = (oz: string, longText: string) =>
    position({ oz, shortText: 'Stahlbetonwand C30/37', longText });
  const stahl = (oz: string) =>
    position({ oz, shortText: 'Betonstahl B500B liefern und einbauen', unit: 't' });

  it('nennt den Betonstahl im selben Hauptabschnitt', () => {
    const result = zweiAbschnitte(
      [wand('01.001.0010', 'Wand d = 25 cm.'), stahl('01.001.0020')],
      [stahl('01.002.0010')],
    );
    const flags = result;
    expect(flags).toHaveLength(1);
    expect(flags[0].positionId).toContain('01.001.0010');
    expect(flags[0].title).toContain('01.001.0020');
    expect(flags[0].title).not.toContain('01.002.0010');
  });

  it('sagt, wenn im Abschnitt auch kein Betonstahl steht', () => {
    const result = zweiAbschnitte([wand('01.001.0010', '')], [stahl('01.002.0010')]);
    expect(result[0].title).toContain('auch kein Betonstahl');
  });

  it('schweigt, wenn die Position die Bewehrung nennt', () => {
    const result = zweiAbschnitte(
      [
        wand('01.001.0010', 'Einschl. Bewehrung.'),
        wand('01.001.0020', 'Bewehrung wird gesondert vergütet.'),
        wand('01.001.0030', 'Unbewehrt.'),
      ],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('schweigt bei Beton ohne Festigkeitsklasse, etwa einer Schalung', () => {
    const schalung = position({ shortText: 'Schalung für Betonwände' });
    expect(zweiAbschnitte([schalung], [])).toHaveLength(0);
  });
});

describe('Regelzustand', () => {
  const result = check(position({}));

  it('meldet jede freigegebene Prüfregel, auch die inaktiven — außer denen auf „aus"', () => {
    const aus = ['V8', 'V9', 'V10', 'M1'];
    expect(CHECK_RULES.filter((entry) => entry.status === 'aus').map((e) => codeOf(e.id))).toEqual(
      aus,
    );
    expect(result.rules.map((entry) => entry.code)).toEqual([
      'V1',
      'V2',
      'V3',
      'V4',
      'V5',
      'V6',
      'V7',
      'G3',
    ]);
    expect(result.flags.some((flag) => aus.includes(codeOf(flag.id)))).toBe(false);
  });

  it('macht eine Regel ohne Wortliste inaktiv — mit Grund, ohne Fehler', () => {
    const ohneListe: RuleContext = { ...RULE_CONTEXT, listen: new Map() };
    const [status] = checkMit({ rules: [regel('V3')], context: ohneListe }, position({})).rules;
    expect(status.active).toBe(false);
    expect(status.count).toBe(0);
    expect(status.inactiveReason).toContain('hersteller-produktnamen.csv');
  });

  it('macht eine Regel ohne Einheiten-Gruppe inaktiv', () => {
    const ohneGruppe: RuleContext = { ...RULE_CONTEXT, einheitGruppen: new Map() };
    const [status] = checkMit({ rules: [regel('V2')], context: ohneGruppe }, position({})).rules;
    expect(status.inactiveReason).toContain('einheiten-gruppen.csv');
  });

  it('nennt eine eingebaute Logik, die es nicht gibt, „noch nicht umgesetzt“', () => {
    const v8 = { ...regel('V8'), status: 'freigegeben' as const };
    const [status] = checkMit({ rules: [v8] }, position({})).rules;
    expect(status.active).toBe(false);
    expect(status.inactiveReason).toBe('Noch nicht umgesetzt.');
  });

  it('übernimmt Norm-Verweis und Stand aus der Regel', () => {
    const v1 = rule(result, 'V1');
    expect(v1.ruleRef).toBe('VOB/A § 7 Abs. 1 Nr. 4');
    expect(v1.refConfirmed).toBe(true);
    expect(v1.label).toBe('Bedarfs- oder Alternativposition');
  });

  it('lässt den Verweis leer, wo es keinen Norm-Bezug gibt', () => {
    expect(rule(result, 'G3').ruleRef).toBe('');
    expect(rule(result, 'V7').ruleRef).toBe('');
    for (const entry of result.rules) {
      expect(entry.ruleRef, `Regel ${entry.id}`).not.toMatch(/kein (Norm|VOB)-Bezug/);
    }
  });

  it('formuliert jeden Hinweis als Hinweis, nicht als Urteil', () => {
    const urteile = ['unzulässig', 'verstoß', 'verboten', 'fehlerhaft', 'falsch'];
    for (const entry of CHECK_RULES) {
      const text = `${entry.name} ${entry.wirkung.pruefhinweis.text}`.toLowerCase();
      for (const wort of urteile) {
        expect(text, `Regel ${entry.id} urteilt: "${wort}"`).not.toContain(wort);
      }
    }
  });
});

describe('Eine stolpernde Regel hält den Import nicht an', () => {
  const kaputt: CheckBuiltin = {
    prepare() {
      throw new TypeError('absichtlich');
    },
  };

  it('fängt auch eine Vorprüfung ab, die wirft', () => {
    const vorpruefung: CheckBuiltin = {
      missing() {
        throw new TypeError('Tabelle kaputt');
      },
      prepare: () => () => [],
    };
    const [status] = checkMit(
      { rules: [regel('G3')], builtins: new Map([['einheit-schreibweise', vorpruefung]]) },
      position({}),
    ).rules;
    expect(status.active).toBe(false);
    expect(status.inactiveReason).toContain('Tabelle kaputt');
  });

  it('meldet sie als inaktiv mit Grund, statt selbst zu werfen', () => {
    const result = checkMit(
      { rules: [regel('G3')], builtins: new Map([['einheit-schreibweise', kaputt]]) },
      position({}),
    );
    expect(result.flags).toEqual([]);
    const [status] = result.rules;
    expect(status.active).toBe(false);
    expect(status.inactiveReason).toContain('absichtlich');
  });
});

describe('Echte Beispieldatei', () => {
  it('findet in der Musterdatei Hinweise mit gültigem Sprungziel', async () => {
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
    const { runPipeline } = await import('../../src/lib/pipeline/runPipeline');
    const lv = runPipeline(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      'beispiel.x83',
    );

    expect(lv.check.flags.length).toBeGreaterThan(0);
    // Jedes Sprungziel muss eine Position im Baum sein — sonst führt der Klick
    // in der Prüfliste ins Leere.
    const ids = new Set(collectPositions(lv.tree).map((node) => node.id));
    for (const flag of lv.check.flags) {
      expect(ids.has(flag.positionId), `${flag.id} zeigt auf ${flag.positionId}`).toBe(true);
    }
    // Die Musterdatei führt zwei offene Textergänzungen in einer Position.
    expect(lv.check.flags.filter((flag) => codeOf(flag.id) === 'V7')).toHaveLength(1);
  });
});
