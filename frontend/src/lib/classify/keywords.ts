// "Besonderheiten" — Stichworte, die für jede Position gesetzt werden
// (docs/architecture/data-model.md). Anzeigewerte, keine Normaussage: erkannt wird
// nur, was wörtlich im Kurz-/Langtext steht.

import { allMatches, type NormalizedItem } from './text';

const MARKER: ReadonlyArray<{ label: string; keywords: readonly string[] }> = [
  { label: 'WU-Beton', keywords: ['wu-beton', 'wu beton', 'wasserundurchlässig'] },
  { label: 'Sichtbeton', keywords: ['sichtbeton'] },
  { label: 'Fertigteil', keywords: ['fertigteil', 'halbfertigteil', 'elementdecke'] },
  { label: 'Ortbeton', keywords: ['ortbeton'] },
  { label: 'Brandschutz', keywords: ['brandschutz', 'feuerwiderstand', 'f90', 'r90'] },
  { label: 'Schallschutz', keywords: ['schallschutz', 'schalldämm'] },
  { label: 'Wärmedämmung', keywords: ['wärmedämm', 'dämmung'] },
  { label: 'Abdichtung', keywords: ['abdichtung', 'bitumenbahn'] },
  { label: 'Rückbau', keywords: ['rückbau', 'abbruch', 'demontage'] },
  // Bewusst keine Kürzel wie "PAK"/"KMF": als Teilstring treffen sie zu viele
  // unverwandte Wörter ("kompakt", "Verpackung").
  { label: 'Schadstoff', keywords: ['asbest', 'schadstoff', 'kontaminiert'] },
  { label: 'Winterbau', keywords: ['winterbau', 'frostschutz', 'beheizung'] },
  { label: 'Bestand', keywords: ['bestand', 'altbau', 'bestandsbauteil'] },
];

/** Zementarten nach DIN EN 197-1, z. B. "CEM III/A". */
const ZEMENT = /\bcem\s?[iv]{1,3}(?:\/[a-c])?\b/g;

/** Referenzierte Normen im Text, z. B. "DIN EN 206" oder "DIN 1045-2". */
const NORM = /\bdin(?:\s?en)?(?:\s?iso)?\s?\d{2,5}(?:-\d+)?\b/g;

function upper(values: string[]): string[] {
  return values.map((value) => value.replace(/\s+/g, ' ').toUpperCase());
}

export function extractKeywords(text: NormalizedItem): string[] {
  const found = new Set<string>();
  for (const entry of MARKER) {
    if (entry.keywords.some((keyword) => text.all.includes(keyword))) found.add(entry.label);
  }
  for (const zement of upper(allMatches(text.all, ZEMENT))) found.add(zement);
  for (const norm of upper(allMatches(text.all, NORM))) found.add(norm);
  return [...found];
}
