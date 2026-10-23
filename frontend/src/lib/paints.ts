// Farben zum Anstreichen (Entscheidung 0063): im Langtext und in Begleitdokumenten
// (Entscheidung 0072).

/** Reihenfolge = Reihenfolge der Knöpfe. */
export const PAINTS = ['gelb', 'orange', 'gruen', 'blau', 'rosa', 'lila'] as const;
export type Paint = (typeof PAINTS)[number];

export const PAINT_INFO: Readonly<Record<Paint, { label: string; fill: string }>> = {
  gelb: { label: 'Gelb', fill: 'var(--paint-gelb)' },
  orange: { label: 'Orange', fill: 'var(--paint-orange)' },
  gruen: { label: 'Grün', fill: 'var(--paint-gruen)' },
  blau: { label: 'Blau', fill: 'var(--paint-blau)' },
  rosa: { label: 'Rosa', fill: 'var(--paint-rosa)' },
  lila: { label: 'Lila', fill: 'var(--paint-lila)' },
};

/** Längere Auswahl ist kein Anstreichen mehr, sondern Kopieren. */
export const MAX_PAINT_LENGTH = 2000;

export function isPaint(value: unknown): value is Paint {
  return (PAINTS as readonly unknown[]).includes(value);
}
