// Messen in Plänen (Entscheidung 0095): reine Rechnungen ohne PDF- oder UI-Kenntnis.
//
// Punkte liegen in Seiten-Einheiten des PDF bei Maßstab 1 (1 Einheit = 1/72 Zoll auf
// dem Papier). Ein Maßstab ist „Meter in der Natur je Seiten-Einheit“. Aus einem
// Plankopf „M 1:100“ folgt er nur, wenn das PDF in Originalgröße vorliegt — deshalb ist
// er nur ein Vorschlag, den der Mensch übernimmt oder per Strecke prüft.

export type PlanPoint = readonly [number, number];

/** Länge einer Linie über alle Punkte, in Seiten-Einheiten. */
export function polylineLength(points: readonly PlanPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    sum += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return sum;
}

/** Fläche eines geschlossenen Vielecks (Gaußsche Trapezformel), in Seiten-Einheiten². */
export function polygonArea(points: readonly PlanPoint[]): number {
  if (points.length < 3) return 0;
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

/** Meter je Zoll / Seiten-Einheiten je Zoll. */
const METERS_PER_PAGE_UNIT = 0.0254 / 72;

/** Maßstab (Meter je Seiten-Einheit) für 1:`ratio` bei einem PDF in Originalgröße. */
export function unitFromRatio(ratio: number): number {
  return ratio * METERS_PER_PAGE_UNIT;
}

/** Das Verhältnis 1:x, das ein Maßstab bei Originalgröße bedeutet. */
export function ratioFromUnit(unit: number): number {
  return unit / METERS_PER_PAGE_UNIT;
}

/** Maßstab aus einer gemessenen Strecke `pageLength` (Seiten-Einheiten) = `meters`. */
export function unitFromDistance(pageLength: number, meters: number): number | null {
  if (!(pageLength > 0) || !(meters > 0) || !Number.isFinite(meters)) return null;
  return meters / pageLength;
}

/** Übliche Maßstäbe in Plänen; andere Zahlen hinter „1:“ sind selten ein Maßstab. */
const COMMON_RATIOS = new Set([
  1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 750, 1000, 1250, 2000, 2500, 5000,
  10000,
]);

// „M 1:100“, „M. 1 : 50“, „M=1:20“, „Maßstab 1:200“. PDF.js liefert die Textstücke ohne
// Trenner („EG“ + „M 1:100“ = „EGM 1:100“), deshalb keine Wortgrenze davor. „M“ nur groß,
// sonst passte „cm 1:50“.
const RATIO_PATTERN =
  /(?:M|[Mm]a(?:ß|ss)stab|MASSSTAB|MAßSTAB|Mstb?|MSTB?)\.?\s*[:=]?\s*1\s*:\s*(\d{1,5})(?![\d,.])/gu;
// Ohne Vorwort nur „1:100“ allein (Plankopf als Tabelle: „Maßstab“ steht woanders), und
// nur ab 1:10 — 1:2 oder 1:5 sind eher Gefälle oder Mischungen.
const BARE_PATTERN = /(?<![\d.,:/])1\s?:\s?(\d{2,5})(?![\d,.:])/gu;

function countRatios(text: string, pattern: RegExp, min: number): Map<number, number> {
  const counts = new Map<number, number>();
  for (const match of text.matchAll(pattern)) {
    const ratio = Number(match[1]);
    if (ratio >= min && COMMON_RATIOS.has(ratio)) counts.set(ratio, (counts.get(ratio) ?? 0) + 1);
  }
  return counts;
}

/**
 * Maßstäbe, die im Seitentext stehen, häufigste zuerst. Eine Seite mit mehreren
 * Ausschnitten kann mehrere haben; der Mensch wählt. Nur ein Vorschlag (Entscheidung 0095).
 */
export function ratiosInText(text: string): number[] {
  let counts = countRatios(text, RATIO_PATTERN, 1);
  if (counts.size === 0) counts = countRatios(text, BARE_PATTERN, 10);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([ratio]) => ratio);
}

export type PageKind = 'text' | 'plan';

/** Größer als A4 (842 pt) in einer Richtung, mit etwas Spiel für Ränder. */
const LARGER_THAN_A4 = 900;
/** Unter so vielen Zeichen ist eine Querformat-Seite eher Zeichnung als Text. */
const FEW_CHARS = 1200;

/**
 * Text oder Plan, geschätzt aus Seitengröße und Textmenge. Große Formate sind Pläne,
 * Querformat mit wenig Text auch. Eine Schätzung: der Mensch stellt je Seite um.
 */
export function guessPageKind(page: {
  readonly width: number;
  readonly height: number;
  readonly chars: number;
}): PageKind {
  if (Math.max(page.width, page.height) > LARGER_THAN_A4) return 'plan';
  if (page.width > page.height && page.chars < FEW_CHARS) return 'plan';
  return 'text';
}
