// Der Weg einer Fundstelle von der Klassifizierung bis in die Attribute
// (WP-J, Schritt 1). Geprüft wird die Zusage aus
// docs/architecture/data-model.md#spans: `_spans` ist reserviert, die Indizes
// zeigen auf den **Rohtext** des Langtexts, und ohne Fundstelle gibt es den Key
// gar nicht.

import { describe, expect, it } from 'vitest';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import { attrSpans, displayAttributes } from '../../src/lib/attributes';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import { buildTree, collectPositions } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

const CATALOG = parseStlbCsv(
  [
    'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
    '013,"Beton- und Stahlbetonarbeiten",,betonarbeiten|stahlbeton,2023',
  ].join('\n'),
);

const LANGTEXT =
  'Stahlbetonarbeiten: Tragende Wand aus Ortbeton C30/37 nach DIN EN 206, d = 30 cm. ' +
  'Breite der Aussparung ........... cm. Ausführung als Winterbaumaßnahme.';

function position(overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz: '01.001.0010',
    shortText: 'Stahlbetonwand herstellen',
    longText: LANGTEXT,
    unit: 'm3',
    quantity: 12,
    unitPrice: 180,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

function draftWith(...positions: PositionDraft[]): LVDraft {
  return {
    projectName: 'Span-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los 1',
        sections: [{ number: '01.001', label: 'Abschnitt', sections: [], positions }],
      },
    ],
  };
}

const classifier = getClassifier({ catalog: CATALOG });

describe('Fundstellen im Langtext', () => {
  it('liefert das Beispiel aus dem Plan mit korrekter Textstelle', () => {
    const { attributes, spans } = classifier.classify({
      oz: '01.001.0010',
      shortText: 'Stahlbetonwand',
      longText: LANGTEXT,
      unit: 'm3',
    });

    expect(attributes.normen).toEqual(['DIN EN 206']);
    expect(attributes.dicke).toBe('30 cm');
    expect(attributes.beton).toBe('C30/37');
    expect(attributes.fristen).toEqual(['Winterbau']);
    expect(attributes.platzhalter).toEqual(['Textergänzung']);

    for (const span of spans) {
      expect(LANGTEXT.slice(span.start, span.end)).toBe(
        span.key === 'platzhalter' ? '...........' : span.label,
      );
    }
    expect(spans.map((span) => span.key)).toContain('normen');
    expect(spans.map((span) => span.key)).toContain('dicke');
  });

  it('legt die Fundstellen als reserviertes `_spans` in den Attributen ab', () => {
    const classified = classifyDraft(draftWith(position()), classifier);
    const [node] = collectPositions(buildTree(classified));
    const summary = node.position!;

    const spans = attrSpans(summary.attributes);
    expect(spans.length).toBeGreaterThan(0);
    // Reserviert wie `_meta`: taucht nie in der Anzeige der Klassifizierung auf.
    expect(displayAttributes(summary).map(([key]) => key)).not.toContain('_spans');
    expect(displayAttributes(summary).map(([key]) => key)).not.toContain('_meta');
  });

  it('lässt `_spans` weg, wenn es nichts zu markieren gibt', () => {
    const classified = classifyDraft(
      draftWith(position({ longText: 'Baustelle besenrein übergeben.' })),
      classifier,
    );
    const [node] = collectPositions(buildTree(classified));
    expect(node.position!.attributes._spans).toBeUndefined();
    expect(attrSpans(node.position!.attributes)).toEqual([]);
  });

  it('verwirft unbrauchbare Einträge, statt sie zu raten', () => {
    expect(attrSpans({ _spans: 'kaputt' })).toEqual([]);
    expect(attrSpans({ _spans: [{ key: 'normen' }] })).toEqual([]);
    expect(attrSpans({ _spans: [{ key: 'n', start: 5, end: 5, label: 'x' }] })).toEqual([]);
    expect(attrSpans({ _spans: [{ key: 'n', start: 0, end: 3, label: 'DIN' }] })).toHaveLength(1);
  });
});
