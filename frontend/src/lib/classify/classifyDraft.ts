// Klassifizierung auf LVDraft-Ebene: läuft quellenunabhängig vor buildTree() und
// schreibt das Ergebnis nach PositionDraft.attributes
// (docs/architecture/pipeline.md#ablauf). Reine Funktion — der Eingabe-Draft
// bleibt unverändert.

import type { LotDraft, LVDraft, PositionDraft, SectionDraft } from '../../types/lvDraft';
import type { Classifier } from './types';

function classifyPosition(
  position: PositionDraft,
  classifier: Classifier,
  headings: readonly string[],
): PositionDraft {
  const { attributes, meta, spans } = classifier.classify({
    oz: position.oz,
    shortText: position.shortText,
    longText: position.longText,
    unit: position.unit,
    headings,
  });
  // `_meta` und `_spans` sind reserviert und werden von den Facetten ignoriert
  // (data-model.md). `_spans` bleibt weg, wenn nichts gefunden wurde — ein
  // leeres Array je Position kostet bei ~10k Positionen nur Speicher.
  return {
    ...position,
    attributes: { ...attributes, _meta: meta, ...(spans.length > 0 ? { _spans: spans } : {}) },
  };
}

/**
 * Überschriftenpfad von innen nach außen: der eigene Abschnitt zuerst, dann
 * seine Eltern bis zum Los. Die nächstgelegene Überschrift beschreibt die
 * Position am genauesten.
 */
function withHeading(trail: readonly string[], label: string | null): readonly string[] {
  return label === null || label === '' ? trail : [label, ...trail];
}

function classifySection(
  section: SectionDraft,
  classifier: Classifier,
  trail: readonly string[],
): SectionDraft {
  const headings = withHeading(trail, section.label);
  return {
    ...section,
    positions: section.positions.map((position) =>
      classifyPosition(position, classifier, headings),
    ),
    sections: section.sections.map((child) => classifySection(child, classifier, headings)),
  };
}

function classifyLot(lot: LotDraft, classifier: Classifier): LotDraft {
  const headings = withHeading([], lot.label);
  return {
    ...lot,
    sections: lot.sections.map((section) => classifySection(section, classifier, headings)),
  };
}

export function classifyDraft(draft: LVDraft, classifier: Classifier): LVDraft {
  return { ...draft, lots: draft.lots.map((lot) => classifyLot(lot, classifier)) };
}
