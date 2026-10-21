// Auswahl im Langtext für „Begriff lernen" (Entscheidung 0053, LearnPopover.tsx).
// Gelesen wird die Auswahl seit Entscheidung 0063 über `paintSelection` (paint.ts);
// „Begriff lernen" steht dann in der Leiste zum Anstreichen.

/** Längere Auswahl ist kein Begriff mehr, sondern ein Absatz. */
export const MAX_TERM_LENGTH = 80;

export interface LearnTarget {
  text: string;
  /** Lage im Fenster (Auswahl-Rechteck), unter der das Feld erscheint. */
  left: number;
  top: number;
}
