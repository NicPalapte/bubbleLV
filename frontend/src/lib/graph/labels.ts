// Beschriftungen im Graphen auf ihren Platz kürzen. Abschnitte und Lose tragen in
// manchen LVs ganze Sätze als Bezeichnung (Issue #196); ungekürzt liefen sie über
// den Graphen hinaus. Der volle Text steht im Tooltip und in der Karte.

/** Zeichenbreite in Weltkoordinaten: 14px Sans (Gruppen, Achsen), 10,5px Mono. */
export const SANS_CHAR = 8.6;
export const MONO_CHAR = 6.4;
/** Zeichenbreite der Insel- und Los-Titel (15px, fett). */
export const HULL_CHAR = 9.4;
/** Innenabstand der Titel-Pille links + rechts. */
export const PILL_PAD = 28;
/** Kleine Inseln dürfen kurze Namen trotzdem ganz zeigen. */
export const PILL_MIN = 240;
/** Höchstbreite einer Achsenbeschriftung im Matrix-Modus (links 190 Platz reserviert). */
export const AXIS_LABEL_MAX = 180;

/** Kürzt einen Text mit „…“, damit er in `width` passt. */
export function fitText(text: string, width: number, charWidth: number): string {
  const max = Math.floor(width / charWidth);
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/** Titel-Pille über einer Insel oder einem Los: höchstens so breit wie der Kreis. */
export function hullPill(title: string, r: number): { text: string; width: number } {
  const text = fitText(title, Math.max(2 * r, PILL_MIN) - PILL_PAD, HULL_CHAR);
  return { text, width: text.length * HULL_CHAR + PILL_PAD };
}

/** Achsenbeschriftung im Matrix-Modus. */
export function axisText(label: string): string {
  return fitText(label, AXIS_LABEL_MAX, SANS_CHAR);
}
