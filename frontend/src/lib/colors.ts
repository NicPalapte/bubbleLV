// Eine Farbskala für alle Ansichten (WP-L, Schritt 5). Ein Gewerk hat in der
// Treemap, in der Legende und in jedem Diagramm denselben Ton — sonst müsste
// man beim Ansichtswechsel jedes Mal neu zuordnen.
//
// Die Töne selbst stehen als Design-Tokens in src/index.css (`--cat-1` …
// `--cat-10`), nicht hier: eine Farbänderung bleibt damit an einer Stelle.
// Begründung und verworfene Wege:
// docs/decisions/0013-gewerk-farbskala.md.

/** Zehn gleichrangige Töne. Die Reihenfolge trennt nur, sie bewertet nicht. */
export const CATEGORY_COLORS: readonly string[] = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
  'var(--cat-9)',
  'var(--cat-10)',
];

/** Ton für „kein Wert" — farblos, damit „ohne Gewerk" kein Gewerk vortäuscht. */
export const NEUTRAL_COLOR = 'var(--cat-none)';

export interface ColorScale {
  /** Ton eines Werts; unbekannte Werte und `null` bekommen `NEUTRAL_COLOR`. */
  of(value: string | null | undefined): string;
  /** Vergebene Zuordnungen in Anzeigereihenfolge — Grundlage jeder Legende. */
  readonly entries: ReadonlyArray<readonly [string, string]>;
}

export const EMPTY_COLOR_SCALE: ColorScale = { of: () => NEUTRAL_COLOR, entries: [] };

/**
 * Skala über einer festen Werteliste. Die Zuordnung folgt der übergebenen
 * Reihenfolge — die Facetten-Zähler liefern ihre Werte bereits sortiert
 * (lib/index/summary.ts), damit dasselbe LV immer dieselben Farben zeigt.
 *
 * Mehr Werte als Töne: die Skala läuft um. Zwei Gewerke teilen sich dann einen
 * Ton — das ist sichtbar nebeneinander besser als zehn kaum unterscheidbare
 * Zwischentöne.
 */
export function buildColorScale(values: Iterable<string>): ColorScale {
  const entries: Array<readonly [string, string]> = [];
  const byValue = new Map<string, string>();
  for (const value of values) {
    if (value === '' || byValue.has(value)) continue;
    const color = CATEGORY_COLORS[byValue.size % CATEGORY_COLORS.length];
    byValue.set(value, color);
    entries.push([value, color]);
  }
  return {
    of: (value) =>
      value === null || value === undefined ? NEUTRAL_COLOR : (byValue.get(value) ?? NEUTRAL_COLOR),
    entries,
  };
}
