// Positionskarte im Bereich „Position" des Splitscreens (Entscheidungen 0064, 0074):
// Positionsdetails für eine Position bzw. Kennzahlen für einen Abschnitt/ein Los/das
// Projekt, darunter „Vergleichen" und der Sprung in die Tabelle. `data-selection-card`
// ist das Ziel für Tour und die gestrichelte Linie im Graphen.

import { useCallback } from 'react';
import { CARD_BUTTON } from '../common/CardParts';
import { NodeDetails } from '../common/NodeDetails';
import { PositionDetails } from '../common/PositionDetails';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { MAX_COMPARE, useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** „Vergleichen" in der Karte: nimmt die Position dazu und holt das Fenster. */
function CompareButton({
  inCompare,
  full,
  onClick,
}: {
  inCompare: boolean;
  full: boolean;
  onClick: () => void;
}) {
  const blocked = full && !inCompare;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={blocked}
      title={
        blocked
          ? `Höchstens ${MAX_COMPARE} Positionen im Vergleich`
          : 'Neben andere Positionen legen (auch Shift + Klick auf einen Punkt)'
      }
      className={
        inCompare
          ? 'inline-flex h-[30px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-blue bg-blueS px-[12px] font-mono text-[11.5px] text-blue'
          : blocked
            ? `${CARD_BUTTON} disabled:cursor-default disabled:opacity-50`
            : 'inline-flex h-[30px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-blueF bg-blueF px-[12px] font-mono text-[11.5px] text-white hover:bg-blueFH'
      }
    >
      {inCompare ? 'Im Vergleich' : 'Vergleichen'}
    </button>
  );
}

export function SelectionCard({ node }: { node: LVNode }) {
  const {
    selection: { compare },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  /** Position → ihre Zeile; Abschnitt oder Los → seine Teilmenge der Tabelle. */
  const jumpToTable = useCallback((): void => {
    if (node.position !== null) jumpToPosition(node.id);
    else dispatch({ type: 'openInTable', id: node.id });
  }, [node, jumpToPosition, dispatch]);

  return (
    <div data-selection-card="" className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {node.position !== null ? (
        <PositionDetails node={node} position={node.position} />
      ) : (
        <NodeDetails node={node} />
      )}
      {/* Sprung in die Tabelle (WP-Q, Schritt 5; Issue #51): der Klick auf eine
          Bubble öffnet diese Karte — wer die Zeile im Zusammenhang sehen will,
          kommt von hier aus dorthin. */}
      <div className="flex shrink-0 gap-[8px] border-t border-line px-[16px] py-[10px] [&>button]:flex-1 [&>button]:whitespace-nowrap">
        {node.position !== null && (
          <CompareButton
            inCompare={compare.includes(node.id)}
            full={compare.length >= MAX_COMPARE}
            onClick={() => {
              if (!compare.includes(node.id)) {
                dispatch({ type: 'toggleCompare', positionId: node.id });
              }
              dispatch({ type: 'compareWindow', open: true });
            }}
          />
        )}
        <button
          type="button"
          onClick={jumpToTable}
          title={
            node.position !== null
              ? 'Diese Position in der Tabelle zeigen'
              : 'Diesen Abschnitt in der Tabelle zeigen'
          }
          className={CARD_BUTTON}
        >
          In der Tabelle zeigen
        </button>
      </div>
    </div>
  );
}
