import { describe, expect, it, vi } from 'vitest';
import { toLvExport } from '../../src/export/lvExport';
import type { LVDraft } from '../../src/model/lvDraft';

// Eigene Datei, weil der Mock für das ganze Modul gilt.
vi.mock('../../src/hash/positionHash', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/hash/positionHash')>()),
  hashPositions: () => new Map(),
}));

describe('toLvExport ohne Hash', () => {
  it('bricht als Programmfehler ab, statt eine Position ohne ID auszugeben', () => {
    const draft: LVDraft = {
      projectName: null,
      client: null,
      lots: [
        {
          number: '1',
          label: null,
          sections: [
            {
              number: '01',
              label: null,
              sections: [],
              positions: [
                {
                  oz: '01.0010',
                  shortText: 'Wand',
                  longText: '',
                  unit: 'm3',
                  quantity: 1,
                  unitPrice: null,
                  positionType: 'NORMAL',
                  attributes: {},
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => toLvExport(draft, 'abc')).toThrow('Position 01.0010 ohne Hash');
  });
});
