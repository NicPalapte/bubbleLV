import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fileIdOf, hashPosition, hashPositions } from '../../src/hash/positionHash';
import type { LVDraft, PositionDraft } from '../../src/model/lvDraft';

function pos(overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz: '01.02.0010',
    shortText: 'Wand C30/37',
    longText: 'Stahlbetonwand\nd = 24 cm',
    unit: 'm3',
    quantity: 12.5,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

function lv(positions: PositionDraft[]): LVDraft {
  return {
    projectName: null,
    client: null,
    lots: [
      {
        number: '1',
        label: null,
        sections: [{ number: '01', label: null, positions, sections: [] }],
      },
    ],
  };
}

describe('hashPosition', () => {
  it('liefert kurze Hex-Hashes', () => {
    const h = hashPosition(pos());
    expect(h.id).toMatch(/^[0-9a-f]{10}$/);
    expect(h.oz).toMatch(/^[0-9a-f]{16}$/);
    expect(h.text).toMatch(/^[0-9a-f]{16}$/);
    expect(h.menge).toMatch(/^[0-9a-f]{16}$/);
  });

  it('ignoriert Preis, Klassifizierung und Leerraum', () => {
    const a = hashPosition(pos());
    expect(hashPosition(pos({ unitPrice: 123.45 }))).toEqual(a);
    expect(hashPosition(pos({ attributes: { material: 'Beton' } }))).toEqual(a);
    expect(hashPosition(pos({ longText: '  Stahlbetonwand   d = 24 cm\n' }))).toEqual(a);
    expect(hashPosition(pos({ unit: 'M3.' }))).toEqual(a);
  });

  it('trennt OZ, Text und Menge in den Teil-Hashes', () => {
    const a = hashPosition(pos());
    const neueOz = hashPosition(pos({ oz: '01.02.0020' }));
    expect(neueOz.id).not.toBe(a.id);
    expect(neueOz.oz).not.toBe(a.oz);
    expect(neueOz.text).toBe(a.text);
    expect(neueOz.menge).toBe(a.menge);

    const neuerText = hashPosition(pos({ longText: 'Stahlbetonwand d = 30 cm' }));
    expect(neuerText.id).not.toBe(a.id);
    expect(neuerText.oz).toBe(a.oz);
    expect(neuerText.text).not.toBe(a.text);

    const neueMenge = hashPosition(pos({ quantity: 13 }));
    expect(neueMenge.id).not.toBe(a.id);
    expect(neueMenge.text).toBe(a.text);
    expect(neueMenge.menge).not.toBe(a.menge);

    expect(hashPosition(pos({ positionType: 'BEDARF' })).id).not.toBe(a.id);
  });
});

describe('hashPositions', () => {
  it('macht gleiche Positionen in Dateireihenfolge eindeutig', () => {
    const erste = pos();
    const zweite = pos();
    const dritte = pos();
    const hashes = hashPositions(lv([erste, zweite, dritte]));
    const id = hashPosition(erste).id;
    expect(hashes.get(erste)?.id).toBe(id);
    expect(hashes.get(zweite)?.id).toBe(`${id}-2`);
    expect(hashes.get(dritte)?.id).toBe(`${id}-3`);
  });
});

describe('fileIdOf', () => {
  it('nimmt die ersten 12 Zeichen des SHA-256 der Bytes', () => {
    const bytes = new TextEncoder().encode('<GAEB/>');
    const expected = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    expect(fileIdOf(bytes)).toBe(expected);
    expect(fileIdOf(bytes.buffer)).toBe(expected);
  });
});
