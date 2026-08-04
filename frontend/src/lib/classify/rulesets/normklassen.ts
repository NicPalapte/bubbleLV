// Genormte Kurzbezeichnungen, die unabhängig vom Leistungsbereich eindeutig sind:
// Druckfestigkeits- und Expositionsklassen nach DIN EN 206 / DIN 1045-2 sowie
// Feuchtigkeitsklassen nach DIN 1045-2. Erkannt wird nur, was wörtlich im Text
// steht — es wird nichts ergänzt und nichts abgeleitet.
//
// Deshalb dürfen sie auch der FallbackRuleset-Pfad extrahieren: die Schreibweise
// "C30/37" bedeutet in jedem Gewerk dasselbe. Alles Interpretierende (etwa
// `tragend`) bleibt dem gewerkespezifischen Ruleset vorbehalten.

import { allMatches } from '../text';

/** Druckfestigkeitsklasse nach DIN EN 206, Normal- und Leichtbeton ("C30/37", "LC25/28"). */
const DRUCKFESTIGKEIT = /\b(?:lc|c)\s?\d{1,3}\/\d{1,3}\b/g;

/** Expositionsklassen nach DIN EN 206 / DIN 1045-2: X0, XC/XD/XS/XF/XA/XM + Ziffer. */
const EXPOSITION = /\bx0\b|\bx[cdsfam][1-4]\b/g;

/** Feuchtigkeitsklassen nach DIN 1045-2 (Alkali-Kieselsäure-Reaktion). */
const FEUCHTIGKEIT = /\bw[ofa]\b/g;

function upper(values: string[]): string[] {
  return values.map((value) => value.replace(/\s+/g, '').toUpperCase());
}

export interface Betonklassen {
  beton: string | null;
  expo: string[];
  feuchtigkeitsklasse: string[];
}

export function extractBetonklassen(text: string): Betonklassen {
  const beton = upper(allMatches(text, DRUCKFESTIGKEIT));
  return {
    beton: beton[0] ?? null,
    expo: upper(allMatches(text, EXPOSITION)),
    feuchtigkeitsklasse: upper(allMatches(text, FEUCHTIGKEIT)),
  };
}

/** Nur die tatsächlich gefundenen Klassen als Attribute — keine leeren Keys. */
export function betonklassenAttributes(text: string): Record<string, unknown> {
  const { beton, expo, feuchtigkeitsklasse } = extractBetonklassen(text);
  const attributes: Record<string, unknown> = {};
  if (beton !== null) attributes.beton = beton;
  if (expo.length > 0) attributes.expo = expo;
  if (feuchtigkeitsklasse.length > 0) attributes.feuchtigkeitsklasse = feuchtigkeitsklasse;
  return attributes;
}
