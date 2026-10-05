import type { MatchIndex } from './matchCounts';

/**
 * Zahl für eine Legende oder Kennzahl, **im aktuellen Filter** gezählt.
 *
 * Ohne Filter ist es schlicht die Größe der Menge; mit Filter zählen nur die
 * Positionen, die er durchlässt — sonst stünde eine Zahl für das ganze LV
 * neben einem Graphen, der eine Teilmenge zeigt (.claude/CLAUDE.md: ein
 * Filterzustand, alle Ansichten). Eine Stelle für alle Zähler.
 */
export function countInFilter(ids: Iterable<string>, size: number, matches: MatchIndex): number {
  if (!matches.filtering) return size;
  let count = 0;
  for (const id of ids) if ((matches.counts.get(id) ?? 0) > 0) count += 1;
  return count;
}
