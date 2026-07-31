// Neutrales Zwischenmodell, quellen-agnostisch (siehe docs/architecture/pipeline.md).
// Kein GAEB-Vokabular ab hier — der Parser ist die einzige Stelle, die auf dieses
// Modell mappt.

export type PositionType = 'NORMAL' | 'ALTERNATIV' | 'BEDARF' | 'ZULAGENPOSITION';

export interface PositionDraft {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  positionType: PositionType;
  // von classify() befüllt, siehe docs/architecture/data-model.md#attributes
  attributes: Record<string, unknown>;
}

export interface SectionDraft {
  number: string;
  label: string | null;
  positions: PositionDraft[];
  sections: SectionDraft[];
}

export interface LotDraft {
  number: string;
  label: string | null;
  sections: SectionDraft[];
}

export interface LVDraft {
  projectName: string | null;
  client: string | null;
  lots: LotDraft[];
}
