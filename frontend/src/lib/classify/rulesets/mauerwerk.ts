// Ruleset für Mauerarbeiten (STLB-Bau-LB 012). Deckt Wand und Stürze ab — die
// beiden Bauteiltypen, die in Mauerwerks-LVs praktisch vorkommen. Die Steinarten
// stehen in der Mappingtabelle (Dimension `steinart`).

import { matchTextOf } from '../mapping';
import { detectTragend } from './beton';
import type { BauteilRuleset, RulesetContext, RulesetKey } from './types';

const GEWERK_LB = '012';

const BAUTEILTYPEN = ['Wand', 'Stürze'] as const;

export const mauerwerkRuleset: BauteilRuleset = {
  id: `${GEWERK_LB}_mauerwerk`,
  keys: BAUTEILTYPEN.map((bauteiltyp): RulesetKey => ({ bauteiltyp, gewerkLb: GEWERK_LB })),
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const steinart = context.mapping.match('steinart', [matchTextOf(context.text)])?.code ?? null;

    // Maße kommen aus dem gewerkeunabhängigen Extraktor (WP-J).
    return {
      steinart,
      tragend: detectTragend(text, context.bauteiltyp),
    };
  },
};
