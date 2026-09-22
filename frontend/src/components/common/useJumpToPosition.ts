// Sprung auf eine Position in der Tabelle (WP-Q, Schritt 5). Eine Stelle für
// alle Ansichten, die dorthin führen: Prüfung, Ähnlichkeit und die
// Auswahlkarte im Graphen hatten dieselben drei Zeilen jeweils selbst stehen.
//
// Die Tabelle holt die gewählte Zeile danach ins Fenster (`revealKey` in
// ui/DataTable.tsx) — ohne das landete der Sprung bei großen LVs zwar auf der
// richtigen Zeile, nur weit außerhalb des sichtbaren Bereichs.

import { useCallback } from 'react';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function useJumpToPosition(): (positionId: string) => void {
  const { parents } = useViewer();
  const dispatch = useViewerDispatch();
  return useCallback(
    (positionId: string): void => {
      const parent = parents.get(positionId) ?? null;
      dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId });
      dispatch({ type: 'setViewMode', mode: 'table' });
    },
    [parents, dispatch],
  );
}
