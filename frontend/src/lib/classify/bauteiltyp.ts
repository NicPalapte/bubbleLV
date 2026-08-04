// Stufe 1 — Bauteiltyp, nur für positionsart === "bauteil".
// Interne Arbeits-Taxonomie, nicht normativ (docs/domain/README.md). Bewusst klein
// und inkrementell erweiterbar; kein Treffer → null statt geraten.

import { subjectText, type NormalizedItem } from './text';

/** Reihenfolge = Priorität; spezifischere Begriffe stehen vor allgemeineren. */
const BAUTEILTYPEN: ReadonlyArray<{ typ: string; keywords: readonly string[] }> = [
  { typ: 'Bodenplatte', keywords: ['bodenplatte', 'sohlplatte', 'fundamentplatte'] },
  { typ: 'Fundament', keywords: ['fundament', 'streifenfundament', 'einzelfundament'] },
  { typ: 'Unterzug', keywords: ['unterzug', 'überzug', 'randbalken'] },
  { typ: 'Balken', keywords: ['balken', 'riegel'] },
  { typ: 'Stütze', keywords: ['stütze', 'pfeiler', 'säule'] },
  { typ: 'Wand', keywords: ['wand', 'wände', 'mauerwerk', 'schotte'] },
  { typ: 'Decke', keywords: ['decke', 'geschossdecke', 'filigrandecke', 'deckenplatte'] },
  { typ: 'Treppe', keywords: ['treppe', 'treppenlauf', 'podest'] },
  { typ: 'Dach', keywords: ['dach', 'dachfläche', 'attika'] },
  { typ: 'Stürze', keywords: ['sturz', 'stürze'] },
  { typ: 'Bewehrung', keywords: ['bewehrung', 'betonstahl', 'mattenstahl'] },
  { typ: 'Gründung', keywords: ['bohrpfahl', 'rammpfahl', 'schlitzwand', 'spundwand'] },
];

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

export function detectBauteiltyp(item: NormalizedItem): string | null {
  // Nur der benennende Text — der Langtext erwähnt regelmäßig Nachbarbauteile
  // ("mit geböschten Wänden" in einer Erdarbeiten-Position), siehe subjectText().
  const subject = subjectText(item);
  for (const entry of BAUTEILTYPEN) {
    if (entry.keywords.some((keyword) => subject.includes(keyword))) return entry.typ;
  }
  return null;
}
