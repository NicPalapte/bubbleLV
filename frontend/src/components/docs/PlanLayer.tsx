// Messungen über einer Planseite (Entscheidung 0095): Linien, Flächen und Stückpunkte
// als SVG in Seiten-Einheiten, darüber die Werte. Im Messmodus nimmt die Ebene das
// Antippen auf und meldet den Punkt in Seiten-Einheiten — unabhängig vom Zoom.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PlanPoint } from '@core';
import type { PageSize } from './PdfPage';
import type { PlanTool } from './planTools';
import type { Snap } from './pageMask';
import {
  centerOf,
  formatAmount,
  formatMeasure,
  measureValue,
  rectangleFrom,
  segmentValues,
  type PlanMeasure,
  type PlanScale,
} from '../../lib/docs/planNotes';

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

/** Querstrich an einem Punkt der Maßkette, senkrecht zur Kette. */
function Tick({
  at,
  points,
  index,
  scale,
  color,
}: {
  at: PlanPoint;
  points: readonly PlanPoint[];
  index: number;
  scale: number;
  color: string;
}) {
  const a = points[Math.max(0, index - 1)];
  const b = points[Math.min(points.length - 1, index + 1)];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (-(b[1] - a[1]) / length) * (8 / scale);
  const ny = ((b[0] - a[0]) / length) * (8 / scale);
  return (
    <line
      x1={at[0] - nx}
      y1={at[1] - ny}
      x2={at[0] + nx}
      y2={at[1] + ny}
      stroke={color}
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
    />
  );
}

/** Vorschau der begonnenen Messung bis zum Mauszeiger. */
function DraftShape({
  tool,
  points,
  hover,
  scale,
}: {
  tool: PlanTool;
  points: readonly PlanPoint[];
  hover: PlanPoint | null;
  scale: number;
}) {
  const color = 'var(--accent)';
  const all = hover !== null && tool !== 'stueck' ? [...points, hover] : points;
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: '6 4',
    vectorEffect: 'non-scaling-stroke' as const,
  };
  let shape = null;
  if (tool === 'rechteck' && all.length >= 2) {
    shape = (
      <polygon
        points={pointsAttr(rectangleFrom(all[0], all[1]))}
        fill={color}
        fillOpacity={0.12}
        {...stroke}
      />
    );
  } else if (tool === 'kreis' && all.length >= 2) {
    const [[cx, cy], [ex, ey]] = all;
    shape = (
      <circle
        cx={cx}
        cy={cy}
        r={Math.hypot(ex - cx, ey - cy)}
        fill={color}
        fillOpacity={0.12}
        {...stroke}
      />
    );
  } else if (tool === 'polygon' && all.length > 2) {
    shape = <polygon points={pointsAttr(all)} fill={color} fillOpacity={0.12} {...stroke} />;
  } else if (tool !== 'stueck') {
    shape = <polyline points={pointsAttr(all)} fill="none" {...stroke} />;
  }
  return (
    <g>
      {shape}
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={(i === 0 && tool === 'polygon' ? 9 : 6) / scale}
          fill={i === 0 ? 'var(--surface)' : color}
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

/** Erkannte Fläche: kräftig hinterlegt, damit klar ist, was ein Klick übernimmt. */
function SnapShape({ snap }: { snap: Snap }) {
  const look = {
    fill: 'var(--accent)',
    fillOpacity: 0.2,
    stroke: 'var(--accent)',
    strokeWidth: 2,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  if (snap.shape === 'kreis' && snap.points.length >= 2) {
    const [[cx, cy], [ex, ey]] = snap.points;
    return <circle cx={cx} cy={cy} r={Math.hypot(ex - cx, ey - cy)} {...look} />;
  }
  return <polygon points={pointsAttr(snap.points)} {...look} />;
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
  if (measure.kind === 'flaeche' && measure.shape === 'kreis' && measure.points.length >= 2) {
    const [[cx, cy], [ex, ey]] = measure.points;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={Math.hypot(ex - cx, ey - cy)}
        fill={color}
        fillOpacity={selected ? 0.28 : 0.16}
        stroke={color}
        strokeWidth={width}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  if (measure.kind === 'kette') {
    return (
      <g>
        <polyline
          points={pointsAttr(measure.points)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          vectorEffect="non-scaling-stroke"
        />
        {measure.points.map(([x, y], i) => (
          <Tick key={i} at={[x, y]} points={measure.points} index={i} scale={scale} color={color} />
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
  snap,
  onTap,
  onPick,
  onHover,
}: {
  size: PageSize;
  scale: number;
  measures: readonly PlanMeasure[];
  planScale: PlanScale | null;
  /** Begonnene Messung auf dieser Seite. */
  draft: readonly PlanPoint[] | null;
  /** Aktives Werkzeug; `null`: nur zeigen. */
  tool: PlanTool | null;
  selected: readonly string[];
  /** Erkannte Fläche unter dem Mauszeiger; ein Klick übernimmt sie. */
  snap: Snap | null;
  /** Rechenansatz wird gebildet: Messungen sind antippbar. */
  picking: boolean;
  onTap: (point: PlanPoint) => void;
  /** `add`: mit Shift zur Auswahl dazu. */
  onPick: (id: string, add: boolean) => void;
  /** Mauszeiger über der Seite (Seiten-Einheiten); `free` = Alt, nicht erkennen. */
  onHover: (point: PlanPoint | null, free: boolean) => void;
}) {
  const width = Math.floor(size.width * scale);
  const height = Math.floor(size.height * scale);
  const capture = tool !== null;
  const [hover, setHover] = useState<PlanPoint | null>(null);
  const move = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!capture || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    const point: PlanPoint = [
      (event.clientX - box.left) / scale,
      (event.clientY - box.top) / scale,
    ];
    onHover(point, event.altKey);
    if (draft !== null && draft.length > 0) setHover(point);
  };
  // Punkt erst beim Loslassen setzen: wer zieht, verschiebt den Plan (DocumentView).
  const down = useRef<{ x: number; y: number } | null>(null);
  const press = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!capture || event.button > 0) return;
    down.current = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  };
  const tap = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const start = down.current;
    down.current = null;
    if (!capture || start === null) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5) return;
    const box = event.currentTarget.getBoundingClientRect();
    onTap([(event.clientX - box.left) / scale, (event.clientY - box.top) / scale]);
  };

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-[3]" style={{ width, height }}>
      <svg
        aria-hidden={!capture}
        aria-label={capture ? 'Plan: Punkt setzen' : undefined}
        role={capture ? 'application' : undefined}
        viewBox={`0 0 ${size.width} ${size.height}`}
        width={width}
        height={height}
        onPointerDown={press}
        onPointerUp={tap}
        onPointerMove={move}
        onPointerLeave={() => {
          setHover(null);
          onHover(null, false);
        }}
        className={capture ? 'pointer-events-auto cursor-crosshair touch-none' : ''}
      >
        {measures.map((measure) => (
          <Shape
            key={measure.id}
            measure={measure}
            selected={selected.includes(measure.id)}
            scale={scale}
          />
        ))}
        {snap !== null && <SnapShape snap={snap} />}
        {draft !== null && tool !== null && draft.length > 0 && (
          <DraftShape tool={tool} points={draft} hover={hover} scale={scale} />
        )}
      </svg>
      {measures.map((measure) =>
        measure.kind !== 'kette'
          ? null
          : segmentValues(measure.points, planScale).map((value, i) => {
              const [ax, ay] = measure.points[i];
              const [bx, by] = measure.points[i + 1];
              return (
                <span
                  key={`${measure.id}-${i}`}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-[var(--r-sm)] bg-surface px-[4px] font-sans text-[11px] text-ink opacity-90"
                  style={{ left: ((ax + bx) / 2) * scale, top: ((ay + by) / 2) * scale }}
                >
                  {value === null ? '—' : formatAmount(value, 2)}
                </span>
              );
            }),
      )}
      {measures.map((measure) => {
        // Kreis: Wert in der Mitte; Maßkette: Summe hinter dem letzten Punkt.
        const [cx, cy] =
          measure.kind === 'flaeche' && measure.shape === 'kreis'
            ? measure.points[0]
            : measure.kind === 'kette'
              ? measure.points[measure.points.length - 1]
              : centerOf(measure.points);
        const value = measureValue(measure, planScale);
        const on = selected.includes(measure.id);
        return (
          <button
            key={measure.id}
            type="button"
            onClick={(event) => onPick(measure.id, event.shiftKey)}
            title={picking ? 'In den Ansatz übernehmen' : 'Messung zeigen'}
            className={`pointer-events-auto absolute ${
              measure.kind === 'kette' ? 'translate-x-[12px]' : '-translate-x-1/2'
            } -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-[var(--r-pill)] border px-[8px] py-[3px] font-sans text-[12px] font-semibold shadow-[var(--shadow-sm)] ${
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
