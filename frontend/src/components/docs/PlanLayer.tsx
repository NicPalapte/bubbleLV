// Messungen über einer Planseite (Entscheidung 0095): Linien, Flächen und Stückpunkte
// als SVG in Seiten-Einheiten, darüber die Werte. Im Messmodus nimmt die Ebene das
// Antippen auf und meldet den Punkt in Seiten-Einheiten — unabhängig vom Zoom.

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PlanPoint } from '@core';
import type { PageSize } from './PdfPage';
import {
  centerOf,
  formatMeasure,
  measureValue,
  type MeasureKind,
  type PlanMeasure,
  type PlanScale,
} from '../../lib/docs/planNotes';

export type PlanTool = MeasureKind | 'massstab';

export interface PlanDraft {
  readonly page: number;
  readonly points: readonly PlanPoint[];
}

const pointsAttr = (points: readonly PlanPoint[]): string =>
  points.map(([x, y]) => `${x},${y}`).join(' ');

function colorOf(measure: PlanMeasure, selected: boolean): string {
  if (selected) return 'var(--accent)';
  return measure.links.length === 0 ? 'var(--amber)' : 'var(--dot-7)';
}

function Shape({
  measure,
  selected,
  scale,
}: {
  measure: PlanMeasure;
  selected: boolean;
  scale: number;
}) {
  const color = colorOf(measure, selected);
  const width = selected ? 3 : 2;
  if (measure.kind === 'stueck') {
    return (
      <g>
        {measure.points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={9 / scale}
            fill="var(--surface)"
            stroke={color}
            strokeWidth={width}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    );
  }
  if (measure.kind === 'flaeche') {
    return (
      <polygon
        points={pointsAttr(measure.points)}
        fill={color}
        fillOpacity={selected ? 0.28 : 0.16}
        stroke={color}
        strokeWidth={width}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return (
    <polyline
      points={pointsAttr(measure.points)}
      fill="none"
      stroke={color}
      strokeWidth={width + 1}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function PlanLayer({
  size,
  scale,
  measures,
  planScale,
  draft,
  tool,
  selected,
  picking,
  onTap,
  onPick,
}: {
  size: PageSize;
  scale: number;
  measures: readonly PlanMeasure[];
  planScale: PlanScale | null;
  /** Begonnene Messung auf dieser Seite. */
  draft: readonly PlanPoint[] | null;
  /** Aktives Werkzeug; `null`: nur zeigen. */
  tool: PlanTool | null;
  selected: string | null;
  /** Rechenansatz wird gebildet: Messungen sind antippbar. */
  picking: boolean;
  onTap: (point: PlanPoint) => void;
  onPick: (id: string) => void;
}) {
  const width = Math.floor(size.width * scale);
  const height = Math.floor(size.height * scale);
  const capture = tool !== null;
  const tap = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!capture || event.button > 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    onTap([(event.clientX - box.left) / scale, (event.clientY - box.top) / scale]);
    event.preventDefault();
  };
  const draftColor = 'var(--accent)';

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-[3]" style={{ width, height }}>
      <svg
        aria-hidden={!capture}
        aria-label={capture ? 'Plan: Punkt setzen' : undefined}
        role={capture ? 'application' : undefined}
        viewBox={`0 0 ${size.width} ${size.height}`}
        width={width}
        height={height}
        onPointerDown={tap}
        className={capture ? 'pointer-events-auto cursor-crosshair touch-none' : ''}
      >
        {measures.map((measure) => (
          <Shape
            key={measure.id}
            measure={measure}
            selected={measure.id === selected}
            scale={scale}
          />
        ))}
        {draft !== null && draft.length > 0 && (
          <g>
            {tool === 'flaeche' && draft.length > 2 && (
              <polygon
                points={pointsAttr(draft)}
                fill={draftColor}
                fillOpacity={0.12}
                stroke="none"
              />
            )}
            {tool !== 'stueck' && (
              <polyline
                points={pointsAttr(draft)}
                fill="none"
                stroke={draftColor}
                strokeWidth={2}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {draft.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={(i === 0 && tool === 'flaeche' ? 9 : 6) / scale}
                fill={i === 0 ? 'var(--surface)' : draftColor}
                stroke={draftColor}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}
      </svg>
      {measures.map((measure) => {
        const [cx, cy] = centerOf(measure.points);
        const value = measureValue(measure, planScale);
        const on = measure.id === selected;
        return (
          <button
            key={measure.id}
            type="button"
            onClick={() => onPick(measure.id)}
            title={picking ? 'In den Ansatz übernehmen' : 'Messung zeigen'}
            className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-[var(--r-pill)] border px-[8px] py-[3px] font-sans text-[12px] font-semibold shadow-[var(--shadow-sm)] ${
              on
                ? 'border-accent bg-accent-soft text-accent-ink'
                : picking
                  ? 'border-accent bg-surface text-ink'
                  : 'border-line bg-surface text-ink'
            }`}
            style={{ left: cx * scale, top: cy * scale }}
          >
            {measure.name !== '' && (
              <span className="mr-[6px] font-normal text-dim">{measure.name}</span>
            )}
            {formatMeasure(value, measure.kind)}
          </button>
        );
      })}
    </div>
  );
}
