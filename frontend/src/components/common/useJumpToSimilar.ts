// Sprung aus einer Position in ihre Ähnlichkeitsgruppe (WP-R, R2) — das
// Gegenstück zu `useJumpToCheck`. Die Rechnung steht in lib/navigate/jump.ts,
// damit „springen" nicht an drei Stellen leicht verschieden ist.

import { useCallback } from 'react';
import { similarActions } from '../../lib/navigate/jump';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function useJumpToSimilar(): (clusterId: string, positionId: string) => void {
  const {
    parents,
    clusters,
    view: {
      similar: { minMembers },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  return useCallback(
    (clusterId: string, positionId: string): void => {
      const parent = parents.get(positionId) ?? null;
      const groesse = clusters.get(positionId)?.positionIds.length ?? 0;
      for (const action of similarActions(
        clusterId,
        positionId,
        parent?.id ?? null,
        groesse,
        minMembers,
      )) {
        dispatch(action);
      }
    },
    [parents, clusters, minMembers, dispatch],
  );
}
