// Gemeinsame Textwerkzeuge der Klassifizierung. Alles arbeitet auf kleingeschriebenem
// Text; deutsche Komposita machen Teilstring-Treffer ("Stahlbetonarbeiten" enthält
// "betonarbeiten") zur gewollten Semantik, deshalb kein Wortgrenzen-Zwang.

export interface NormalizedItem {
  short: string;
  long: string;
  /** Kurz- und Langtext zusammen, für Stichwortsuche. */
  all: string;
  unit: string | null;
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeItem(item: {
  shortText: string;
  longText: string;
  unit: string | null;
}): NormalizedItem {
  const short = normalize(item.shortText);
  const long = normalize(item.longText);
  return {
    short,
    long,
    all: `${short} ${long}`.trim(),
    unit: item.unit === null ? null : normalize(item.unit),
  };
}

/**
 * Der Text, der die Position *benennt*. Bewusst nur der Kurztext: deutsche
 * LV-Langtexte erwähnen regelmäßig Nachbarbauteile und Verweise ("Ausführung
 * mit geböschten Wänden" in einer Erdarbeiten-Position, "gemäß Bodengutachten"),
 * die eine Identitätserkennung über den Langtext systematisch fehlleiten.
 * Eigenschaften (Betongüte, Expositionsklassen, Maße) stehen dagegen im
 * Langtext und werden weiterhin dort gesucht.
 */
export function subjectText(item: NormalizedItem): string {
  return item.short === '' ? item.all : item.short;
}

export function containsAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/** Erster Treffer einer Regex, sonst null. */
export function firstMatch(text: string, pattern: RegExp): string | null {
  const match = pattern.exec(text);
  return match === null ? null : match[0];
}

/** Alle Treffer einer globalen Regex, dedupliziert und in Fundreihenfolge. */
export function allMatches(text: string, pattern: RegExp): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(pattern)) seen.add(match[0]);
  return [...seen];
}
