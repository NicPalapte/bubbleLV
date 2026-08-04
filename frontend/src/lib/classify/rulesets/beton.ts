// Ruleset für Betonarbeiten (STLB-Bau-LB 013) an tragfähigen Bauteilen.
// Die genormten Klassen kommen aus normklassen.ts; gewerkespezifisch ist hier die
// Aussage `tragend` und die feste Ausgabe von `beton`/`expo` (auch als null bzw.
// leere Liste), damit die Facetten für dieses Gewerk ein stabiles Schema haben.

import { TRAGENDE_BAUTEILTYPEN } from '../bauteiltyp';
import { extractMasse } from './fallback';
import { extractBetonklassen } from './normklassen';
import type { BauteilRuleset, RulesetContext, RulesetKey } from './types';

const GEWERK_LB = '013';

const BAUTEILTYPEN = [
  'Bodenplatte',
  'Fundament',
  'Unterzug',
  'Balken',
  'Stütze',
  'Wand',
  'Decke',
  'Treppe',
  'Stürze',
] as const;

const NICHT_TRAGEND = ['nichttragend', 'nicht tragend', 'nicht-tragend'];

/**
 * `tragend` nur setzen, wenn der Text es sagt oder der Bauteiltyp tragfähig ist;
 * sonst null — eine falsche Aussage über Tragfähigkeit ist schlimmer als keine.
 */
export function detectTragend(text: string, bauteiltyp: string | null): boolean | null {
  if (NICHT_TRAGEND.some((needle) => text.includes(needle))) return false;
  if (text.includes('tragend')) return true;
  if (bauteiltyp !== null && TRAGENDE_BAUTEILTYPEN.includes(bauteiltyp)) return true;
  return null;
}

export const betonRuleset: BauteilRuleset = {
  id: `${GEWERK_LB}_beton`,
  keys: BAUTEILTYPEN.map((bauteiltyp): RulesetKey => ({ bauteiltyp, gewerkLb: GEWERK_LB })),
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const klassen = extractBetonklassen(text);

    return {
      ...extractMasse(context),
      beton: klassen.beton,
      expo: klassen.expo,
      ...(klassen.feuchtigkeitsklasse.length > 0
        ? { feuchtigkeitsklasse: klassen.feuchtigkeitsklasse }
        : {}),
      tragend: detectTragend(text, context.bauteiltyp),
    };
  },
};
