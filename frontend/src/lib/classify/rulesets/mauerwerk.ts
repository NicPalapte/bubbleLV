// Ruleset für Mauerarbeiten (STLB-Bau-LB 012). Deckt Wand und Stürze ab — die
// beiden Bauteiltypen, die in Mauerwerks-LVs praktisch vorkommen.

import { detectTragend } from './beton';
import { extractMasse } from './fallback';
import type { BauteilRuleset, RulesetContext, RulesetKey } from './types';

const GEWERK_LB = '012';

const BAUTEILTYPEN = ['Wand', 'Stürze'] as const;

/** Steinarten als Anzeigewert; nur erkannt, nicht ergänzt. */
const STEINARTEN: ReadonlyArray<{ label: string; keywords: readonly string[] }> = [
  { label: 'Kalksandstein', keywords: ['kalksandstein', ' ks-', 'ks-plan'] },
  { label: 'Porenbeton', keywords: ['porenbeton', 'gasbeton'] },
  { label: 'Leichtbetonstein', keywords: ['leichtbetonstein', 'leichtbeton-stein'] },
  { label: 'Ziegel', keywords: ['ziegel', 'hochlochziegel', 'klinker'] },
  { label: 'Betonstein', keywords: ['betonstein', 'vollstein aus beton'] },
];

export const mauerwerkRuleset: BauteilRuleset = {
  id: `${GEWERK_LB}_mauerwerk`,
  keys: BAUTEILTYPEN.map((bauteiltyp): RulesetKey => ({ bauteiltyp, gewerkLb: GEWERK_LB })),
  extract(context: RulesetContext): Record<string, unknown> {
    const text = context.text.all;
    const steinart =
      STEINARTEN.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.label ??
      null;

    return {
      ...extractMasse(context),
      steinart,
      tragend: detectTragend(text, context.bauteiltyp),
    };
  },
};
