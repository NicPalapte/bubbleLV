// Fallback-Extraktor: greift, wenn für (Bauteiltyp, LB) bzw. für eine Positionsart
// kein eigenes Ruleset registriert ist. Liefert nur Basis-Attribute — nie ein
// Fehler, damit ein unbekanntes Gewerk die Pipeline nicht anhält.
//
// Basis-Attribute sind Maße und genormte Kurzbezeichnungen (DIN EN 206 / DIN 1045-2,
// siehe normklassen.ts). Beides steht wörtlich im Text und bedeutet in jedem Gewerk
// dasselbe. Alles Interpretierende — etwa `tragend` — bleibt dem gewerkespezifischen
// Ruleset vorbehalten.

import { firstMatch } from '../text';
import { betonklassenAttributes } from './normklassen';
import type { PropertyRuleset, RulesetContext } from './types';

/** "d = 30 cm", "Dicke 24 cm", "30 cm dick" — Zahl mit Einheit, Komma erlaubt. */
const DICKE = /(?:dicke|dick|stärke|d\s*=)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/;
const DICKE_SUFFIX = /\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\s*dick\b/;
const HOEHE = /(?:höhe|hoch|h\s*=)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/;

/** Maßangabe säubern: "d = 30 cm" → "30 cm". */
function measure(raw: string | null): string | null {
  if (raw === null) return null;
  const value = firstMatch(raw, /\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/);
  return value === null ? null : value.replace(/\s+/g, ' ');
}

export function extractMasse(context: RulesetContext): Record<string, unknown> {
  const text = context.text.all;
  const dicke = measure(firstMatch(text, DICKE) ?? firstMatch(text, DICKE_SUFFIX));
  const hoehe = measure(firstMatch(text, HOEHE));
  const attributes: Record<string, unknown> = {};
  if (dicke !== null) attributes.dicke = dicke;
  if (hoehe !== null) attributes.hoehe = hoehe;
  return attributes;
}

export const fallbackRuleset: PropertyRuleset = {
  id: 'fallback',
  extract: (context) => ({
    ...extractMasse(context),
    ...betonklassenAttributes(context.text.all),
  }),
};
