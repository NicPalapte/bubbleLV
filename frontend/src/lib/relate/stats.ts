// Streuung und Ausreißer innerhalb eines Clusters (WP-M, Schritt 4).
//
// **Median und Quartilsabstand, nicht Mittelwert.** Ein einziger Tippfehler im
// Einheitspreis (120 € statt 12 €) zieht den Mittelwert so weit mit, dass er
// selbst nicht mehr auffällt — der Median bleibt, wo die Masse liegt. Die
// Grenze ist die in der Statistik übliche 1,5-fache des Quartilsabstands
// (Tukey); sie steht hier als Konstante und nicht verstreut im Code.

/** Kleinste Anzahl Werte, ab der Quartile etwas aussagen. */
export const MIN_FOR_OUTLIERS = 4;

/** Übliche Zaunbreite für Ausreißer: Quartil ± 1,5 × Quartilsabstand. */
const FENCE = 1.5;

export interface ValueStats {
  /** Anzahl Werte, die tatsächlich vorliegen (fehlende zählen nicht mit). */
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

/** Ausreißer-Richtung — „auffällig" sagt nichts ohne „wohin". */
export type OutlierDirection = 'hoch' | 'niedrig';

/**
 * Quantil einer aufsteigend sortierten Liste, linear interpoliert.
 * Leere Liste ⇒ `NaN`; der Aufrufer prüft vorher auf Länge.
 */
export function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

/** Kennzahlen einer Werteliste; `null`, wenn kein einziger Wert vorliegt. */
export function statsOf(values: readonly number[]): ValueStats | null {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return {
    count: sorted.length,
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

/**
 * Erwartungsbereich einer Werteliste. `null`, wenn es zu wenige Werte gibt oder
 * der Quartilsabstand 0 ist: dann liegt die halbe Gruppe auf demselben Wert,
 * und jede Abweichung wäre ein „Ausreißer" — das ist kein Hinweis, das ist
 * Rauschen.
 */
export function outlierBounds(stats: ValueStats): { low: number; high: number } | null {
  if (stats.count < MIN_FOR_OUTLIERS) return null;
  const iqr = stats.q3 - stats.q1;
  if (iqr <= 0) return null;
  return { low: stats.q1 - FENCE * iqr, high: stats.q3 + FENCE * iqr };
}

/** Wohin ein Wert aus dem Erwartungsbereich fällt; `null` = er liegt darin. */
export function outlierDirection(
  value: number,
  bounds: { low: number; high: number },
): OutlierDirection | null {
  if (!Number.isFinite(value)) return null;
  if (value > bounds.high) return 'hoch';
  if (value < bounds.low) return 'niedrig';
  return null;
}

/**
 * Streuung als Verhältnis von Quartilsabstand zu Median (0 = alle gleich).
 * Dimensionslos, damit sich Cluster mit 12 € und mit 1.200 € vergleichen
 * lassen — eine absolute Spanne sagt allein nichts.
 */
export function spread(stats: ValueStats): number {
  if (stats.median <= 0) return 0;
  return (stats.q3 - stats.q1) / stats.median;
}
