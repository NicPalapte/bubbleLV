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
// Viewer-Zustand, nicht in dieser Komponente: die Breite gilt damit auch für
// das Eigenschaften-Panel der Tabellenansicht — eine Größe für alle
// Info-Panels —, und beides übersteht Schließen, Ansichtswechsel und den
// nächsten Import. Ein Reload setzt zurück, wie bei jedem Sitzungszustand.
//
// `data-graph-overlay` (lib/graph/overlay.ts): der Canvas darunter fängt Rad
// und Maustaste global für Zoom und Pan ab. Ohne die Markierung zoomt das Rad
// über der Karte den Graphen, statt ihren Inhalt zu scrollen (Issue #47).
//
// `ignoreDrag` an `useDismiss`: ein Pan auf dem Canvas endet fast immer
// außerhalb der Karte und darf sie trotzdem nicht schließen — nur ein
// tatsächlicher Klick daneben (oder Escape) hebt die Auswahl auf.

import { useCallback, useRef } from 'react';
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
  type PanelSize,
} from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface SelectionCardProps {
  node: LVNode;
  onClose: () => void;
}

/** Abstand zum Rand des Canvas, den die Karte auch aufgezogen frei lässt. */
const EDGE_GAP = 16;

export function SelectionCard({ node, onClose }: SelectionCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true, yieldToDialogs: true });

  const {
    view: { panelSize, cardPos },
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

  // Ziehen und Größe ändern teilt sich die Karte mit dem Vergleichsfenster
  // (WP-R, R3) — eine Mechanik, ein Verhalten.
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

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      className="absolute z-[10] flex flex-col overflow-hidden border border-line2 bg-white"
      style={{
        right: cardPos.right,
        top: cardPos.top,
        width: panelSize.width,
        height: panelSize.height ?? undefined,
        maxHeight: `calc(100% - ${cardPos.top + EDGE_GAP}px)`,
        boxShadow: 'var(--shadow-popover)',
      }}
    >
      <div
        {...handles.grip}
        title="Verschieben — ziehen"
        aria-label="Karte verschieben"
        className="flex shrink-0 cursor-grab items-center justify-center border-b border-line2 bg-panel py-[3px] text-[10px] leading-none text-dim active:cursor-grabbing"
      >
        ⠿
      </div>
      {/* Sprung in die Tabelle (WP-Q, Schritt 5; Issue #51): der Klick auf eine
          Bubble öffnet weiter diese Karte (Issue #30) — wer die Zeile im
          Zusammenhang sehen will, kommt von hier aus dorthin. */}
      <div className="flex shrink-0 justify-end border-b border-line2 bg-panel px-[8px] py-[4px]">
        <button
          type="button"
          onClick={jumpToTable}
          title={
            node.position !== null
              ? 'Diese Position in der Tabelle zeigen'
              : 'Diesen Abschnitt in der Tabelle zeigen'
          }
          className="inline-flex cursor-pointer items-center border border-line bg-white px-[8px] py-[2px] font-mono text-[9px] tracking-[0.6px] text-dim hover:text-blue focus-visible:text-blue"
        >
          IN DER TABELLE ZEIGEN
        </button>
      </div>
      {node.position !== null ? (
        <PositionDetails node={node} position={node.position} onClose={onClose} />
      ) : (
        <NodeDetails node={node} onClose={onClose} />
      )}
      {/* Trefferfläche 18 px, sichtbar sind nur die zwei Haarlinien in der Ecke;
          `currentColor` färbt sie beim Überfahren und bei Fokus blau. */}
      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Info-Panel in der Größe ändern"
        className="absolute bottom-0 left-0 z-[1] inline-flex h-[18px] w-[18px] cursor-sw-resize items-end justify-start border-none bg-transparent p-[3px] text-line2 hover:text-blue focus-visible:text-blue"
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
