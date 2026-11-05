// Werkzeuge beim Messen in Plänen (Entscheidung 0095).

/**
 * Werkzeuge beim Messen. Länge, Rechteck und Kreis enden nach dem zweiten Punkt; Maßkette,
 * Vieleck und Stück mit „Fertig“, Enter oder Esc. „masse“ sammelt gedruckte Maße.
 */
export type PlanTool =
  'massstab' | 'laenge' | 'kette' | 'rechteck' | 'polygon' | 'kreis' | 'stueck' | 'masse';

/** Werkzeuge, die mit dem zweiten Punkt fertig sind. */
export const TWO_POINT_TOOLS: ReadonlySet<PlanTool> = new Set([
  'massstab',
  'laenge',
  'rechteck',
  'kreis',
]);
