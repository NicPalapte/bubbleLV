// Positionsvergleich als Fenster über dem Graphen (Mockup v3, Bereich H).
// Bis zu vier Positionen nebeneinander; Zellen, die von der ersten Spalte
// abweichen, sind markiert, im Langtext die Wörter, die nicht in allen Texten
// stehen (Entscheidung 0020). Dieselbe Zieh-/Größen-Mechanik wie die Tabelle.

import { useCallback, useMemo, useRef } from 'react';
import { sidePanelSpace } from './SidePanel';
import { useDragResize } from '../common/useDragResize';
import { compareRows } from '../../lib/compare/rows';
import { markCommonWords } from '../../lib/compare/textDiff';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { formatCount, formatNumber } from '../../lib/format';
import { clusterByPosition } from '../../lib/relate';
import { canonicalUnit, unitLabel } from '../../lib/units';
import {
  MAX_COMPARE,
  TABLE_MAX_WIDTH,
  TABLE_MIN_HEIGHT,
  TABLE_MIN_WIDTH,
  useViewer,
  useViewerDispatch,
  type CardPos,
  type PanelSize,
} from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';

/** Abstand zum Rand des Canvas, den das Fenster auch aufgezogen frei lässt. */
const EDGE_GAP = 16;
/** So viele Vorschläge stehen unter „Ähnlich". */
const MAX_SUGGESTIONS = 5;

const CAP = 'font-mono text-[10px] font-medium uppercase tracking-[0.6px] text-mute';
const LABEL_CELL = `sticky left-0 z-[1] w-[110px] min-w-[110px] border-b border-line bg-sunken px-[12px] py-[8px] text-left align-top ${CAP}`;
const VALUE_CELL = 'min-w-[200px] border-b border-line px-[12px] py-[8px] align-top';

interface Row {
  key: string;
  label: string;
  values: readonly (string | null)[];
  /** Merkmalszeile aus `compareRows`; nur sie wird markiert und gezählt. */
  feature: boolean;
}

function amount(position: PositionSummary): string {
  if (position.quantity === null) return '';
  const unit = canonicalUnit(position.unit);
  return `${formatNumber(position.quantity)}${unit === null ? '' : ` ${unitLabel(unit)}`}`;
}

export function CompareWindow() {
  const {
    lv,
    parents,
    hints,
    nodes,
    comparePositions,
    view: { compareWindow, side, sideWidth },
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
  const handles = useDragResize({
    ref,
    pos: compareWindow.pos,
    size: compareWindow.size,
    minWidth: TABLE_MIN_WIDTH,
    maxWidth: TABLE_MAX_WIDTH,
    minHeight: TABLE_MIN_HEIGHT,
    setPos,
    setSize,
    corner: 'right',
  });

  const clusters = useMemo(() => (lv === null ? null : clusterByPosition(lv.relations)), [lv]);

  // Nur Positionsknoten haben Merkmale; Kopf, Zeilen und Langtext laufen über
  // dieselbe Liste, damit keine Spalte gegen ihre Werte verrutscht.
  const columns = comparePositions.flatMap((node) =>
    node.position === null ? [] : [{ node, position: node.position }],
  );

  if (!compareWindow.open || columns.length === 0) return null;

  // Abschnitt und Hinweise sind Kontext, keine Merkmale: sie stehen oben, werden
  // aber weder markiert noch gezählt — sonst hätten zwei gleiche Positionen aus
  // verschiedenen Abschnitten immer „1 Unterschied".
  const features = compareRows(columns.map(({ position }) => position));
  const rows: Row[] = [
    {
      key: 'abschnitt',
      label: 'Abschnitt',
      feature: false,
      values: columns.map(({ node }) => {
        const parent = parents.get(node.id) ?? null;
        return parent === null ? null : `${parent.code}  ${parent.label ?? ''}`.trim();
      }),
    },
    {
      key: 'hinweise',
      label: 'Hinweise',
      feature: false,
      values: columns.map(({ node }) => {
        const ids = [...new Set(hints.get(node.id)?.flags.map((f) => f.id) ?? [])];
        return ids.length === 0 ? null : ids.join(' · ');
      }),
    },
    ...features.map((row) => ({ ...row, feature: true })),
  ];
  // Dieselbe Zählung wie `diffCount` (lib/compare/rows.ts): roher Wert, nicht Anzeige.
  const differing = features.filter((row) => row.differs).length;
  const longTexts = markCommonWords(columns.map(({ position }) => position.longText));

  const first = columns[0].node.id;
  const inCompare = new Set(comparePositions.map((node) => node.id));
  const suggestions: LVNode[] =
    columns.length >= MAX_COMPARE
      ? []
      : (clusters?.get(first)?.positionIds ?? [])
          .filter((id) => !inCompare.has(id))
          .slice(0, MAX_SUGGESTIONS)
          .flatMap((id) => {
            const node = nodes.get(id);
            return node === undefined || node.position === null ? [] : [node];
          });

  const select = (node: LVNode): void =>
    dispatch({
      type: 'selectPosition',
      nodeId: parents.get(node.id)?.id ?? null,
      positionId: node.id,
    });

  return (
    <section
      ref={ref}
      {...graphOverlayProps}
      aria-label="Positionsvergleich — Fenster über dem Graphen"
      className="ov-window absolute z-[11] flex flex-col overflow-hidden"
      style={{
        right: compareWindow.pos.right,
        top: compareWindow.pos.top,
        width: compareWindow.size.width,
        height: compareWindow.size.height ?? undefined,
        maxWidth:
          side === null
            ? `calc(100% - ${compareWindow.pos.right + EDGE_GAP}px)`
            : `max(${TABLE_MIN_WIDTH}px, calc(100% - ${compareWindow.pos.right + sidePanelSpace(sideWidth)}px))`,
        maxHeight: `calc(100% - ${compareWindow.pos.top + EDGE_GAP}px)`,
      }}
    >
      <div
        {...handles.grip}
        title="Verschieben — ziehen"
        className="flex h-[40px] shrink-0 cursor-grab items-center gap-[10px] border-b border-line pl-[10px] pr-[6px] active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-[10px] tracking-[-2px] text-mute">
          ⋮⋮
        </span>
        <b className="font-sans text-[13px] font-semibold text-ink">Positionsvergleich</b>
        {columns.length > 1 && (
          <span className="font-mono text-[10.5px] text-mute">
            {formatCount(differing)} {differing === 1 ? 'Unterschied' : 'Unterschiede'}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => dispatch({ type: 'clearCompare' })}
          className="h-[28px] cursor-pointer rounded-[var(--r-sm)] border-none bg-transparent px-[10px] font-mono text-[11px] text-dim hover:bg-sunken hover:text-ink"
        >
          leeren
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => dispatch({ type: 'compareWindow', open: false })}
          aria-label="Vergleich schließen"
          title="Fenster schließen — die Positionen bleiben im Vergleich"
          className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>

      {columns.length < MAX_COMPARE && (
        <div className="flex shrink-0 flex-wrap items-center gap-[6px] border-b border-line bg-surface px-[12px] py-[10px] font-mono text-[10.5px]">
          <span className={CAP}>Ähnlich</span>
          {suggestions.length === 0 ? (
            <span className="text-mute">keine gleichartigen Positionen</span>
          ) : (
            suggestions.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => dispatch({ type: 'toggleCompare', positionId: node.id })}
                title={node.position?.shortText}
                className="inline-flex h-[24px] cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border border-line bg-surface px-[10px] text-ink hover:border-line2"
              >
                + {node.position?.oz}
                {node.position !== null && amount(node.position) !== '' && (
                  <span className="text-[10px] text-mute">{amount(node.position)}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <table className="w-full border-separate border-spacing-0 font-mono text-[11px]">
          <thead>
            <tr>
              <th className={`${LABEL_CELL} top-0 z-[3]`} />
              {columns.map(({ node, position }, i) => (
                <th
                  key={node.id}
                  className="sticky top-0 z-[2] min-w-[200px] border-b border-line bg-sunken px-[12px] py-[10px] text-left align-top font-normal"
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue text-[10px] text-white">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => select(node)}
                      title="In der Positionskarte zeigen"
                      className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-ink hover:text-blue"
                    >
                      {position.oz}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'toggleCompare', positionId: node.id })}
                      aria-label={`${position.oz} aus dem Vergleich nehmen`}
                      className="ml-auto inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-surface hover:text-ink"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-[6px] font-sans text-[12.5px] font-semibold leading-[1.3] text-ink">
                    {position.shortText}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className={LABEL_CELL}>
                  {row.label}
                </th>
                {row.values.map((value, i) => {
                  // Markiert ist, was von der ersten Spalte abweicht — sie ist die
                  // Bezugsposition. Sehen zwei Werte gerundet gleich aus, zeigt
                  // `compareRows` schon mehr Stellen; die Anzeige reicht hier also.
                  const differs = row.feature && i > 0 && value !== row.values[0];
                  return (
                    <td
                      key={columns[i].node.id}
                      data-differs={differs || undefined}
                      className={`${VALUE_CELL} whitespace-normal text-ink ${differs ? 'bg-amberS' : ''}`}
                    >
                      {value ?? <span className="text-mute">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className={LABEL_CELL}>
                Langtext
              </th>
              {longTexts.map((parts, i) => (
                <td
                  key={columns[i].node.id}
                  className={`${VALUE_CELL} whitespace-pre-wrap font-sans text-[12px] leading-[1.55] text-ink`}
                >
                  {parts.length === 0 ? (
                    <span className="text-mute">—</span>
                  ) : (
                    parts.map((part, j) =>
                      part.common ? (
                        <span key={j}>{part.text}</span>
                      ) : (
                        <mark key={j} className="rounded-[3px] bg-amberS px-[2px] text-ink">
                          {part.text}
                        </mark>
                      ),
                    )
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <button
        type="button"
        {...handles.resize}
        title="Größe ändern — ziehen oder Pfeiltasten"
        aria-label="Vergleich in der Größe ändern"
        className="absolute bottom-0 right-0 z-[4] inline-flex h-[18px] w-[18px] cursor-se-resize items-end justify-end border-none bg-transparent p-[3px] text-line2 hover:text-blue focus-visible:text-blue"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M12 3.5 L3.5 12 M12 8 L8 12"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      </button>
    </section>
  );
}
