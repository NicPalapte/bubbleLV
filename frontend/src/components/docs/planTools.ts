// Werkzeuge beim Messen in Plänen (Entscheidung 0095).

/**
 * Werkzeuge beim Messen. Länge, Rechteck und Kreis enden nach dem zweiten Punkt; Maßkette,
 * Vieleck und Stück mit „Fertig“, Enter oder Esc. „raum“ schlägt die Fläche um
 * den getippten Punkt vor. „masse“ sammelt gedruckte Maße.
 */
export type PlanTool =
  'massstab' | 'laenge' | 'kette' | 'rechteck' | 'polygon' | 'raum' | 'kreis' | 'stueck' | 'masse';

/** Werkzeuge, die mit dem zweiten Punkt fertig sind. */
export const TWO_POINT_TOOLS: ReadonlySet<PlanTool> = new Set([
  'massstab',
  'laenge',
  'rechteck',
  'kreis',
]);
