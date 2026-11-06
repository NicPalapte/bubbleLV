// Werkzeuge beim Messen in Plänen (Entscheidung 0095). Oben stehen nur Länge, Fläche und
// Stück (Nico, 06.11.); die Form wählt man darunter.

/**
 * Länge: Strecke (zwei Punkte) oder Kette (Doppelklick beendet). Fläche: Rechteck (zwei
 * Ecken), Kreis (Mitte, Rand) oder Polygon (ersten Punkt antippen schließt). Bei Rechteck
 * und Kreis wird eine geschlossene Linie unter dem Mauszeiger erkannt und vorgeschlagen.
 */
export type PlanTool =
  'massstab' | 'laenge' | 'kette' | 'rechteck' | 'kreis' | 'polygon' | 'stueck';

export type ToolGroup = 'laenge' | 'flaeche' | 'stueck';

export const GROUP_OF: Readonly<Record<Exclude<PlanTool, 'massstab'>, ToolGroup>> = {
  laenge: 'laenge',
  kette: 'laenge',
  rechteck: 'flaeche',
  kreis: 'flaeche',
  polygon: 'flaeche',
  stueck: 'stueck',
};

/** Werkzeuge, die mit dem zweiten Punkt fertig sind. */
export const TWO_POINT_TOOLS: ReadonlySet<PlanTool> = new Set([
  'massstab',
  'laenge',
  'rechteck',
  'kreis',
]);

/** Werkzeuge, bei denen eine geschlossene Linie unter dem Zeiger erkannt wird. */
export const SNAP_TOOLS: ReadonlySet<PlanTool> = new Set(['rechteck', 'kreis']);
