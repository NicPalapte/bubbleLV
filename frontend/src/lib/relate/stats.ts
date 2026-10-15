// Streuung innerhalb eines Clusters (WP-M, Schritt 4).
//
// **Median und Quartile, nicht Mittelwert.** Ein einziger Tippfehler im
// Einheitspreis (120 € statt 12 €) zieht den Mittelwert weit mit — der Median
// bleibt, wo die Masse liegt.

export interface ValueStats {
  /** Anzahl Werte, die tatsächlich vorliegen (fehlende zählen nicht mit). */
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

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
 * Streuung als Verhältnis von Quartilsabstand zu Median (0 = alle gleich).
 * Dimensionslos, damit sich Cluster mit 12 € und mit 1.200 € vergleichen
 * lassen — eine absolute Spanne sagt allein nichts.
 */
export function spread(stats: ValueStats): number {
  if (stats.median <= 0) return 0;
  return (stats.q3 - stats.q1) / stats.median;
}
