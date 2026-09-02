// Bubble — DataTable: flex-basierte Zebra-Tabelle mit sortierbarem Mono-Kopf.
// Portiert aus .claude/skills/bubble-design/components/core/DataTable.jsx.
//
// Zwei Ergänzungen gegenüber der Skill-Vorlage:
//  - `sortable` je Spalte: Status und Exposition lassen sich nicht sinnvoll sortieren.
//  - ARIA-Rollen (table/row/columnheader/cell): das Markup ist aus Flex-Divs gebaut,
//    ohne die Rollen ist es für Screenreader und Tests keine Tabelle.
//  - `group`: eine Kopfzeile beim Gruppenwechsel — die Positionstabelle zeigt
//    Filtertreffer nach Überschriften gruppiert (Issue #12).

import { Fragment, type ReactNode } from 'react';

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
  const heads = groupHeads(rows, group);
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
              onClick={() => {
                if (sortable) onSort(column.key);
              }}
              style={{
                flex: `0 0 ${column.width}`,
                padding: '10px 12px',
                borderRight: '1px solid var(--line)',
                textAlign: column.align ?? 'left',
                cursor: sortable ? 'pointer' : 'default',
                userSelect: 'none',
                color: active ? 'var(--blue)' : 'var(--mute)',
              }}
            >
              {column.label} {active ? (sort.dir > 0 ? '↑' : '↓') : ''}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
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
        {rows.map((row, index) => {
          const key = rowKey(row);
          const selected = selectedKey === key;
          const head = heads[index];
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
          return (
            <Fragment key={`group:${head.key}`}>
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
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <div role="cell" style={{ flex: 1, minWidth: 0 }}>
                  {head.label}
                </div>
              </div>
              {rowMarkup}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
