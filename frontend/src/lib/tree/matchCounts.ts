// Trefferzahlen je Knoten — einmal berechnet, von Tree, Tabelle und Graph
// gemeinsam genutzt. Grundlage ist ausschließlich `matchPos`
// (docs/architecture/frontend.md).
//
// Seit WP-I läuft die Positionsprüfung über den flachen Positions-Index
// (lib/index/positionIndex.ts): ein Durchlauf über vorberechnete Fakten statt
// einer Ableitung je Position und Render. Die Entscheidung selbst bleibt
// `matchFacts` in lib/matchPos.ts.

import { createPositionFilter, type PositionIndex } from '../index/positionIndex';
import type { ActiveFilters } from '../matchPos';
import type { LVNode } from '../../types/lvNode';

export interface MatchIndex {
  /** Anzahl passender Positionen unterhalb (bzw. in) einem Knoten. */
  counts: ReadonlyMap<string, number>;
  /** Aktiv, sobald Suche oder mindestens eine Facette gesetzt ist. */
  filtering: boolean;
}

export function computeMatchCounts(
  root: LVNode,
  index: PositionIndex,
  active: ActiveFilters,
): MatchIndex {
  const counts = new Map<string, number>();
  const matches = createPositionFilter(index, active);

  const visit = (node: LVNode): number => {
    if (node.kind === 'position') {
      const value = matches(node) ? 1 : 0;
      counts.set(node.id, value);
      return value;
    }
    let total = 0;
    for (const child of node.children) total += visit(child);
    counts.set(node.id, total);
    return total;
  };

  visit(root);
  return { counts, filtering: active.filtering };
}

export function matchCount(index: MatchIndex, node: LVNode): number {
  return index.counts.get(node.id) ?? 0;
}

/** Nicht-Treffer: nur relevant, solange überhaupt gefiltert wird. */
export function isMissed(index: MatchIndex, node: LVNode): boolean {
  return index.filtering && matchCount(index, node) === 0;
}
