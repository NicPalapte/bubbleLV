// Import-Log des Überblicks: findet Lücken in der Datei, zählt nur Funde und
// rechnet immer über die ganze Datei.

import { describe, expect, it } from 'vitest';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildImportLog } from '../../src/lib/overview/importLog';
import { buildTree } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

function position(oz: string, patch: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz,
    shortText: `Position ${oz}`,
    longText: 'Langtext',
    unit: 'm²',
    quantity: 10,
    unitPrice: 5,
    positionType: 'NORMAL',
    attributes: { gewerk: 'Mauerwerk' },
    ...patch,
  };
}

function logOf(positions: PositionDraft[]) {
  const draft: LVDraft = {
    projectName: 'Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [{ number: '01.01', label: 'Abschnitt', positions, sections: [] }],
      },
    ],
  };
  return buildImportLog(buildPositionIndex(buildTree(draft)));
}

describe('buildImportLog', () => {
  it('meldet nichts, wenn die Datei lückenlos ist', () => {
    const log = logOf([position('01.01.0010'), position('01.01.0020')]);
    expect(log.total).toBe(2);
    expect(log.entries).toEqual([]);
  });

  it('findet fehlende Einheit, Menge, Preis und Gewerk', () => {
    const log = logOf([
      position('01.01.0010'),
      position('01.01.0020', { unit: null }),
      position('01.01.0030', { quantity: null }),
      position('01.01.0040', { unitPrice: null }),
      position('01.01.0050', { attributes: {} }),
    ]);
    const counts = Object.fromEntries(log.entries.map((e) => [e.kind, e.positionIds.length]));
    expect(counts).toEqual({ ohneEinheit: 1, ohneMenge: 1, ohnePreis: 1, ohneGewerk: 1 });
  });

  it('wertet fehlende Preise nicht als Lücke, wenn die Datei gar keine führt', () => {
    const log = logOf([
      position('01.01.0010', { unitPrice: null }),
      position('01.01.0020', { unitPrice: null }),
    ]);
    expect(log.entries.find((e) => e.kind === 'ohnePreis')).toBeUndefined();
  });

  it('nennt jede Position einer doppelten OZ genau einmal', () => {
    const log = logOf([position('01.01.0010'), position('01.01.0010'), position('01.01.0010')]);
    const entry = log.entries.find((e) => e.kind === 'doppelteOz');
    expect(entry?.positionIds).toHaveLength(3);
    expect(new Set(entry?.positionIds).size).toBe(3);
  });

  it('erkennt Positionen ganz ohne Text', () => {
    const log = logOf([position('01.01.0010', { shortText: '', longText: ' ' })]);
    expect(log.entries.find((e) => e.kind === 'ohneText')?.positionIds).toHaveLength(1);
  });
});
