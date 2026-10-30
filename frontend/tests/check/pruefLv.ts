// Ein erfundenes LV mit Grenzfällen für jede Prüfregel. Grundlage des Vergleichs alt/neu
// (Entscheidung 0085, Schritt 2): Die Funde vor dem Umbau stehen in `funde-vorher.json`.

import type { LVDraft, PositionDraft } from '@core';

let next = 0;

function position(section: string, overrides: Partial<PositionDraft>): PositionDraft {
  next += 10;
  return {
    oz: `${section}.${String(next).padStart(4, '0')}`,
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

export function pruefLv(): LVDraft {
  next = 0;
  const a = (overrides: Partial<PositionDraft>) => position('01.001', overrides);
  const b = (overrides: Partial<PositionDraft>) => position('01.002', overrides);
  const rohbau = [
    a({ positionType: 'BEDARF' }),
    a({ positionType: 'ALTERNATIV' }),
    a({ positionType: 'ZULAGENPOSITION' }),
    a({ unit: 'Std' }),
    a({ unit: 'h', shortText: 'Stundenlohnarbeiten Facharbeiter' }),
    a({ unit: 'Std.' }),
    a({ longText: 'Abrechnung als Regiearbeit.' }),
    a({ shortText: 'Regiestunden Helfer', unit: 'St' }),
    a({ longText: 'Kragplattenanschluss Schöck Isokorb Typ K.' }),
    a({ shortText: 'Porenbetonwand Ytong d = 24 cm' }),
    a({ longText: 'Fabrikat Sika oder gleichwertig.' }),
    a({ longText: 'Dichtstoff Sikaflex o. glw.' }),
    a({ longText: `Anschluss Schöck Isokorb. ${'x'.repeat(200)} Dichtband oder gleichwertig.` }),
    a({ longText: 'Stoßfuge schließen, Peripherie anpassen.' }),
    a({ shortText: 'Dämmung Isover', longText: 'oder gleichwertig, Dicke 12 cm.' }),
    a({ longText: 'Gipskarton Knauf, Rigips oder gleichwertig nach Wahl des AN.' }),
    a({ longText: 'Das Risiko der Baugrundverhältnisse trägt der AN vollständig.' }),
    a({ longText: 'Die Kosten TRÄGT DER AUFTRAGNEHMER.' }),
    a({ longText: 'Ausführung unabhängig von den angetroffenen Verhältnissen. Trägt der AN.' }),
    a({ longText: 'Mehrkosten trägt der ANbieter nicht.' }),
    a({ quantity: null }),
    a({ quantity: 0 }),
    a({ unit: null }),
    a({ unit: '', quantity: null }),
    a({ unit: '  ' }),
  ];
  const ausbau = [
    b({ longText: 'Bodenkennwerte gemäß Bodengutachten.' }),
    b({ longText: 'Ausführung wie Pos. 01.001.0010.' }),
    b({ longText: 'Details siehe Anlage 3, Lage laut Plan A-101 und gemäß Baugrundgutachten.' }),
    b({ longText: 'Nach Zeichnung herstellen.' }),
    b({ longText: 'Breite von ........... cm, Höhe ....... cm.' }),
    b({ longText: 'Fabrikat: .....' }),
    b({ longText: 'Typ: vom Bieter einzutragen' }),
    b({ longText: 'usw. ... und so fort.' }),
    b({ longText: 'Vollständig beschrieben.' }),
    b({ unit: 'psch' }),
    b({ unit: 'PSCH' }),
    b({ unit: 'm²' }),
    b({ unit: 'm2' }),
    b({ unit: 'Stk' }),
  ];
  return {
    projectName: 'Prüf-LV',
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
}
