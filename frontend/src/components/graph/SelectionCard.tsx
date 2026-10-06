// Schwebende Auswahlkarte im Graphen (Issue #30): ersetzt den früheren Sprung
// in die Tabelle beim Klick auf eine Bubble. Zeigt Positionsdetails für eine
// Position bzw. Kennzahlen für einen Abschnitt/ein Los/das Projekt — fest über
// dem Canvas platziert statt an der Bubble verankert, damit sie unabhängig von
// Zoom, Pan und Clustering lesbar bleibt.
//
// Frei verschiebbar (Ziehgriff oben in der Karte): Standardort ist oben
// rechts, wo sie sich mit der Canvas-Steuerung (GraphControls, unten rechts)
// beißen kann, sobald sie groß genug wird — die Karte lässt sich dann selbst
// aus dem Weg schieben, statt fest an der Ecke zu kleben.
//
// Größe am Griff unten links: die Karte hängt rechts oben, deshalb wächst sie
// nach links und unten. Größe (`panelSize`) und Ort (`cardPos`) liegen im
// Viewer-Zustand, nicht in dieser Komponente: beides übersteht Schließen,
// Fensterwechsel und den nächsten Import. Ein Reload setzt zurück, wie bei jedem Sitzungszustand.
//
// `data-graph-overlay` (lib/graph/overlay.ts): der Canvas darunter fängt Rad
// und Maustaste global für Zoom und Pan ab. Ohne die Markierung zoomt das Rad
// über der Karte den Graphen, statt ihren Inhalt zu scrollen (Issue #47).
//
// `ignoreDrag` an `useDismiss`: ein Pan auf dem Canvas endet fast immer
// außerhalb der Karte und darf sie trotzdem nicht schließen — nur ein
// tatsächlicher Klick daneben (oder Escape) hebt die Auswahl auf.

import { useCallback, useRef } from 'react';
import { CARD_BUTTON } from '../common/CardParts';
import { NodeDetails } from '../common/NodeDetails';
import { PositionDetails } from '../common/PositionDetails';
import { useDismiss } from '../common/useDismiss';
import { useDragResize } from '../common/useDragResize';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { graphOverlayProps } from '../../lib/graph/overlay';
import {
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  useViewer,
  useViewerDispatch,
  type CardPos,
  MAX_COMPARE,
  type PanelSize,
} from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface SelectionCardProps {
  node: LVNode;
  onClose: () => void;
}

/** Abstand zum Rand des Canvas, den die Karte auch aufgezogen frei lässt. */
const EDGE_GAP = 16;
/** Unten bleibt die Steuerung am Graphen frei: feste Teile bleiben stehen, die Karte weicht. */
const CONTROLS_SPACE = 52;

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
        inCompare || blocked
          ? `${CARD_BUTTON} disabled:cursor-default disabled:opacity-50`
          : 'h-[30px] cursor-pointer rounded-[var(--r-sm)] border border-blue bg-blue px-[12px] font-mono text-[10.5px] text-white hover:bg-blueD'
      }
    >
      {inCompare ? '✓ Vergleich' : '⇄ Vergleichen'}
    </button>
  );
}

export function SelectionCard({ node, onClose }: SelectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true, yieldToDialogs: true });

  const {
    view: { panelSize, cardPos },
    selection: { compare },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  /** Position → ihre Zeile; Abschnitt oder Los → seine Teilmenge der Tabelle. */
  const jumpToTable = useCallback((): void => {
    if (node.position !== null) jumpToPosition(node.id);
    else dispatch({ type: 'openInTable', id: node.id });
  }, [node, jumpToPosition, dispatch]);
  const setSize = useCallback(
    (size: PanelSize): void => dispatch({ type: 'panelSize', size }),
    [dispatch],
  );
  const setPos = useCallback(
    (pos: CardPos): void => dispatch({ type: 'cardPos', pos }),
    [dispatch],
  );

  // Ziehen und Größe ändern teilt sich die Karte mit dem Tabellenfenster —
  // eine Mechanik, ein Verhalten.
  const handles = useDragResize({
    ref,
    pos: cardPos,
    size: panelSize,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    minHeight: PANEL_MIN_HEIGHT,
    setPos,
    setSize,
  });

  const grip = (
    <span
      {...handles.grip}
      title="Verschieben — ziehen"
      aria-label="Karte verschieben"
      className="-ml-[4px] inline-flex shrink-0 cursor-grab items-center rounded-[var(--r-sm)] px-[3px] text-[12px] leading-none text-mute hover:text-ink active:cursor-grabbing"
    >
      ⠿
    </span>
  );

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      data-selection-card=""
      className="ov-window absolute z-[10] flex flex-col overflow-hidden"
      style={{
        right: cardPos.right,
        top: cardPos.top,
        width: panelSize.width,
        height: panelSize.height ?? undefined,
        maxHeight: `calc(100% - ${cardPos.top + EDGE_GAP + CONTROLS_SPACE}px)`,
      }}
    >
      {node.position !== null ? (
        <PositionDetails node={node} position={node.position} onClose={onClose} grip={grip} />
      ) : (
        <NodeDetails node={node} onClose={onClose} grip={grip} />
      )}
      {/* Sprung in die Tabelle (WP-Q, Schritt 5; Issue #51): der Klick auf eine
          Bubble öffnet diese Karte — wer die Zeile im Zusammenhang sehen will,
          kommt von hier aus dorthin. */}
      <div className="flex shrink-0 gap-[8px] border-t border-line px-[16px] py-[10px]">
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
      {/* Trefferfläche 18 px, sichtbar sind nur die zwei Haarlinien in der Ecke;
          `currentColor` färbt sie beim Überfahren und bei Fokus blau. */}
      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Info-Panel in der Größe ändern"
        className="absolute bottom-0 left-0 z-[1] inline-flex h-[18px] w-[18px] cursor-sw-resize items-end justify-start border-none bg-transparent p-[4px] text-line2 hover:text-blue focus-visible:text-blue"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          shapeRendering="geometricPrecision"
        >
          <path d="M0 3.5 L8.5 12 M0 8 L4 12" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>
    </div>
  );
}
