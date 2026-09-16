// Treemap nach Gewerk und Abschnitt (WP-L, Schritt 3). Die Fläche einer Kachel
// entspricht ihrem Anteil — an der Summe, und ohne Preise an der Anzahl.
//
// Klick filtert: ein Gewerk-Kopf setzt die Facette `gewerk`, eine Abschnitts-
// kachel wählt zusätzlich den Abschnitt an. Der Ansichtsmodus bleibt dabei
// stehen — ein Filter ist kein Ansichtswechsel (.claude/CLAUDE.md).
//
// „Ohne Gewerk" und „Weitere n Gewerke" sind **keine** Gewerke, sondern
// Sammelkacheln. Ihre Abschnitte lassen sich anwählen, filtern aber nicht:
// als Facettenwert gesetzt träfen sie auf keine einzige Position, und die
// Tabelle stünde ohne erkennbaren Grund leer da.
//
// Gezeichnet wird mit absolut gesetzten `div`s statt SVG: abgeschnittene
// Beschriftungen, Titel-Tooltips und Tastaturbedienung kommen damit ohne
// eigenen Nachbau aus.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatEuro, formatPositions } from '../../lib/format';
import { squarify, type Rect } from '../../lib/overview/treemap';
import type { ColorScale } from '../../lib/colors';
import type { Measure, TreemapGroup } from '../../lib/overview/model';

/** Höhe der Karte; die Breite kommt aus dem Platz, den sie bekommt. */
const HEIGHT = 340;
/** Ohne gemessene Breite (jsdom, erster Frame) wird mit diesem Wert gerechnet. */
const FALLBACK_WIDTH = 960;
/** Kopfstreifen je Gewerk — darunter liegen die Abschnitte. */
const HEAD_HEIGHT = 20;
/** Kleiner als das liest niemand mehr eine Beschriftung. */
const LABEL_MIN_WIDTH = 54;
const LABEL_MIN_HEIGHT = 26;

export interface TreemapProps {
  groups: readonly TreemapGroup[];
  measure: Measure;
  colors: ColorScale;
  /** Gerade gefilterte Gewerke — sie stehen hervorgehoben. */
  activeGewerke: ReadonlySet<string>;
  onPickGewerk: (gewerk: string) => void;
  /** `gewerk` ist `null`, wenn die Gruppe kein echtes Gewerk ist. */
  onPickSection: (gewerk: string | null, sectionId: string) => void;
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
  colors,
  activeGewerke,
  onPickGewerk,
  onPickSection,
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
      // Kachel-Koordinaten relativ zur Gewerk-Fläche: die Abschnitte liegen im
      // `div` des Gewerks, nicht im äußeren Rahmen.
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
        const color = group.filterable ? colors.of(group.key) : 'var(--cat-none)';
        const active = activeGewerke.has(group.key);
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
              disabled={!group.filterable}
              onClick={() => onPickGewerk(group.key)}
              title={`${describe(group.label, group.value, group.count, measure)}${
                group.filterable ? ' — klicken filtert' : ''
              }`}
              className="block w-full cursor-pointer truncate border-none bg-transparent px-[5px] text-left font-mono text-[9.5px] leading-[20px] text-ink disabled:cursor-default"
              style={{ height: HEAD_HEIGHT }}
            >
              {rect.width > LABEL_MIN_WIDTH ? group.label : '…'}
            </button>
            {cells.map(({ item, rect: cell }) => (
              <button
                key={item.key}
                type="button"
                disabled={item.collected}
                onClick={() => onPickSection(group.filterable ? group.key : null, item.key)}
                title={`${describe(item.label, item.value, item.count, measure)}${
                  group.filterable ? ' — klicken filtert' : ' — klicken wählt den Abschnitt an'
                }`}
                className="absolute cursor-pointer overflow-hidden border border-solid border-white bg-white/35 p-[3px] text-left align-top font-mono text-[9px] leading-[1.25] text-ink disabled:cursor-default"
                style={{ left: cell.x, top: cell.y, width: cell.width, height: cell.height }}
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
