// Konstanten des Bubble-Graphen (docs/decisions/0035-graph-gliederung.md).
// Maße in Weltkoordinaten, sofern nicht „px" (Bildschirm) dabeisteht.

export const MIN_ZOOM = 0.04;
export const MAX_ZOOM = 6;

/** Grundradius einer Position, wenn die Größe nichts vergleicht. */
export const POSITION_R = 4.8;
/** Kleinster und größter Radius einer Position im Modus „Menge" bzw. „Preis". */
export const POSITION_R_MIN = 2.4;
export const POSITION_R_MAX = 8.8;

/**
 * Radius einer Gruppe aus der Anzahl ihrer Positionen: die Fläche folgt der
 * Anzahl. Der Abstand zweier Nachbarn in der Sonnenblumen-Anordnung liegt damit
 * bei rund 21 — mehr als der Durchmesser der größten Position, also überdecken
 * sich Positionen nie, ohne dass nachgerechnet werden muss.
 */
export function groupRadius(count: number): number {
  return Math.max(34, Math.sqrt(count) * 6.2 * 1.9 + 12);
}

/** Abstand zwischen zwei Gruppen; oben braucht die Beschriftung Platz. */
export const GROUP_GAP = 72;
/** Rand zwischen der äußersten Gruppe und der gestrichelten Los-Hülle. */
export const HULL_PAD = 46;
/** Abstand zwischen zwei Los-Hüllen. */
export const HULL_GAP = 70;

/**
 * Ist eine Gruppe auf dem Schirm kleiner als so viele px (Radius), wird sie
 * als eine Fläche gezeichnet statt als einzelne Punkte. Ohne diese Detailstufe
 * hingen bei 10k Positionen zehntausende Kreise im DOM.
 */
export const GROUP_LOD_PX = 40;

/** Ab dieser Schriftgröße auf dem Schirm (px) stehen Gruppentitel. */
export const LABEL_MIN_PX = 7;

/**
 * Radius einer Position auf dem Schirm (px), ab dem der Hinweis-Ring gezeichnet
 * wird. Darunter ist die Bubble ein Punkt; ein Ring darum wäre ein Fleck.
 */
export const MARK_AT_PX = 2.5;

/** Hinweis-Ring und Schild zeichnen bei diesem Zoom? */
export function marksVisible(zoom: number): boolean {
  return POSITION_R * zoom >= MARK_AT_PX;
}
