// Marken am Seitenrand bündeln (Entscheidung 0072): Stellen, deren Marken sich
// berühren würden, teilen sich eine Marke. Abhängig vom Zoom, darum aus den
// gemessenen Höhen berechnet, nicht aus der Lage im Text.

/** Eine verknüpfte Stelle mit ihrer Höhe auf der Seite in px. */
export interface PlacedSpot<T> {
  readonly spot: T;
  readonly top: number;
}

/** Eine Marke am Rand: Höhe der obersten Stelle und alle Stellen darunter. */
export interface Bundle<T> {
  readonly top: number;
  readonly spots: readonly T[];
}

/**
 * Fasst Stellen zusammen, deren Höhe weniger als `gap` px unter der obersten Stelle
 * des Bündels liegt. Gemessen ab der obersten, damit ein Bündel nicht endlos wächst.
 */
export function bundleSpots<T>(placed: readonly PlacedSpot<T>[], gap: number): Bundle<T>[] {
  const sorted = [...placed].sort((a, b) => a.top - b.top);
  const out: { top: number; spots: T[] }[] = [];
  for (const { spot, top } of sorted) {
    const last = out.at(-1);
    if (last !== undefined && top - last.top < gap) last.spots.push(spot);
    else out.push({ top, spots: [spot] });
  }
  return out;
}
