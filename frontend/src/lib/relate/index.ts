// Beziehungen zwischen Positionen (WP-M): Ähnlichkeit, Unterschiede, Ausreißer.
// Öffentliche Fläche des Moduls — außerhalb wird nur von hier importiert.

export {
  buildRelations,
  DEFAULT_THRESHOLD,
  KURZTEXT_KEY,
  merkmaleOf,
  positionSimilarity,
} from './similarity';
export type { RelateOptions } from './similarity';
export {
  MIN_FOR_OUTLIERS,
  outlierBounds,
  outlierDirection,
  quantile,
  spread,
  statsOf,
} from './stats';
export type { OutlierDirection, ValueStats } from './stats';
export { clusterByPosition, EMPTY_RELATIONS } from './types';
export type { Cluster, Outlier, OutlierField, RelationResult } from './types';
