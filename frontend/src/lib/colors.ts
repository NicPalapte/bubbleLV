// Eine Farbskala für alle Ansichten (WP-L, Schritt 5). Ein Hauptabschnitt hat
// in der Treemap, in der Legende und im Graphen denselben Ton — sonst müsste
// man beim Ansichtswechsel jedes Mal neu zuordnen (Entscheidung 0043).
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

/** Ton für „kein Wert" — farblos, damit „ohne Abschnitt" keinen Abschnitt vortäuscht. */
export const NEUTRAL_COLOR = 'var(--cat-none)';
