// classifyDraft reicht die Überschriften der übergeordneten Abschnitte und Lose
// an den Klassifizierer durch (Gewerk aus der Abschnittsüberschrift). Der
// Eingabe-Draft bleibt dabei unverändert — die Klassifizierung ist eine reine
// Funktion (docs/architecture/pipeline.md#ablauf).

import { describe, expect, it } from 'vitest';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

const CATALOG = parseStlbCsv(
  [
    'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
    '002,Erdarbeiten,,erdarbeiten,2023',
    '012,Mauerarbeiten,,mauerarbeiten|mauerwerk,2023',
  ].join('\n'),
);

function position(oz: string, shortText: string): PositionDraft {
  return {
    oz,
    shortText,
    longText: '',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: {},
  };
}

const DRAFT: LVDraft = {
  projectName: 'Überschriften-Test',
  client: null,
  lots: [
    {
      number: '001',
      label: 'Los 1 Rohbau',
      sections: [
        {
          number: '001.001',
          label: 'Titel 01 Erdarbeiten',
          sections: [
            {
              number: '001.001.001',
              label: 'Aushub',
              sections: [],
              positions: [position('001.001.001.0010', 'Baugrube ausheben')],
            },
          ],
          positions: [position('001.001.0010', 'Oberboden abtragen')],
        },
      ],
    },
  ],
};

describe('classifyDraft · Überschriften', () => {
  const classified = classifyDraft(DRAFT, getClassifier({ catalog: CATALOG }));
  const section = classified.lots[0].sections[0];

  it('gibt der Position das Gewerk ihres Titels', () => {
    expect(section.positions[0].attributes.gewerk).toBe('Erdarbeiten');
  });

  it('reicht die Überschrift auch an tiefer liegende Abschnitte weiter', () => {
    // „Aushub" selbst nennt kein Gewerk — der Titel darüber schon.
    expect(section.sections[0].positions[0].attributes.gewerk).toBe('Erdarbeiten');
  });

  it('lässt den Eingabe-Draft unberührt', () => {
    expect(DRAFT.lots[0].sections[0].positions[0].attributes).toEqual({});
  });
});
