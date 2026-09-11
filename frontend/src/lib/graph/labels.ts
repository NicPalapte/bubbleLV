// Beschriftungen des Bubble-Graphen — reine Funktionen, getrennt von den
// Komponenten (React Fast Refresh verlangt Dateien, die nur Komponenten
// exportieren).

import type { LVNode } from '../../types/lvNode';

/**
 * Nummer der Ebene, wie sie an der Bubble steht: „LOS 1", „§ 07", „0010".
 * Nur die eigene Ebene, nicht die verkettete OZ (Issue #41).
 */
export function codeLabelFor(node: LVNode, tier: string): string {
  if (tier === 'project') return 'PROJEKT';
  if (tier === 'lot') return node.ownCode === '' ? 'LOS' : `LOS ${node.ownCode}`;
  if (tier === 'position') return node.ownCode;
  return node.ownCode === '' ? '' : `§ ${node.ownCode}`;
}
