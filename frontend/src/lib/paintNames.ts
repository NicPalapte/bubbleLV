// Eigene Namen für die festen Markierfarben (Entscheidung 0063), z. B. Gelb = „wichtig".
// Gelten in diesem Browser für alle Dateien; ohne Namen steht der Farbname.

import { PAINT_INFO, PAINTS, type Paint } from './annotations';

/** Länger passt nicht mehr in Leiste und Tabelle. */
export const MAX_PAINT_NAME_LENGTH = 30;

export type PaintNames = Readonly<Partial<Record<Paint, string>>>;

export const NO_PAINT_NAMES: PaintNames = {};

/** Eigener Name der Farbe, sonst der Farbname. */
export function paintName(names: PaintNames, paint: Paint): string {
  return names[paint] ?? PAINT_INFO[paint].label;
}

/** Setzt oder löscht (leerer Text) den Namen einer Farbe. */
export function withPaintName(names: PaintNames, paint: Paint, name: string): PaintNames {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_PAINT_NAME_LENGTH);
  if ((names[paint] ?? '') === clean) return names;
  const next: Partial<Record<Paint, string>> = { ...names };
  if (clean === '') delete next[paint];
  else next[paint] = clean;
  return next;
}

/** Namen aus Speicher oder Notiz-Datei; Unbrauchbares fällt weg. */
export function toPaintNames(value: unknown): PaintNames {
  if (typeof value !== 'object' || value === null) return NO_PAINT_NAMES;
  const raw = value as Record<string, unknown>;
  let out: PaintNames = NO_PAINT_NAMES;
  for (const paint of PAINTS) {
    const name = raw[paint];
    if (typeof name === 'string') out = withPaintName(out, paint, name);
  }
  return out;
}

/** Namen aus einer Notiz-Datei: übernimmt nur Farben, die hier noch keinen Namen haben. */
export function adoptPaintNames(own: PaintNames, other: PaintNames): PaintNames {
  let out = own;
  for (const paint of PAINTS) {
    const name = other[paint];
    if (name !== undefined && own[paint] === undefined) out = withPaintName(out, paint, name);
  }
  return out;
}
