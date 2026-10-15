// Beziehungen zwischen Positionen (WP-M): Ähnlichkeit und Unterschiede.
// Öffentliche Fläche des Moduls — außerhalb wird nur von hier importiert.

export {
  buildRelations,
  DEFAULT_THRESHOLD,
  KURZTEXT_KEY,
  merkmaleOf,
  positionSimilarity,
} from './similarity';
export type { RelateOptions } from './similarity';
export { quantile, spread, statsOf } from './stats';
export type { ValueStats } from './stats';
export { clusterByPosition, EMPTY_RELATIONS } from './types';
export type { Cluster, RelationResult } from './types';
