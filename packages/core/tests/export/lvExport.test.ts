import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LV_EXPORT_SCHEMA, toLvExport, type LvExportSection } from '../../src/export/lvExport';
import { getGaebParser, mapToLvDraft } from '../../src/gaeb';
import { fileIdOf, hashPositions } from '../../src/hash/positionHash';
import type { LVDraft, PositionDraft, SectionDraft } from '../../src/model/lvDraft';
import { FIXTURE_DIR } from '../support/fixtures';

function load(name: string): { draft: LVDraft; fileId: string } {
  const bytes = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name)));
  return { draft: mapToLvDraft(getGaebParser().parse(bytes, name)), fileId: fileIdOf(bytes) };
}

function draftPositions(sections: SectionDraft[]): PositionDraft[] {
  return sections.flatMap((s) => [...s.positions, ...draftPositions(s.sections)]);
}

function exportPositions(sections: LvExportSection[]): LvExportSection['positions'] {
  return sections.flatMap((s) => [...s.positions, ...exportPositions(s.sections)]);
}

describe('toLvExport', () => {
  it('trägt Schema, Datei-ID und Projektkopf', () => {
    const { draft, fileId } = load('sample.X83');
    const exported = toLvExport(draft, fileId);

    expect(exported.schema).toBe(LV_EXPORT_SCHEMA);
    expect(exported.positionHashSchema).toBe('bubble-pos-v1');
    expect(exported.fileId).toBe(fileId);
    expect(exported.projectName).toBe('Testprojekt Umbau');
    expect(exported.client).toBe('Muster AG');
  });

  it('gibt jeder Position dieselben Hashes wie hashPositions', () => {
    const { draft, fileId } = load('gaeb-xml-beispiel.x83');
    const hashes = hashPositions(draft);
    const expected = draft.lots.flatMap((lot) => draftPositions(lot.sections));
    const actual = toLvExport(draft, fileId).lots.flatMap((lot) => exportPositions(lot.sections));

    expect(actual).toHaveLength(expected.length);
    actual.forEach((position, i) => {
      expect(position.oz).toBe(expected[i].oz);
      expect(position.hashes).toEqual(hashes.get(expected[i]));
    });
  });

  it('lässt die Klassifizierung weg und bleibt JSON-tauglich', () => {
    const { draft, fileId } = load('sample.X83');
    draftPositions(draft.lots[0].sections)[0].attributes = { normen: ['DIN 1045'] };
    const exported = toLvExport(draft, fileId);

    expect(JSON.stringify(exported)).not.toContain('attributes');
    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });
});
