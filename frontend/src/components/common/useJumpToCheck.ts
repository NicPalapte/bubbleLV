// Sprung aus einem Hinweis in die Ansicht „Prüfung" (WP-R, R1) — das Gegenstück
// zu `useJumpToPosition`. Die Rechnung selbst steht in lib/navigate/jump.ts,
// damit „springen" nicht an zwei Stellen leicht verschieden ist.

import { useCallback } from 'react';
import { checkActions } from '../../lib/navigate/jump';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function useJumpToCheck(): (ruleId: string, positionId: string) => void {
  const { parents } = useViewer();
  const dispatch = useViewerDispatch();
  return useCallback(
    (ruleId: string, positionId: string): void => {
      const parent = parents.get(positionId) ?? null;
      for (const action of checkActions(ruleId, positionId, parent?.id ?? null)) dispatch(action);
    },
    [parents, dispatch],
  );
}
