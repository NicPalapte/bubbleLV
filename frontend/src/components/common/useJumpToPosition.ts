// Sprung auf eine Position in der Tabelle (WP-Q, Schritt 5). Eine Stelle für
// alle Ansichten, die dorthin führen: Prüfung, Ähnlichkeit und die
// Auswahlkarte im Graphen hatten dieselben drei Zeilen jeweils selbst stehen.
//
// Die Tabelle holt die gewählte Zeile danach ins Fenster (`revealKey` in
// ui/DataTable.tsx) — ohne das landete der Sprung bei großen LVs zwar auf der
// richtigen Zeile, nur weit außerhalb des sichtbaren Bereichs.

import { useCallback } from 'react';
import { jumpActions, type JumpOptions } from '../../lib/navigate/jump';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/**
 * `options` reicht bis zu `jumpActions` durch — `stayInView` für Aufrufer, die
 * nur die Auswahl weitersetzen wollen, ohne die Ansicht zu wechseln (WP-R, R2:
 * „zur nächsten ähnlichen" im Graphen).
 */
export function useJumpToPosition(): (positionId: string, options?: JumpOptions) => void {
  const { parents } = useViewer();
  const dispatch = useViewerDispatch();
  return useCallback(
    (positionId: string, options?: JumpOptions): void => {
      const parent = parents.get(positionId) ?? null;
      for (const action of jumpActions(positionId, parent?.id ?? null, options)) dispatch(action);
    },
    [parents, dispatch],
  );
}
