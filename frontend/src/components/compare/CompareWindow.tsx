// Vergleich als Fenster über dem Graphen (WP-R, R3).
//
// Warum ein Fenster: zwei Bubbles mit Strg-Klick nebeneinanderzustellen ist
// eine Frage, die im Graphen entsteht — „was unterscheidet die beiden?". Das
// Fenster liegt über dem Graphen, die Bubbles bleiben sichtbar, die Auswahl
// bleibt erweiterbar. Seit dem neuen Hauptscreen ist es der einzige Vergleich
// (docs/decisions/0032-graph-als-hauptscreen.md).
//
// Ort und Größe liegen im Ansichtszustand (`view.compare.windowPos/Size`),
// nicht hier: sie überleben Schließen, Ansichtswechsel und den nächsten
// Import. Ein Reload setzt zurück, wie bei jedem Sitzungszustand.
//
// Kein Escape und kein „Klick daneben schließt": das Fenster ist keine
// Auswahlkarte, sondern bleibt stehen, solange der Vergleich steht. Escape
// gehört im Graphen der Karte und danach der hervorgehobenen
// Ähnlichkeitsgruppe (BubbleGraph) — eine dritte Ebene machte die Taste
// unvorhersehbar.

import { useCallback, useRef } from 'react';
import { CompareBody } from './CompareBody';
import { useDragResize } from '../common/useDragResize';
import { diffCount } from '../../lib/compare/rows';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { formatCount } from '../../lib/format';
import {
  COMPARE_MAX_WIDTH,
  COMPARE_MIN_HEIGHT,
  COMPARE_MIN_WIDTH,
  MAX_COMPARE_COLUMNS,
  useViewer,
  useViewerDispatch,
  type CardPos,
  type PanelSize,
} from '../../state/viewer';

/** Abstand zum Rand des Canvas, den das Fenster auch aufgezogen frei lässt. */
const EDGE_GAP = 16;


export function CompareWindow() {
  const {
    comparePositions,
    view: {
      compare: { onlyDiffs, windowOpen, windowPos, windowSize },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);

  const setPos = useCallback(
    (pos: CardPos): void => dispatch({ type: 'compareWindowPos', pos }),
    [dispatch],
  );
  const setSize = useCallback(
    (size: PanelSize): void => dispatch({ type: 'compareWindowSize', size }),
    [dispatch],
  );

  // Dieselbe Mechanik wie die Auswahlkarte (common/useDragResize.ts): das
  // Fenster hängt rechts oben und wächst nach links und unten.
  const handles = useDragResize({
    ref,
    pos: windowPos,
    size: windowSize,
    minWidth: COMPARE_MIN_WIDTH,
    maxWidth: COMPARE_MAX_WIDTH,
    minHeight: COMPARE_MIN_HEIGHT,
    setPos,
    setSize,
  });

  const gezeigt = comparePositions.slice(0, MAX_COMPARE_COLUMNS);
  // Ob es dasteht, entscheidet `windowOpen` (state/viewer.ts): auf ab zwei
  // Positionen, beim Aussortieren offen bis zur letzten Spalte.
  if (!windowOpen || gezeigt.length === 0) return null;

  const wartend = comparePositions.length - gezeigt.length;
  const unterschiede = diffCount(gezeigt);

  return (
    <div
      ref={ref}
      {...graphOverlayProps}
      role="group"
      aria-label="Vergleich — Fenster über dem Graphen"
      className="ov-window absolute z-[11] flex flex-col overflow-hidden"
      style={{
        right: windowPos.right,
        top: windowPos.top,
        width: windowSize.width,
        height: windowSize.height ?? undefined,
        maxHeight: `calc(100% - ${windowPos.top + EDGE_GAP}px)`,
      }}
    >
      <div
        {...handles.grip}
        title="Verschieben — ziehen"
        aria-label="Vergleichsfenster verschieben"
        className="flex shrink-0 cursor-grab items-center justify-center border-b border-line2 bg-panel py-[3px] text-[10px] leading-none text-dim active:cursor-grabbing"
      >
        ⠿
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-[8px] gap-y-[4px] border-b border-line2 bg-panel px-[8px] py-[4px]">
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
          VERGLEICH · {formatCount(gezeigt.length)} POS.
          {unterschiede > 0 && ` · ${formatCount(unterschiede)} UNTERSCHIEDE`}
          {/* Mehr gewählt als nebeneinander passen: das muss dastehen, sonst
              sieht es aus, als wäre eine Auswahl verlorengegangen. */}
          {wartend > 0 && ` · ${formatCount(wartend)} WARTEN`}
        </span>
        <div className="ml-auto flex items-center gap-[6px]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'compareOnlyDiffs', value: !onlyDiffs })}
            aria-pressed={onlyDiffs}
            title="Nur die Zeilen zeigen, in denen sich die Spalten unterscheiden"
            className={`cursor-pointer border bg-white px-[6px] py-[2px] font-mono text-[9px] tracking-[0.6px] hover:text-blue focus-visible:text-blue ${
              onlyDiffs ? 'border-blue text-blue' : 'border-line text-dim'
            }`}
          >
            NUR UNTERSCHIEDE
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'compareWindow', open: false })}
            aria-label="Vergleichsfenster schließen"
            title="Fenster schließen — die Positionen bleiben im Vergleich"
            className="cursor-pointer border border-line bg-white px-[6px] py-[2px] font-mono text-[9px] text-mute hover:text-blue focus-visible:text-blue"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Nach dem Aussortieren kann eine Spalte übrig sein — dann steht da,
          wie die nächste dazukommt, statt eines Vergleichs ohne Gegenstück. */}
      {gezeigt.length === 1 && (
        <p className="shrink-0 border-b border-line2 px-[10px] py-[4px] font-sans text-[11px] leading-[1.4] text-dim">
          Eine Position — mit Strg-Klick oder Rechtsklick kommt die nächste dazu.
        </p>
      )}

      {/* Eigenes Scrollen in beide Richtungen: fünf Spalten sind breiter als
          jedes Fenster. `data-graph-overlay` an der Wurzel hält das Rad hier
          drin, statt den Graphen darunter zu zoomen (lib/graph/overlay.ts). */}
      <div className="min-h-0 flex-1 overflow-auto px-[10px] pb-[14px]">
        <CompareBody gezeigt={gezeigt} onlyDiffs={onlyDiffs} />
      </div>

      {/* Griff wie an der Auswahlkarte: sichtbar sind nur zwei Haarlinien. */}
      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Vergleichsfenster in der Größe ändern"
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
