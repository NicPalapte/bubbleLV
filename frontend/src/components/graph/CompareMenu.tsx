// Rechtsklick-Menü an einer Positions-Bubble (PR #86): der Weg in den
// Vergleich ohne Strg-Taste.
//
// Löst dieselbe Aktion aus wie der Strg-Klick (`toggleCompare`) — also auch
// dieselbe Regel: ist eine Position angewählt und der Vergleich leer, kommt sie
// mit dazu. Zwei Wege mit verschiedenem Ergebnis wären schlimmer als einer.
//
// Das Menü hängt an der Bubble, nicht an der Mausposition: es wird je Render
// aus Graph-Koordinaten und Ausschnitt gerechnet und wandert deshalb beim
// Zoomen und Verschieben mit.

import { useRef } from 'react';
import { useDismiss } from '../common/useDismiss';
import { PopoverHead, PopoverRow } from '../ui/Popover';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface CompareMenuProps {
  node: LVNode;
  /** Ort im Canvas (px, links oben), bereits auf den Ausschnitt umgerechnet. */
  left: number;
  top: number;
  onClose: () => void;
}

/** Aufschrift des einen Menüpunkts — hängt davon ab, was der Klick bewirkt. */
function compareMenuLabel(
  id: string,
  compare: readonly string[],
  selectedCode: string | null,
  selectedId: string | null,
): string {
  if (compare.includes(id)) return 'Aus dem Vergleich nehmen';
  if (compare.length === 0 && selectedId !== null && selectedId !== id && selectedCode !== null) {
    return `Mit ${selectedCode} vergleichen`;
  }
  return 'Zum Vergleich hinzufügen';
}

export function CompareMenu({ node, left, top, onClose }: CompareMenuProps) {
  const {
    selection: { compare },
    selectedPosition,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);

  const label = compareMenuLabel(
    node.id,
    compare,
    selectedPosition?.ownCode ?? null,
    selectedPosition?.id ?? null,
  );

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      role="group"
      aria-label={`Position ${node.ownCode}`}
      className="nur-bildschirm"
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 7,
        minWidth: 220,
        background: 'var(--white)',
        border: '1px solid var(--line2)',
        boxShadow: 'var(--shadow-popover)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-meta)',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <PopoverHead>Pos. {node.ownCode}</PopoverHead>
      <PopoverRow
        onClick={() => {
          dispatch({ type: 'toggleCompare', positionId: node.id });
          onClose();
        }}
      >
        {label}
      </PopoverRow>
    </div>
  );
}
