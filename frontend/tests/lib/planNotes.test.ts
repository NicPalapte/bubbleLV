// Pläne messen (Entscheidung 0093): Seitenart, Maßstab, Messungen, Rechenansatz,
// VA-Menge, Speicherform und Austausch der Schlüssel.

import { describe, expect, it } from 'vitest';
import {
  EMPTY_PLAN_NOTES,
  ansatzText,
  evaluateAnsatz,
  evaluateFormula,
  fromStoredPlanNotes,
  measureValue,
  mergePlanNotes,
  pageKindOf,
  parseMass,
  putMeasure,
  rekeyPlanNotes,
  removeMeasure,
  scaleOf,
  setPageKind,
  setQuantity,
  setScale,
  toStoredPlanNotes,
  vaOf,
  type AnsatzTerm,
  type PlanMeasure,
  type PlanNotes,
} from '../../src/lib/docs/planNotes';

const page = { doc: 'abc123def456', page: 2 };

const square: PlanMeasure = {
  ...page,
  id: 'm1',
  kind: 'flaeche',
  points: [
    [0, 0],
    [100, 0],
    [100, 50],
    [0, 50],
  ],
  name: 'Lager',
  links: ['pos-a'],
  at: 1,
};

/** 1 Seiten-Einheit = 0,1 m: 100 × 50 Einheiten sind 10 m × 5 m. */
const scaled = (notes: PlanNotes): PlanNotes =>
  setScale(notes, page, { unit: 0.1, source: 'strecke', at: 1 });

describe('Seitenart und Maßstab', () => {
  it('merkt nur die Umstellung von Hand und nimmt sie zurück', () => {
    const plan = setPageKind(EMPTY_PLAN_NOTES, page, 'plan');
    expect(pageKindOf(plan, page)).toBe('plan');
    expect(setPageKind(plan, page, 'plan')).toBe(plan);
    expect(pageKindOf(setPageKind(plan, page, null), page)).toBeNull();
  });
  it('übernimmt nur gültige Maßstäbe', () => {
    expect(scaleOf(scaled(EMPTY_PLAN_NOTES), page)?.unit).toBe(0.1);
    expect(setScale(EMPTY_PLAN_NOTES, page, { unit: 0, source: 'strecke', at: 1 })).toBe(
      EMPTY_PLAN_NOTES,
    );
  });
});

describe('Messungen', () => {
  it('rechnet Fläche, Länge und Stück mit dem aktuellen Maßstab', () => {
    const scale = scaleOf(scaled(EMPTY_PLAN_NOTES), page);
    expect(measureValue(square, scale)).toBeCloseTo(50);
    expect(measureValue({ ...square, kind: 'laenge' }, scale)).toBeCloseTo(25);
    expect(measureValue({ ...square, kind: 'stueck' }, null)).toBe(4);
    expect(measureValue(square, null)).toBeNull();
  });
  it('lehnt zu wenige Punkte ab und entfernt Messungen', () => {
    const bad = { ...square, points: [[0, 0] as const, [1, 1] as const] };
    expect(putMeasure(EMPTY_PLAN_NOTES, bad)).toBe(EMPTY_PLAN_NOTES);
    const one = putMeasure(EMPTY_PLAN_NOTES, square);
    expect(one.measures).toHaveLength(1);
    expect(removeMeasure(one, 'm1').measures).toHaveLength(0);
  });
});

describe('VA-Menge', () => {
  it('summiert verknüpfte Messungen mal Faktor, Herkunft Plan', () => {
    let notes = scaled(putMeasure(EMPTY_PLAN_NOTES, square));
    notes = putMeasure(notes, { ...square, id: 'm2', name: 'Technik' });
    notes = setQuantity(notes, 'pos-a', { factor: 1.5 });
    const va = vaOf(notes, 'pos-a');
    expect(va?.herkunft).toBe('Plan');
    expect(va?.base).toBeCloseTo(100);
    expect(va?.value).toBeCloseTo(150);
  });
  it('ohne Maßstab oder bei gemischten Arten keine Zahl, mit Grund', () => {
    const noScale = putMeasure(EMPTY_PLAN_NOTES, square);
    expect(vaOf(noScale, 'pos-a')).toMatchObject({ value: null, reason: 'Maßstab fehlt' });
    const mixed = putMeasure(scaled(noScale), { ...square, id: 'm2', kind: 'laenge' });
    expect(vaOf(mixed, 'pos-a')).toMatchObject({ value: null, reason: 'Messarten gemischt' });
  });
  it('ohne Messung und Ansatz gibt es keine VA-Menge', () => {
    expect(vaOf(EMPTY_PLAN_NOTES, 'pos-a')).toBeNull();
  });
  it('Rechenansatz aus angetippten Maßen und Messungen hat Vorrang', () => {
    const mass = (text: string, start: number): AnsatzTerm => ({
      kind: 'mass',
      value: parseMass(text) ?? 0,
      ...page,
      start,
      text,
    });
    const ansatz: AnsatzTerm[] = [
      mass('6,50', 10),
      { kind: 'op', op: '*' },
      mass('5,00', 20),
      { kind: 'op', op: '+' },
      { kind: 'messung', id: 'm1' },
    ];
    const notes = setQuantity(scaled(putMeasure(EMPTY_PLAN_NOTES, square)), 'pos-a', { ansatz });
    const va = vaOf(notes, 'pos-a');
    expect(va?.herkunft).toBe('Rechenansatz');
    expect(va?.value).toBeCloseTo(32.5 + 50);
    expect(ansatzText(ansatz, () => 'Lager')).toBe('6,50 × 5,00 + Lager');
  });
  it('unvollständiger Ansatz ergibt keine Zahl', () => {
    const ansatz: AnsatzTerm[] = [
      { kind: 'messung', id: 'fehlt' },
      { kind: 'op', op: '+' },
    ];
    expect(evaluateAnsatz(ansatz, () => 1)).toBeNull();
    const notes = setQuantity(EMPTY_PLAN_NOTES, 'pos-a', { ansatz });
    expect(vaOf(notes, 'pos-a')).toMatchObject({ value: null, reason: 'Ansatz unvollständig' });
  });
});

describe('evaluateFormula und parseMass', () => {
  it('rechnet Punkt vor Strich, Klammern und Minus', () => {
    expect(evaluateFormula('2+3*4')).toBe(14);
    expect(evaluateFormula('(2+3)*4')).toBe(20);
    expect(evaluateFormula('-(1,5)*2')).toBe(-3);
    expect(evaluateFormula('6,5×2:4')).toBe(3.25);
  });
  it('lehnt alles andere ab', () => {
    expect(evaluateFormula('2+')).toBeNull();
    expect(evaluateFormula('alert(1)')).toBeNull();
    expect(evaluateFormula('1/0')).toBeNull();
  });
  it('liest gedruckte Maße', () => {
    expect(parseMass('6,50')).toBe(6.5);
    expect(parseMass('1.250,5')).toBe(1250.5);
    expect(parseMass('650')).toBe(650);
    expect(parseMass('ca. 6')).toBeNull();
  });
});

describe('Speichern und Schlüssel', () => {
  const full = (): PlanNotes =>
    setQuantity(setPageKind(scaled(putMeasure(EMPTY_PLAN_NOTES, square)), page, 'plan'), 'pos-a', {
      factor: 2,
      ansatz: [{ kind: 'messung', id: 'm1' }],
    });
  it('übersteht Speicherform hin und zurück', () => {
    const back = fromStoredPlanNotes(JSON.parse(JSON.stringify(toStoredPlanNotes(full()))));
    expect(back.measures).toEqual(full().measures);
    expect(back.scales).toEqual(full().scales);
    expect(back.kinds).toEqual(full().kinds);
    expect(back.quantities.get('pos-a')).toEqual(full().quantities.get('pos-a'));
  });
  it('liest Kaputtes als leer', () => {
    expect(fromStoredPlanNotes(null)).toBe(EMPTY_PLAN_NOTES);
    expect(fromStoredPlanNotes({ measures: [{ id: 'x', kind: 'kreis' }] })).toBe(EMPTY_PLAN_NOTES);
  });
  it('tauscht Positions-Schlüssel in Messungen und Mengen', () => {
    const out = rekeyPlanNotes(full(), new Map([['pos-a', 'hash-a']]));
    expect(out.measures[0].links).toEqual(['hash-a']);
    expect(out.quantities.has('hash-a')).toBe(true);
  });
  it('Zusammenführen behält Vorhandenes und nimmt Neues dazu', () => {
    const mine = setScale(EMPTY_PLAN_NOTES, page, { unit: 0.5, source: 'plankopf', at: 2 });
    const merged = mergePlanNotes(mine, full());
    expect(scaleOf(merged, page)?.unit).toBe(0.5);
    expect(merged.measures).toHaveLength(1);
    expect(merged.quantities.has('pos-a')).toBe(true);
  });
});
