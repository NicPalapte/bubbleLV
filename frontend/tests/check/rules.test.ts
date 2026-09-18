// Prüfregeln (WP-K). Je Regel ein Fall mit Treffer **und** einer ohne — eine
// Regel, die immer oder nie anschlägt, ist keine Regel.
//
// Zusätzlich die Zusagen aus docs/domain/vob-pruefungen.md: fehlende
// Referenzdaten machen eine Regel inaktiv statt fehlerhaft, und ein nicht
// bestätigter Norm-Verweis ist als solcher markiert.

import { describe, expect, it } from 'vitest';
import { CHECK_RULES, runChecks } from '../../src/lib/check';
import type { CheckRule } from '../../src/lib/check';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import { formatEuro } from '../../src/lib/format';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { buildRelations } from '../../src/lib/relate';
import { buildTree, collectPositions } from '../../src/lib/tree/buildTree';
import type { CheckResult, RuleStatus } from '../../src/lib/check';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

const CATALOG = parseStlbCsv(
  [
    'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
    '013,"Beton- und Stahlbetonarbeiten",,betonarbeiten|stahlbeton,2023',
    '091,Stundenlohnarbeiten,personal,stundenlohnarbeiten,2023',
  ].join('\n'),
);

const classifier = getClassifier({ catalog: CATALOG });

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
  // G4 vergleicht gegen die Cluster aus WP-M — die gehören zum Kontext.
  return runChecks(index, summarize(index), buildRelations(index));
}

function rule(result: CheckResult, id: string): RuleStatus {
  const status = result.rules.find((entry) => entry.id === id);
  expect(status, `Regel ${id} ist nicht angemeldet`).toBeDefined();
  return status as RuleStatus;
}

function flagsOf(result: CheckResult, id: string) {
  return result.flags.filter((flag) => flag.id === id);
}

describe('V1 · Bedarfsposition', () => {
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

  it('schweigt in einem LV ohne Bedarfspositionen', () => {
    expect(flagsOf(check(position({})), 'V1')).toHaveLength(0);
  });
});

describe('V2 · Stundenlohnarbeiten', () => {
  it('erkennt die Zeiteinheit über die gepflegte Gruppe', () => {
    const result = check(position({ oz: '01.001.0010', unit: 'Std' }));
    expect(flagsOf(result, 'V2')).toHaveLength(1);
  });

  it('erkennt Regiearbeit auch ohne Zeiteinheit', () => {
    const result = check(position({ longText: 'Abrechnung als Regiearbeit.' }));
    expect(flagsOf(result, 'V2')).toHaveLength(1);
  });

  it('schweigt bei einer normalen Position', () => {
    expect(flagsOf(check(position({ unit: 'm3' })), 'V2')).toHaveLength(0);
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

  it('schweigt ohne solche Formulierung', () => {
    expect(flagsOf(check(position({ longText: 'Beton C30/37 einbauen.' })), 'V4')).toHaveLength(0);
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
    expect(flag.title).toContain('Gutachten');
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

/** `count` Positionen mit aufsteigender OZ, Menge und Preis. */
function viele(count: number, overrides: Partial<PositionDraft> = {}): PositionDraft[] {
  return Array.from({ length: count }, (_, i) =>
    position({
      oz: `01.001.${String((i + 1) * 10).padStart(4, '0')}`,
      quantity: i + 1,
      unitPrice: i + 1,
      ...overrides,
    }),
  );
}

describe('G1 · Kostentreiber', () => {
  it('reiht nach Anteil an der Gesamtsumme', () => {
    const result = check(...viele(12));
    const flags = flagsOf(result, 'G1');
    expect(flags).toHaveLength(10);
    // Die teuerste Position ist die mit der größten Menge × EP.
    expect(flags[0].positionId).toContain('01.001.0120');
    expect(flags[0].title).toContain('Rang 1');
    expect(flags[0].title).toContain('%');
  });

  it('schweigt, wenn die Datei keine Preise führt', () => {
    expect(flagsOf(check(...viele(12, { unitPrice: null })), 'G1')).toHaveLength(0);
  });

  it('schweigt bei zu wenigen Positionen — „Rang 2 von 2" sagt nichts', () => {
    expect(flagsOf(check(...viele(3)), 'G1')).toHaveLength(0);
  });
});

describe('G2 · Mengentreiber', () => {
  it('vergleicht nur innerhalb derselben Einheit', () => {
    const result = check(
      ...viele(12, { unit: 'm3' }),
      position({ oz: '01.002.0010', unit: 'Stck', quantity: 99_999 }),
    );
    const flags = flagsOf(result, 'G2');
    // Die einzelne Stück-Position bildet keine Rangliste — trotz Riesenmenge.
    expect(flags).toHaveLength(10);
    expect(flags.every((flag) => flag.title.includes('m3'))).toBe(true);
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

describe('G4 · Einheitspreis fällt aus der Gruppe', () => {
  /** Fünf gleichlautende Positionen; nur der letzte Preis ist der Prüfling. */
  function gruppe(...preise: number[]) {
    return check(
      ...preise.map((unitPrice, i) =>
        position({
          oz: `01.001.00${i + 1}0`,
          shortText: 'Innenwand herstellen',
          longText: 'Herstellen einer tragenden Innenwand aus Beton, Abrechnung nach Aufmaß.',
          unitPrice,
        }),
      ),
    );
  }

  it('meldet den Preis, der aus dem Rahmen seiner Gruppe fällt', () => {
    const flags = flagsOf(gruppe(100, 105, 110, 115, 900), 'G4');
    expect(flags).toHaveLength(1);
    expect(flags[0].positionId).toContain('01.001.0050');
    expect(flags[0].title).toContain('Median');
  });

  it('schreibt Beträge wie der Rest der Oberfläche', () => {
    // Derselbe Ausreißer steht auch auf der Cluster-Karte der Ansicht
    // „Ähnlichkeit"; beide gehen durch `formatEuro`, also mit zwei
    // Nachkommastellen — sonst liest man je Ansicht eine andere Zahl.
    const [flag] = flagsOf(gruppe(100, 105, 110, 115, 900), 'G4');
    expect(flag.title).toContain(formatEuro(900));
    expect(flag.title).toContain(`Median ${formatEuro(110)}`);
  });

  it('schweigt, solange die Preise der Gruppe beieinanderliegen', () => {
    expect(flagsOf(gruppe(100, 105, 110, 115, 120), 'G4')).toHaveLength(0);
  });

  it('schweigt in einer Datei ohne Preise', () => {
    const result = check(
      ...[100, 105, 110, 115, 900].map((_, i) =>
        position({ oz: `01.001.00${i + 1}0`, unitPrice: null }),
      ),
    );
    expect(flagsOf(result, 'G4')).toHaveLength(0);
  });

  it('bleibt ein Hinweis und wird nie zum Urteil', () => {
    const [flag] = flagsOf(gruppe(100, 105, 110, 115, 900), 'G4');
    expect(flag.title).not.toMatch(/unzulässig|Verstoß|verboten|fehlerhaft|falsch/i);
  });
});

describe('Regelzustand', () => {
  const result = check(position({}));

  it('meldet jede Regel des Katalogs, auch die inaktiven', () => {
    expect(result.rules.map((entry) => entry.id)).toEqual(CHECK_RULES.map((entry) => entry.id));
  });

  it('macht eine Regel ohne Referenzdaten inaktiv — mit Grund, ohne Fehler', () => {
    const v3 = rule(result, 'V3');
    expect(v3.active).toBe(false);
    expect(v3.count).toBe(0);
    expect(v3.inactiveReason).toContain('hersteller-produktnamen.csv');
    expect(flagsOf(result, 'V3')).toHaveLength(0);
  });

  it('markiert einen noch nicht bestätigten Norm-Verweis als solchen', () => {
    const v1 = rule(result, 'V1');
    expect(v1.ruleRef).toBe('VOB/A § 7 Abs. 1 Nr. 4');
    expect(v1.refConfirmed).toBe(false);

    const v7 = rule(result, 'V7');
    expect(v7.refConfirmed).toBe(true);
  });

  it('nennt zu jeder Regel einen Verweis oder sagt, dass es keinen gibt', () => {
    for (const entry of result.rules) {
      expect(entry.ruleRef, `Regel ${entry.id} ohne Verweis`).not.toBe('');
    }
  });

  it('formuliert jeden Hinweis als Hinweis, nicht als Urteil', () => {
    const urteile = ['unzulässig', 'verstoß', 'verboten', 'fehlerhaft', 'falsch'];
    for (const entry of result.rules) {
      const text = `${entry.label} ${entry.hint}`.toLowerCase();
      for (const wort of urteile) {
        expect(text, `Regel ${entry.id} urteilt: "${wort}"`).not.toContain(wort);
      }
    }
  });
});

describe('Eine stolpernde Regel hält den Import nicht an', () => {
  const kaputt: CheckRule = {
    id: 'V1', // vorhandene ID, damit der Eintrag in pruefregeln.csv greift
    label: 'Absichtlich fehlerhaft',
    category: 'vob',
    severity: 'hinweis',
    hint: 'Nur für den Test.',
    check() {
      throw new TypeError('absichtlich');
    },
  };

  it('meldet sie als inaktiv mit Grund, statt selbst zu werfen', () => {
    const tree = buildTree(
      classifyDraft(
        {
          projectName: null,
          client: null,
          lots: [
            {
              number: '01',
              label: null,
              sections: [
                { number: '01.001', label: null, sections: [], positions: [position({})] },
              ],
            },
          ],
        },
        classifier,
      ),
    );
    const index = buildPositionIndex(tree);

    const result = runChecks(index, summarize(index), buildRelations(index), [kaputt]);
    expect(result.flags).toEqual([]);
    const [status] = result.rules;
    expect(status.active).toBe(false);
    expect(status.inactiveReason).toContain('absichtlich');
  });
});

describe('Echte Beispieldatei', () => {
  it('findet in der Musterdatei Hinweise mit gültigem Sprungziel', async () => {
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
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
    expect(lv.check.flags.filter((flag) => flag.id === 'V7')).toHaveLength(1);
  });
});
