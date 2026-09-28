// Rechtsklick-Menü an einer Position (PR #86): der Weg in den Vergleich ohne
// Strg-Taste — im Graphen, in der Tabelle und im Baum.
//
// Löst dieselbe Aktion aus wie der Strg-Klick (`toggleCompare`) — also auch
// dieselbe Regel: ist eine Position angewählt und der Vergleich leer, kommt sie
// mit dazu. Zwei Wege mit verschiedenem Ergebnis wären schlimmer als einer.
//
// Zwei Arten, es hinzustellen:
//  - `canvas`: im Graphen, an der Bubble. Der Graph rechnet den Ort je Render
//    aus Ausschnitt und Graph-Koordinaten, das Menü wandert beim Zoomen mit.
//  - `viewport`: in Tabelle und Baum, an der Mausposition. Per Portal an
//    <body>, damit die scrollende Liste es nicht abschneidet. Scrollen schließt
//    es — sonst stünde es neben einer Zeile, die längst weitergewandert ist.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { PopoverHead, PopoverRow } from '../ui/Popover';
import { COMPARE_MENU_WIDTH } from '../../lib/graph/constants';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** Luft zwischen Menü und Fensterrand in der `viewport`-Variante. */
const VIEWPORT_MARGIN = 8;
/** Geschätzte Höhe (Kopf + ein Punkt, ggf. umgebrochen) für das Einpassen unten. */
const MENU_HEIGHT = 80;

export type CompareMenuPlacement =
  { kind: 'canvas'; left: number; top: number } | { kind: 'viewport'; x: number; y: number };

interface CompareMenuProps {
  node: LVNode;
  placement: CompareMenuPlacement;
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

export function CompareMenu({ node, placement, onClose }: CompareMenuProps) {
  const {
    selection: { compare },
    selectedPosition,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);

  const floating = placement.kind === 'viewport';
  useEffect(() => {
    if (!floating) return;
    // Capture-Phase: gescrollt wird in der Liste, nicht am window.
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [floating, onClose]);

  const label = compareMenuLabel(
    node.id,
    compare,
    selectedPosition?.code ?? null,
    selectedPosition?.id ?? null,
  );

  const where =
    placement.kind === 'canvas'
      ? { position: 'absolute' as const, left: placement.left, top: placement.top, zIndex: 7 }
      : {
          position: 'fixed' as const,
          left: Math.max(
            VIEWPORT_MARGIN,
            Math.min(placement.x, window.innerWidth - COMPARE_MENU_WIDTH - VIEWPORT_MARGIN),
          ),
          top: Math.max(
            VIEWPORT_MARGIN,
            Math.min(placement.y, window.innerHeight - MENU_HEIGHT - VIEWPORT_MARGIN),
          ),
          zIndex: 50,
        };

  const menu = (
    <div
      ref={ref}
      {...(floating ? {} : graphOverlayProps)}
      role="group"
      aria-label={`Position ${node.code}`}
      // Hängt in der `viewport`-Variante an <body>, außerhalb der Hülle, die
      // beim Drucken zurücktritt — ohne die Klasse käme es mit aufs Blatt.
      className="nur-bildschirm"
      style={{
        ...where,
        width: COMPARE_MENU_WIDTH,
        background: 'var(--white)',
        border: '1px solid var(--line2)',
        boxShadow: 'var(--shadow-popover)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-meta)',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <PopoverHead>Pos. {node.code}</PopoverHead>
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

  return floating ? createPortal(menu, document.body) : menu;
}
