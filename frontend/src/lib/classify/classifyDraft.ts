// Klassifizierung auf LVDraft-Ebene: läuft quellenunabhängig vor buildTree() und
// schreibt das Ergebnis nach PositionDraft.attributes
// (docs/architecture/pipeline.md#ablauf). Reine Funktion — der Eingabe-Draft
// bleibt unverändert.

import type { LotDraft, LVDraft, PositionDraft, SectionDraft } from '../../types/lvDraft';
import type { Classifier } from './types';

function classifyPosition(position: PositionDraft, classifier: Classifier): PositionDraft {
  const { attributes, meta } = classifier.classify({
    oz: position.oz,
    shortText: position.shortText,
    longText: position.longText,
    unit: position.unit,
  });
  // `_meta` ist reserviert und wird von den Facetten ignoriert (data-model.md).
  return { ...position, attributes: { ...attributes, _meta: meta } };
}

function classifySection(section: SectionDraft, classifier: Classifier): SectionDraft {
  return {
    ...section,
    positions: section.positions.map((position) => classifyPosition(position, classifier)),
    sections: section.sections.map((child) => classifySection(child, classifier)),
  };
}

function classifyLot(lot: LotDraft, classifier: Classifier): LotDraft {
  return { ...lot, sections: lot.sections.map((section) => classifySection(section, classifier)) };
}

export function classifyDraft(draft: LVDraft, classifier: Classifier): LVDraft {
  return { ...draft, lots: draft.lots.map((lot) => classifyLot(lot, classifier)) };
}
