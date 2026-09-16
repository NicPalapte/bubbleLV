// Squarified Treemap — zerlegt ein Rechteck so in Teilflächen, dass jede Fläche
// ihrem Wert entspricht und die Kacheln möglichst quadratisch bleiben. Lange
// dünne Streifen wären zwar flächentreu, aber nicht mehr vergleichbar.
//
// Verfahren nach Bruls/Huizing/van Wijk, „Squarified Treemaps" (2000): Werte
// absteigend sortiert, reihenweise gefüllt, und eine Reihe wird geschlossen,
// sobald die nächste Kachel ihr Seitenverhältnis verschlechtern würde.
//
// Reine Funktion ohne DOM — die Ansicht rechnet in Pixeln, der Test in Zahlen.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Sized {
  value: number;
}

export interface Placed<T> {
  item: T;
  rect: Rect;
}

/** Schlechtestes Seitenverhältnis einer Reihe — kleiner ist besser. */
function worstRatio(areas: readonly number[], side: number): number {
  let sum = 0;
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const area of areas) {
    sum += area;
    if (area > max) max = area;
    if (area < min) min = area;
  }
  if (sum <= 0 || side <= 0 || min <= 0) return Number.POSITIVE_INFINITY;
  const sideArea = side * side;
  return Math.max((sideArea * max) / (sum * sum), (sum * sum) / (sideArea * min));
}

/**
 * Legt eine fertige Reihe an den kurzen Rand der freien Fläche und gibt den
 * Rest zurück.
 */
function placeRow<T>(
  row: ReadonlyArray<{ item: T; area: number }>,
  free: Rect,
  out: Array<Placed<T>>,
): Rect {
  const rowArea = row.reduce((sum, entry) => sum + entry.area, 0);
  if (rowArea <= 0) return free;

  if (free.width >= free.height) {
    // Reihe steht als Spalte am linken Rand.
    const width = Math.min(free.width, rowArea / free.height);
    let y = free.y;
    for (const entry of row) {
      const height = width <= 0 ? 0 : entry.area / width;
      out.push({ item: entry.item, rect: { x: free.x, y, width, height } });
      y += height;
    }
    return { x: free.x + width, y: free.y, width: free.width - width, height: free.height };
  }

  const height = Math.min(free.height, rowArea / free.width);
  let x = free.x;
  for (const entry of row) {
    const width = height <= 0 ? 0 : entry.area / height;
    out.push({ item: entry.item, rect: { x, y: free.y, width, height } });
    x += width;
  }
  return { x: free.x, y: free.y + height, width: free.width, height: free.height - height };
}

/**
 * Kacheln für `items` innerhalb von `rect`. Werte ≤ 0 fallen weg — eine Fläche
 * ohne Ausdehnung ist keine Information, sondern eine unsichtbare Klickfalle.
 */
export function squarify<T extends Sized>(items: readonly T[], rect: Rect): Array<Placed<T>> {
  const out: Array<Placed<T>> = [];
  const sorted = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0 || rect.width <= 0 || rect.height <= 0) return out;

  // Der Maßstab bleibt über den ganzen Lauf konstant: eine platzierte Reihe
  // nimmt genau ihre Fläche mit, der Rest passt damit weiter exakt.
  const scale = (rect.width * rect.height) / total;
  let free: Rect = { ...rect };
  let row: Array<{ item: T; area: number }> = [];
  let areas: number[] = [];

  for (const item of sorted) {
    const area = item.value * scale;
    const side = Math.min(free.width, free.height);
    const next = [...areas, area];
    if (row.length === 0 || worstRatio(next, side) <= worstRatio(areas, side)) {
      row.push({ item, area });
      areas = next;
      continue;
    }
    free = placeRow(row, free, out);
    row = [{ item, area }];
    areas = [area];
  }
  if (row.length > 0) placeRow(row, free, out);
  return out;
}
