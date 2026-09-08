// Bubble — DataTable: flex-basierte Zebra-Tabelle mit sortierbarem Mono-Kopf.
// Portiert aus .claude/skills/bubble-design/components/core/DataTable.jsx.
//
// Ergänzungen gegenüber der Skill-Vorlage:
//  - `sortable` je Spalte: Status und Exposition lassen sich nicht sinnvoll sortieren.
//  - ARIA-Rollen (table/row/columnheader/cell): das Markup ist aus Flex-Divs gebaut,
//    ohne die Rollen ist es für Screenreader und Tests keine Tabelle.
//  - `group`: eine Kopfzeile beim Gruppenwechsel — die Positionstabelle zeigt
//    Filtertreffer nach Überschriften gruppiert (Issue #12).
//  - Fenster-Virtualisierung: bei 10k Positionen dauerte „Ganzes LV" 10,6 s und
//    Sortieren 10 s, weil jede Zeile neun DOM-Zellen bekam (Issue #22). Gezeichnet
//    wird nur der sichtbare Ausschnitt — Prinzip wie `Tree.tsx` (Issue #23), hier
//    aber mit zwei Zeilenhöhen (Daten- und Gruppenkopfzeile), deshalb kumulierte
//    Offsets statt fester Schrittweite. Beide Höhen werden per unsichtbarer
//    Messzeile ermittelt statt geraten, damit sie nicht von den CSS-Tokens
//    abweichen können.

import {
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

export interface Column<T> {
  key: string;
  label: string;
  /** Prozentwert, z. B. '28%' — Spalten sind flex-basis, nie auto. */
  width: string;
  align?: 'left' | 'right';
  /** Tinten-Farbe, Gewicht 500 — genau eine Spalte je Tabelle. */
  primary?: boolean;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  selectedKey?: string | null;
  onPick?: (key: string) => void;
  empty?: string;
  sort?: { key: string; dir: 1 | -1 };
  onSort?: (key: string) => void;
  /** aria-label der Tabelle. */
  label?: string;
  /** Titel-Attribut je Zelle, z. B. für abgeschnittene Bezeichnungen. */
  cellTitle?: (row: T, column: Column<T>) => string | undefined;
  /**
   * Gruppenzuordnung einer Zeile. Wechselt der Schlüssel gegenüber der
   * vorigen Zeile, steht darüber eine Kopfzeile. Die Zeilen müssen dafür
   * bereits nach Gruppen sortiert ankommen.
   */
  group?: (row: T) => GroupHead;
}

type GroupHead = { key: string; label: ReactNode } | null;

/**
 * Zu jeder Zeile der Gruppenkopf, der über ihr stehen muss — also nur bei der
 * ersten Zeile einer Gruppe. Bewusst außerhalb der Komponente, damit im Render
 * nichts fortgeschrieben wird.
 */
function groupHeads<T>(
  rows: readonly T[],
  group: ((row: T) => GroupHead) | undefined,
): readonly GroupHead[] {
  if (group === undefined) return rows.map(() => null);
  let open: string | null = null;
  return rows.map((row) => {
    const head = group(row);
    if (head === null || head.key === open) return null;
    open = head.key;
    return head;
  });
}

/** Zeilen über/unter dem Fenster, damit beim Scrollen nichts aufblitzt. */
const OVERSCAN_PX = 240;

/** Höhe, mit der ohne messbare Zeile gerechnet wird (Fallback vor der Messung). */
const UNMEASURED = 0;

function GroupHeadRow({ head, style }: { head: ReactNode; style?: CSSProperties }) {
  return (
    <div
      role="row"
      style={{
        display: 'flex',
        padding: '7px 12px',
        background: 'var(--paper)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--grid)',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-label)',
        letterSpacing: 'var(--ls-label)',
        color: 'var(--dim)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div role="cell" style={{ flex: 1, minWidth: 0 }}>
        {head}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectedKey = null,
  onPick,
  empty = 'Keine Einträge.',
  sort,
  onSort,
  label,
  cellTitle,
  group,
}: DataTableProps<T>) {
  const heads = useMemo(() => groupHeads(rows, group), [rows, group]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const rowProbeRef = useRef<HTMLDivElement>(null);
  const headProbeRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(UNMEASURED);
  const [rowHeight, setRowHeight] = useState(UNMEASURED);
  const [headHeight, setHeadHeight] = useState(UNMEASURED);

  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (element === null) return;
    const measure = (): void => setViewport(element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Zeilenhöhe per unsichtbarer Messzeile statt Annahme — bleibt korrekt, auch
  // wenn --pad-row/--fs-row sich ändern.
  useLayoutEffect(() => {
    const rowProbeHeight = rowProbeRef.current?.getBoundingClientRect().height ?? UNMEASURED;
    if (rowProbeHeight > 0) setRowHeight(rowProbeHeight);
    const headProbeHeight = headProbeRef.current?.getBoundingClientRect().height ?? UNMEASURED;
    if (headProbeHeight > 0) setHeadHeight(headProbeHeight);
  });

  // Kumulierte Offsets: rowTop[i] ist die Position, an der Zeile i (inkl.
  // ihres eigenen Gruppenkopfs, falls vorhanden) beginnt.
  const rowTop = useMemo(() => {
    const offsets = new Array<number>(rows.length + 1);
    offsets[0] = 0;
    for (let i = 0; i < rows.length; i++) {
      const extra = heads[i] !== null ? headHeight : 0;
      offsets[i + 1] = offsets[i] + extra + rowHeight;
    }
    return offsets;
  }, [rows.length, heads, rowHeight]);

  const totalHeight = rowTop[rows.length] ?? 0;
  const measured = viewport > UNMEASURED && rowHeight > UNMEASURED;

  // Ohne gemessenes Layout (jsdom in Tests, erster Frame) wird alles gezeichnet
  // — wie in Tree.tsx (Issue #23).
  let first = 0;
  let last = rows.length;
  if (measured) {
    const from = Math.max(0, scrollTop - OVERSCAN_PX);
    const to = scrollTop + viewport + OVERSCAN_PX;
    // rowTop ist monoton steigend — binäre Suche statt linearem Scan über bis
    // zu 10k Einträge je Scroll-Event.
    first = Math.max(0, lowerBound(rowTop, from) - 1);
    last = Math.min(rows.length, lowerBound(rowTop, to));
  }

  // Aktuell sichtbare Gruppe — Ersatz für einen echten "sticky"-Effekt, der
  // mit absolut positionierten, virtualisierten Zeilen nicht mehr greift.
  const pinnedHead = useMemo(() => {
    // Ohne gemessenes Layout (jsdom, erster Frame) sind alle Offsets 0 — dann
    // stünde hier fälschlich die letzte statt gar keine Gruppe, und ihr Label
    // erschiene doppelt (Balken + vollständig ungewindowte Zeilen).
    if (group === undefined || !measured) return null;
    let current: ReactNode = null;
    for (let i = 0; i < rows.length; i++) {
      if (rowTop[i + 1] > scrollTop) break;
      if (heads[i] !== null) current = heads[i]!.label;
    }
    return current;
  }, [group, measured, rows.length, rowTop, scrollTop, heads]);

  return (
    <div
      role="table"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'var(--white)',
      }}
    >
      <div
        role="row"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--line2)',
          background: 'var(--white)',
          fontFamily: 'var(--mono)',
          fontSize: 'var(--fs-label)',
          letterSpacing: 'var(--ls-label)',
          color: 'var(--mute)',
          textTransform: 'uppercase',
        }}
      >
        {columns.map((column) => {
          const sortable = onSort !== undefined && column.sortable !== false;
          const active = sort !== undefined && sort.key === column.key;
          return (
            <div
              key={column.key}
              role="columnheader"
              aria-sort={active ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}
              style={{
                flex: `0 0 ${column.width}`,
                borderRight: '1px solid var(--line)',
                textAlign: column.align ?? 'left',
                userSelect: 'none',
                color: active ? 'var(--blue)' : 'var(--mute)',
              }}
            >
              {/*
                Sortierbare Köpfe sind Schaltflächen — sonst ist die Sortierung
                nur mit der Maus erreichbar. Nicht sortierbare bleiben Text.
              */}
              {sortable ? (
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    font: 'inherit',
                    letterSpacing: 'inherit',
                    textTransform: 'inherit',
                    textAlign: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {column.label} {active ? (sort.dir > 0 ? '↑' : '↓') : ''}
                </button>
              ) : (
                <span style={{ display: 'block', padding: '10px 12px' }}>{column.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/*
        Ersatz für "position: sticky" auf der Gruppenkopfzeile: die steckt jetzt
        unter den virtualisierten, absolut positionierten Zeilen und würde nicht
        mehr kleben. Dieser Balken sitzt oberhalb des Scroll-Containers und zeigt
        die Gruppe, in der man sich gerade befindet.
      */}
      {pinnedHead !== null && <GroupHeadRow head={pinnedHead} />}

      <div
        ref={bodyRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        style={{ flex: 1, overflow: 'auto', position: 'relative' }}
      >
        {/* Unsichtbare Messzeilen: liefern die reale Höhe einer Daten- bzw.
            Gruppenkopfzeile, ohne den Elternflow zu beeinflussen. */}
        <div
          ref={rowProbeRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            display: 'flex',
          }}
        >
          <div
            style={{
              padding: 'var(--pad-row)',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--fs-row)',
            }}
          >
            X
          </div>
        </div>
        {group !== undefined && (
          <div
            ref={headProbeRef}
            aria-hidden="true"
            style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
          >
            <GroupHeadRow head="X" />
          </div>
        )}

        {rows.length === 0 && (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--mute)',
              fontSize: 'var(--fs-row)',
            }}
          >
            {empty}
          </div>
        )}

        <div style={{ height: measured ? totalHeight : undefined, position: 'relative' }}>
          {rows.slice(first, last).map((row, offset) => {
            const index = first + offset;
            const key = rowKey(row);
            const selected = selectedKey === key;
            const head = heads[index];
            const top = measured ? rowTop[index] + (head !== null ? headHeight : 0) : undefined;
            const rowMarkup = (
              <div
                key={key}
                role="row"
                aria-selected={selected}
                onClick={() => onPick?.(key)}
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--grid)',
                  cursor: onPick === undefined ? 'default' : 'pointer',
                  background: selected
                    ? 'var(--blueS)'
                    : index % 2 === 1
                      ? 'var(--panel)'
                      : 'var(--white)',
                  fontFamily: 'var(--mono)',
                  fontSize: 'var(--fs-row)',
                  ...(measured
                    ? { position: 'absolute', top, left: 0, right: 0, boxSizing: 'border-box' }
                    : {}),
                }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    role="cell"
                    title={cellTitle?.(row, column)}
                    style={{
                      flex: `0 0 ${column.width}`,
                      padding: 'var(--pad-row)',
                      borderRight: '1px solid var(--grid)',
                      textAlign: column.align ?? 'left',
                      color: column.primary === true ? 'var(--ink)' : 'var(--dim)',
                      fontWeight: column.primary === true ? 500 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {column.render === undefined ? '—' : column.render(row)}
                  </div>
                ))}
              </div>
            );

            if (head === null || head === undefined) return rowMarkup;
            const headTop = measured ? rowTop[index] : undefined;
            return (
              <Fragment key={`group:${head.key}`}>
                <GroupHeadRow
                  head={head.label}
                  style={
                    measured
                      ? {
                          position: 'absolute',
                          top: headTop,
                          left: 0,
                          right: 0,
                          boxSizing: 'border-box',
                        }
                      : undefined
                  }
                />
                {rowMarkup}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Kleinster Index i, für den `offsets[i] >= value` gilt (offsets ist sortiert). */
function lowerBound(offsets: readonly number[], value: number): number {
  let lo = 0;
  let hi = offsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
