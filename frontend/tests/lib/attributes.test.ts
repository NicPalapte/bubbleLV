import { describe, expect, it } from 'vitest';
import { attrMeta } from '../../src/lib/attributes';

const BASIS = { classifier: 'rule', ruleset: 'fallback', version: 1, confidence: 1 };

describe('attrMeta — zuordnung', () => {
  it('liest Alternativen und das Kennzeichen mehrdeutig', () => {
    const meta = attrMeta({
      _meta: {
        ...BASIS,
        gewerkQuelle: 'position',
        zuordnung: {
          gewerk: {
            mehrdeutig: true,
            alternativen: [{ code: '004', label: 'Pflanzen', stichwort: 'landschaftsbauarbeiten' }],
          },
        },
      },
    });
    expect(meta?.zuordnung?.gewerk).toEqual({
      mehrdeutig: true,
      alternativen: [{ code: '004', label: 'Pflanzen', stichwort: 'landschaftsbauarbeiten' }],
    });
  });

  it('lässt `zuordnung` weg, wenn sie fehlt', () => {
    expect(attrMeta({ _meta: BASIS })?.zuordnung).toBeUndefined();
  });

  it('verwirft unvollständige Einträge statt zu raten', () => {
    const meta = attrMeta({
      _meta: {
        ...BASIS,
        zuordnung: {
          gewerk: { mehrdeutig: false, alternativen: [{ code: '004' }, 'quatsch', null] },
          bauteiltyp: 'kaputt',
          positionsart: { alternativen: 'nein' },
        },
      },
    });
    expect(meta?.zuordnung).toBeUndefined();
  });

  it('wertet mehrdeutig nur bei `true` als wahr', () => {
    const meta = attrMeta({
      _meta: {
        ...BASIS,
        zuordnung: {
          gewerk: { mehrdeutig: 'ja', alternativen: [{ code: '004', label: 'Pflanzen' }] },
        },
      },
    });
    expect(meta?.zuordnung?.gewerk?.mehrdeutig).toBe(false);
    expect(meta?.zuordnung?.gewerk?.alternativen[0].stichwort).toBe('');
  });
});
