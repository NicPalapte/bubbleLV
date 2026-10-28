// Verbindungen zwischen zwei Positionen aus einer Regel (Entscheidung 0081). Eine Regel
// schlägt vor, du entscheidest: erst „bestätigt“ gilt eine Verbindung, „verworfen“
// merkt sich das Nein, damit der Vorschlag nicht wiederkommt. Beides ist ein Urteil
// und bleibt mit Regel und Zeitpunkt stehen.
//
// In der Sitzung sind `a`/`b` Knoten-IDs, gespeichert Positions-Hashes (wie alle
// Notizen, lib/annotations.ts). Ungerichtet: `a` < `b`, jedes Paar nur einmal.

export type LinkVerdict = 'bestaetigt' | 'verworfen';

export interface PositionLink {
  readonly a: string;
  readonly b: string;
  readonly status: LinkVerdict;
  /** Regel, die das Paar vorgeschlagen hat: `id@version`. */
  readonly regel: string;
  readonly at: number;
}

/** Paar in fester Reihenfolge — so ist (x, y) dasselbe wie (y, x). */
export function pairOf(x: string, y: string): { readonly a: string; readonly b: string } {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

const samePair = (link: PositionLink, x: string, y: string): boolean => {
  const { a, b } = pairOf(x, y);
  return link.a === a && link.b === b;
};

export function linkOf(
  links: readonly PositionLink[],
  x: string,
  y: string,
): PositionLink | undefined {
  return links.find((link) => samePair(link, x, y));
}

/** Urteil setzen; ein früheres Urteil über dasselbe Paar wird ersetzt. */
export function judgeLink(
  links: readonly PositionLink[],
  x: string,
  y: string,
  status: LinkVerdict,
  regel: string,
  at: number,
): PositionLink[] {
  if (x === y) return [...links];
  const rest = links.filter((link) => !samePair(link, x, y));
  return [...rest, { ...pairOf(x, y), status, regel, at }];
}

/** Urteil zurücknehmen: das Paar ist wieder offen. */
export function forgetLink(links: readonly PositionLink[], x: string, y: string): PositionLink[] {
  return links.filter((link) => !samePair(link, x, y));
}

/** Bestätigte Partner einer Position. */
export function confirmedWith(
  links: readonly PositionLink[],
  id: string,
): Array<{ readonly other: string; readonly link: PositionLink }> {
  const out: Array<{ other: string; link: PositionLink }> = [];
  for (const link of links) {
    if (link.status !== 'bestaetigt') continue;
    if (link.a === id) out.push({ other: link.b, link });
    else if (link.b === id) out.push({ other: link.a, link });
  }
  return out;
}

/** Schlüssel austauschen (Knoten-ID ↔ Hash); danach wieder in fester Reihenfolge. */
export function rekeyLinks(
  links: readonly PositionLink[],
  keys: ReadonlyMap<string, string>,
): PositionLink[] {
  return links.map((link) => ({
    ...link,
    ...pairOf(keys.get(link.a) ?? link.a, keys.get(link.b) ?? link.b),
  }));
}

/** Verbindungen aus Speicher oder Datei; Unbrauchbares fällt weg. */
export function toLinks(value: unknown): PositionLink[] {
  if (!Array.isArray(value)) return [];
  const out: PositionLink[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    const { a, b, status, regel, at } = raw;
    if (typeof a !== 'string' || typeof b !== 'string' || a === b) continue;
    if (status !== 'bestaetigt' && status !== 'verworfen') continue;
    if (typeof regel !== 'string') continue;
    out.push({
      ...pairOf(a, b),
      status,
      regel,
      at: typeof at === 'number' && Number.isFinite(at) ? at : 0,
    });
  }
  return out;
}
