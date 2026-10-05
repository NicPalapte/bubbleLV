// Stufe 1 — Bauteiltyp, nur für positionsart === "bauteil".
// Interne Arbeits-Taxonomie, nicht normativ (docs/domain/README.md). Bewusst klein
// und inkrementell erweiterbar; kein Treffer → null statt geraten. Die Stichworte
// stehen in der Mappingtabelle (Dimension `bauteiltyp`); das Gewicht dort ist die
// Priorität, spezifischere Begriffe vor allgemeineren.

import { matchTextOf, type MappingIndex } from './mapping';
import type { NormalizedItem } from './text';

/** Bauteiltypen, die tragende Funktion haben können (Basis für `tragend`). */
export const TRAGENDE_BAUTEILTYPEN: readonly string[] = [
  'Bodenplatte',
  'Fundament',
  'Unterzug',
  'Balken',
  'Stütze',
  'Wand',
  'Decke',
  'Treppe',
  'Stürze',
  'Gründung',
];

export function detectBauteiltyp(item: NormalizedItem, mapping: MappingIndex): string | null {
  // Nur der benennende Text — der Langtext erwähnt regelmäßig Nachbarbauteile
  // ("mit geböschten Wänden" in einer Erdarbeiten-Position), siehe subjectText().
  return mapping.match('bauteiltyp', [matchTextOf(item)])?.code ?? null;
}
