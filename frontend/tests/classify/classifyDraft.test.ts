// classifyDraft klassifiziert jede Position, auch in tiefer liegenden
// Abschnitten. Der Eingabe-Draft bleibt dabei unverändert — die Klassifizierung
// ist eine reine Funktion (docs/architecture/pipeline.md#ablauf).

import { describe, expect, it } from 'vitest';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

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

describe('classifyDraft', () => {
  const classified = classifyDraft(DRAFT, getClassifier());
  const section = classified.lots[0].sections[0];

  it('klassifiziert Positionen jeder Ebene', () => {
    expect(section.positions[0].attributes._meta).toMatchObject({ classifier: 'rule' });
    expect(section.sections[0].positions[0].attributes._meta).toMatchObject({
      classifier: 'rule',
    });
  });

  it('leitet aus Überschriften kein Gewerk mehr ab', () => {
    expect(section.positions[0].attributes).not.toHaveProperty('gewerk');
  });

  it('lässt den Eingabe-Draft unberührt', () => {
    expect(DRAFT.lots[0].sections[0].positions[0].attributes).toEqual({});
  });
});
