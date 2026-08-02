import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGaebParser, mapToLvDraft } from '../../src/lib/gaeb';
import type { LVDraft, PositionDraft, SectionDraft } from '../../src/types/lvDraft';

const parser = getGaebParser();
const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function draftFrom(name: string): LVDraft {
  return mapToLvDraft(parser.parse(new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name))), name));
}

function positionsOf(sections: SectionDraft[]): PositionDraft[] {
  return sections.flatMap((section) => [...section.positions, ...positionsOf(section.sections)]);
}

function allPositions(draft: LVDraft): PositionDraft[] {
  return draft.lots.flatMap((lot) => positionsOf(lot.sections));
}

function byOz(draft: LVDraft, oz: string): PositionDraft {
  const position = allPositions(draft).find((candidate) => candidate.oz === oz);
  if (position === undefined) throw new Error(`Position ${oz} nicht gefunden`);
  return position;
}

describe('mapToLvDraft', () => {
  it('übernimmt Projektkopf und Struktur', () => {
    const draft = draftFrom('sample.X83');

    expect(draft.projectName).toBe('Testprojekt Umbau');
    expect(draft.client).toBe('Muster AG');
    expect(draft.lots).toHaveLength(1);
    expect(draft.lots[0].sections.map((section) => section.number)).toEqual(['01.01', '01.02']);
    expect(allPositions(draft)).toHaveLength(3);
  });

  it('lässt attributes für classify() leer', () => {
    for (const position of allPositions(draftFrom('sample.X83'))) {
      expect(position.attributes).toEqual({});
    }
  });

  it('trägt kein GAEB-Vokabular ins Zwischenmodell', () => {
    const position = byOz(draftFrom('sample.X83'), '01.01.0010');

    expect(Object.keys(position).sort()).toEqual([
      'attributes',
      'longText',
      'oz',
      'positionType',
      'quantity',
      'shortText',
      'unit',
      'unitPrice',
    ]);
    expect(position).not.toHaveProperty('itemType');
  });

  it('mappt Pauschalpositionen auf NORMAL', () => {
    expect(byOz(draftFrom('sample.X83'), '01.02.0010').positionType).toBe('NORMAL');
  });

  it('mappt die GAEB-Positionsarten auf PositionType', () => {
    const draft = draftFrom('gaeb-xml-beispiel.x83');

    expect(byOz(draft, '001.002.0040').positionType).toBe('NORMAL');
    expect(byOz(draft, '001.002.0050').positionType).toBe('ALTERNATIV');
    expect(byOz(draft, '001.001.0010.1').positionType).toBe('BEDARF');
    expect(byOz(draft, '002.001.0030').positionType).toBe('ZULAGENPOSITION');
  });
});
