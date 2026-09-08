// Schwebende Positionskarte im Graphen (Issue #30): ersetzt den früheren
// Sprung in die Tabelle beim Klick auf eine Positions-Bubble. Fest über dem
// Canvas platziert statt an der Bubble verankert — bleibt so unabhängig von
// Zoom, Pan und Clustering lesbar und lässt sich mit Escape oder einem Klick
// daneben wieder schließen (`useDismiss`, wie die Filter-Popover).

import { useRef } from 'react';
import { PositionDetails } from '../common/PositionDetails';
import { useDismiss } from '../common/useDismiss';
import type { LVNode, PositionSummary } from '../../types/lvNode';

interface PositionCardProps {
  node: LVNode;
  position: PositionSummary;
  onClose: () => void;
}

export function PositionCard({ node, position, onClose }: PositionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);

  return (
    <div
      ref={ref}
      className="absolute right-[16px] top-[16px] z-[10] flex w-[360px] flex-col overflow-hidden border border-line2 bg-white"
      style={{ maxHeight: 'calc(100% - 32px)', boxShadow: 'var(--shadow-popover)' }}
    >
      <PositionDetails node={node} position={position} onClose={onClose} />
    </div>
  );
}
