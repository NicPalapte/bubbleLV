import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getClassifier, classifyDraft } from '../../src/lib/classify';
import { getGaebParser, mapToLvDraft } from '../../src/lib/gaeb';
import { buildTree, collectPositions, indexParents } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft, SectionDraft } from '../../src/types/lvDraft';
import type { LVNode } from '../../src/types/lvNode';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function draftFrom(name: string): LVDraft {
  const bytes = new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name)));
  return classifyDraft(mapToLvDraft(getGaebParser().parse(bytes, name)), getClassifier());
}

function draftPositions(draft: LVDraft): PositionDraft[] {
  const fromSections = (sections: SectionDraft[]): PositionDraft[] =>
    sections.flatMap((section) => [...section.positions, ...fromSections(section.sections)]);
  return draft.lots.flatMap((lot) => fromSections(lot.sections));
}

function position(oz: string, overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: '',
    unit: 'm3',
    quantity: 2,
    unitPrice: 10,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

describe('buildTree', () => {
  it('rechnet Aggregate bottom-up zusammen', () => {
    const draft: LVDraft = {
      projectName: 'Testprojekt',
      client: null,
      lots: [
        {
          number: '001',
          label: 'Los 1',
          sections: [
            {
              number: '001.001',
              label: 'Abschnitt',
              positions: [position('001.001.0010'), position('001.001.0020')],
              sections: [
                {
                  number: '001.001.1',
                  label: 'Unterabschnitt',
                  positions: [position('001.001.1.0010', { quantity: 3, unitPrice: 5 })],
                  sections: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const tree = buildTree(draft);
    expect(tree.kind).toBe('project');
    expect(tree.label).toBe('Testprojekt');
    expect(tree.positionCount).toBe(3);
    expect(tree.totalPrice).toBe(2 * 10 + 2 * 10 + 3 * 5);

    const lot = tree.children[0];
    expect(lot.kind).toBe('lot');
    expect(lot.positionCount).toBe(3);

    const section = lot.children[0];
    expect(section.positionCount).toBe(3);
    expect(section.children.filter((child) => child.kind === 'position')).toHaveLength(2);
    expect(section.children.filter((child) => child.kind === 'section')).toHaveLength(1);
  });

  it('behandelt fehlende Einheitspreise als 0', () => {
    const draft: LVDraft = {
      projectName: null,
      client: null,
      lots: [
        {
          number: '',
          label: 'LV',
          sections: [
            {
              number: '',
              label: null,
              positions: [
                position('0010', { unitPrice: null }),
                position('0020', { quantity: null }),
              ],
              sections: [],
            },
          ],
        },
      ],
    };
    const tree = buildTree(draft);
    expect(tree.totalPrice).toBe(0);
    expect(tree.positionCount).toBe(2);
  });

  it('vergibt eindeutige IDs, auch wenn Wrapper-Abschnitt und Los dieselbe Nummer tragen', () => {
    const draft: LVDraft = {
      projectName: null,
      client: null,
      lots: [
        {
          number: '001',
          label: 'Los',
          sections: [
            { number: '001', label: null, positions: [position('001.0010')], sections: [] },
            { number: '001', label: 'Doppelt', positions: [position('001.0020')], sections: [] },
          ],
        },
      ],
    };
    const tree = buildTree(draft);
    const ids = new Set<string>();
    const visit = (node: LVNode): void => {
      expect(ids.has(node.id)).toBe(false);
      ids.add(node.id);
      node.children.forEach(visit);
    };
    visit(tree);
    expect(tree.children[0].id).toBe('lot:001');
    expect(tree.children[0].children[0].id).toBe('section:001');
  });

  it('verliert keine Position — LV ohne Los-Ebene (gaeb-xml-beispiel.x83)', () => {
    const draft = draftFrom('gaeb-xml-beispiel.x83');
    const tree = buildTree(draft);
    expect(tree.positionCount).toBe(draftPositions(draft).length);
    expect(collectPositions(tree)).toHaveLength(tree.positionCount);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].code).toBe('');
  });

  it('verliert keine Position — LV mit Los-Ebene (sample.X83)', () => {
    const draft = draftFrom('sample.X83');
    const tree = buildTree(draft);
    expect(tree.positionCount).toBeGreaterThan(0);
    expect(tree.positionCount).toBe(draftPositions(draft).length);
    expect(collectPositions(tree)).toHaveLength(tree.positionCount);
  });

  it('führt jede Position auf einen Abschnitt zurück, nie direkt auf ein Los', () => {
    const tree = buildTree(draftFrom('gaeb-xml-beispiel.x83'));
    const parents = indexParents(tree);
    for (const node of collectPositions(tree)) {
      expect(parents.get(node.id)?.kind).toBe('section');
    }
  });

  it('übernimmt die Klassifizierungs-Attribute in die PositionSummary', () => {
    const tree = buildTree(draftFrom('gaeb-xml-beispiel.x83'));
    const [first] = collectPositions(tree);
    expect(first.position).not.toBeNull();
    expect(first.position?.attributes.positionsart).toBeTypeOf('string');
    expect(first.position?.attributes._meta).toBeTruthy();
  });
});
