// Fallback-Extraktor: greift, wenn für (Bauteiltyp, LB) bzw. für eine Positionsart
// kein eigenes Ruleset registriert ist. Liefert nur Basis-Attribute — nie ein
// Fehler, damit ein unbekanntes Gewerk die Pipeline nicht anhält.
//
// Basis-Attribute sind genormte Kurzbezeichnungen nach DIN EN 206 / DIN 1045-2
// (siehe normklassen.ts). Sie stehen wörtlich im Text und bedeuten in jedem
// Gewerk dasselbe. Alles Interpretierende — etwa `tragend` — bleibt dem
// gewerkespezifischen Ruleset vorbehalten.
//
// Maße stehen seit WP-J nicht mehr hier: sie bedeuten ebenfalls in jedem Gewerk
// dasselbe und kommen deshalb aus dem gewerkeunabhängigen Extraktor
// (../extractors/masse.ts), der vor jedem Ruleset läuft.

import { betonklassenAttributes } from './normklassen';
import type { PropertyRuleset } from './types';

export const fallbackRuleset: PropertyRuleset = {
  id: 'fallback',
  extract: (context) => betonklassenAttributes(context.text.all),
};
