// Treemap nach Hauptabschnitt und Einheit (WP-L, Schritt 3). Die Fläche einer
// Kachel entspricht ihrem Anteil — an der Summe, und ohne Preise an der Anzahl.
// Beides steht in jeder Datei; eine Klassifizierung braucht es nicht.
//
// Klick: ein Abschnittskopf wählt den Abschnitt an, eine Einheitenkachel wählt
// ihn an und filtert zusätzlich nach der Einheit. Der Ansichtsmodus bleibt
// dabei stehen — ein Filter ist kein Ansichtswechsel (.claude/CLAUDE.md).
//
// Gezeichnet wird mit absolut gesetzten `div`s statt SVG: abgeschnittene
// Beschriftungen, Titel-Tooltips und Tastaturbedienung kommen damit ohne
// eigenen Nachbau aus.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatEuro, formatPositions } from '../../lib/format';
import { CATEGORY_COLORS, NEUTRAL_COLOR } from '../../lib/colors';
import { NO_UNIT } from '../../lib/overview/model';
import { squarify, type Rect } from '../../lib/overview/treemap';
import type { Measure, TreemapGroup } from '../../lib/overview/model';

/** Höhe der Karte; die Breite kommt aus dem Platz, den sie bekommt. */
const HEIGHT = 340;
/** Ohne gemessene Breite (jsdom, erster Frame) wird mit diesem Wert gerechnet. */
const FALLBACK_WIDTH = 960;
/** Kopfstreifen je Abschnitt — darunter liegen die Einheiten. */
const HEAD_HEIGHT = 20;
/** Kleiner als das liest niemand mehr eine Beschriftung. */
const LABEL_MIN_WIDTH = 54;
const LABEL_MIN_HEIGHT = 26;

export interface TreemapProps {
  groups: readonly TreemapGroup[];
  measure: Measure;
  /** Gerade angewählter Knoten — sein Abschnitt steht hervorgehoben. */
  selectedId: string | null;
  /** Gerade gefilterte Einheiten — ihre Kacheln stehen hervorgehoben. */
  activeUnits: ReadonlySet<string>;
  onPickSection: (sectionId: string) => void;
  onPickUnit: (sectionId: string, unit: string) => void;
}

/**
 * Beschriftung der Kurzinfo. Ohne Preise misst die Fläche schon die Anzahl —
 * dann stünde sie zweimal da.
 */
function describe(label: string, value: number, count: number, measure: Measure): string {
  const positions = formatPositions(count);
  return measure === 'preis'
    ? `${label} · ${formatEuro(value, 0)} · ${positions}`
    : `${label} · ${positions}`;
}

export function Treemap({
  groups,
  measure,
  selectedId,
  activeUnits,
  onPickSection,
  onPickUnit,
}: TreemapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = wrapRef.current;
    if (element === null) return;
    const measureWidth = (): void => setWidth(element.clientWidth);
    measureWidth();
    const observer = new ResizeObserver(measureWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const boxWidth = width > 0 ? width : FALLBACK_WIDTH;

  const placed = useMemo(() => {
    const outer: Rect = { x: 0, y: 0, width: boxWidth, height: HEIGHT };
    return squarify([...groups], outer).map((entry) => {
      const body: Rect = {
        x: entry.rect.x,
        y: entry.rect.y + HEAD_HEIGHT,
        width: entry.rect.width,
        height: Math.max(0, entry.rect.height - HEAD_HEIGHT),
      };
      // Kachel-Koordinaten relativ zur Abschnittsfläche: die Einheiten liegen im
      // `div` des Abschnitts, nicht im äußeren Rahmen.
      const cells = squarify([...entry.item.cells], body).map((cell) => ({
        item: cell.item,
        rect: {
          ...cell.rect,
          x: cell.rect.x - entry.rect.x,
          y: cell.rect.y - entry.rect.y,
        },
      }));
      return { group: entry.item, rect: entry.rect, cells };
    });
  }, [groups, boxWidth]);

  if (groups.length === 0) {
    return (
      <div className="border border-dashed border-line2 py-[40px] text-center font-mono text-[10px] text-mute">
        Keine Positionen im aktuellen Filter.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative border border-line" style={{ height: HEIGHT }}>
      {placed.map(({ group, rect, cells }) => {
        const color = group.pickable
          ? CATEGORY_COLORS[group.order % CATEGORY_COLORS.length]
          : NEUTRAL_COLOR;
        const active = selectedId !== null && selectedId === group.key;
        return (
          <div
            key={group.key}
            className="absolute overflow-hidden"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              background: color,
              outline: active ? '2px solid var(--blue)' : '1px solid var(--white)',
              outlineOffset: -1,
            }}
          >
            <button
              type="button"
              disabled={!group.pickable}
              onClick={() => onPickSection(group.key)}
              title={describe(group.label, group.value, group.count, measure)}
              className="block w-full cursor-pointer truncate border-none bg-transparent px-[5px] text-left font-mono text-[9.5px] leading-[20px] text-ink disabled:cursor-default"
              style={{ height: HEAD_HEIGHT }}
            >
              {rect.width > LABEL_MIN_WIDTH ? group.label : '…'}
            </button>
            {cells.map(({ item, rect: cell }) => (
              <button
                key={item.key}
                type="button"
                disabled={item.collected || item.key === NO_UNIT}
                onClick={() => onPickUnit(group.key, item.key)}
                title={`${group.label} · ${describe(item.label, item.value, item.count, measure)}`}
                className="absolute cursor-pointer overflow-hidden border border-solid border-white bg-white/35 p-[3px] text-left align-top font-mono text-[9px] leading-[1.25] text-ink disabled:cursor-default"
                style={{
                  left: cell.x,
                  top: cell.y,
                  width: cell.width,
                  height: cell.height,
                  outline: activeUnits.has(item.key) ? '2px solid var(--blue)' : undefined,
                  outlineOffset: -2,
                }}
              >
                {cell.width > LABEL_MIN_WIDTH && cell.height > LABEL_MIN_HEIGHT ? (
                  <span className="block truncate">{item.label}</span>
                ) : null}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
