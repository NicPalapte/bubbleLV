// Positionstabelle des angewählten Knotens. Portiert aus `PositionsTable` in
// design/claude-design/lv-main.jsx; Bearbeiter-Spalte entfällt (out of scope).

import { useMemo, useState, type ReactNode } from 'react';
import { Status } from '../common/Status';
import { attrString, attrStrings } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { isFiltering, matchPos } from '../../lib/matchPos';
import { POSITION_STATUS } from '../../lib/status';
import { collectPositions } from '../../lib/tree/buildTree';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';

type SortKey =
  'oz' | 'shortText' | 'positionsart' | 'bauteiltyp' | 'beton' | 'unit' | 'quantity' | 'unitPrice';

interface Column {
  key: SortKey | 'status';
  label: string;
  width: string;
  align?: 'right';
  render: (position: PositionSummary) => ReactNode;
  sortable: boolean;
}

const COLUMNS: readonly Column[] = [
  { key: 'oz', label: 'OZ', width: '14%', sortable: true, render: (p) => p.oz },
  {
    key: 'shortText',
    label: 'Bezeichnung',
    width: '26%',
    sortable: true,
    render: (p) => p.shortText,
  },
  {
    key: 'positionsart',
    label: 'Positionsart',
    width: '11%',
    sortable: true,
    render: (p) => {
      const value = attrString(p.attributes, 'positionsart');
      const facet = FACETS_BY_ID.get('positionsart');
      if (value === null || facet === undefined) return '—';
      return facetOptionLabel(facet, value);
    },
  },
  {
    key: 'bauteiltyp',
    label: 'Bauteiltyp',
    width: '10%',
    sortable: true,
    render: (p) => attrString(p.attributes, 'bauteiltyp') ?? '—',
  },
  {
    key: 'beton',
    label: 'Druckfestigkeit',
    width: '10%',
    sortable: true,
    render: (p) => {
      const beton = attrString(p.attributes, 'beton');
      const expo = attrStrings(p.attributes, 'expo');
      if (beton === null) return expo.join(', ') || '—';
      return expo.length === 0 ? beton : `${beton} · ${expo.join(', ')}`;
    },
  },
  { key: 'unit', label: 'Einheit', width: '6%', sortable: true, render: (p) => p.unit ?? '—' },
  {
    key: 'quantity',
    label: 'Menge',
    width: '8%',
    align: 'right',
    sortable: true,
    render: (p) => formatNumber(p.quantity),
  },
  {
    key: 'unitPrice',
    label: 'EP €',
    width: '8%',
    align: 'right',
    sortable: true,
    render: (p) => formatEuro(p.unitPrice),
  },
  {
    key: 'status',
    label: 'Status',
    width: '7%',
    sortable: false,
    render: () => <Status value={POSITION_STATUS} />,
  },
];

function sortValue(position: PositionSummary, key: SortKey): string | number | null {
  switch (key) {
    case 'oz':
      return position.oz;
    case 'shortText':
      return position.shortText;
    case 'positionsart':
      return attrString(position.attributes, 'positionsart');
    case 'bauteiltyp':
      return attrString(position.attributes, 'bauteiltyp');
    case 'beton':
      return attrString(position.attributes, 'beton');
    case 'unit':
      return position.unit;
    case 'quantity':
      return position.quantity;
    case 'unitPrice':
      return position.unitPrice;
    default:
      return null;
  }
}

interface Row {
  node: LVNode;
  position: PositionSummary;
}

export function PositionsTable({ root }: { root: LVNode }) {
  const { filters, search, selectedPositionId, parents } = useViewer();
  const dispatch = useViewerDispatch();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'oz', dir: 1 });

  const filtering = isFiltering(filters, search);

  const allRows = useMemo<Row[]>(
    () =>
      collectPositions(root)
        .filter((node): node is LVNode & { position: PositionSummary } => node.position !== null)
        .map((node) => ({ node, position: node.position })),
    [root],
  );

  const rows = useMemo<Row[]>(() => {
    const visible = filtering
      ? allRows.filter((row) => matchPos(row.position, filters, search))
      : [...allRows];
    visible.sort((a, b) => {
      const va = sortValue(a.position, sort.key);
      const vb = sortValue(b.position, sort.key);
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir;
      return String(va).localeCompare(String(vb), 'de') * sort.dir;
    });
    return visible;
  }, [allRows, filters, search, filtering, sort]);

  // Bewusst keine Mengensumme: die Positionen eines Abschnitts haben gemischte
  // Einheiten (m³, m², Stck), eine Summe darüber wäre eine Scheingenauigkeit.
  const sumPrice = rows.reduce((total, row) => total + row.node.totalPrice, 0);
  const parent = parents.get(root.id) ?? null;

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-white"
      role="table"
      aria-label="Positionen"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-[12px] gap-y-[6px] border-b border-line bg-panel px-[16px] py-[10px] font-mono text-[10px] text-dim">
        <span
          onClick={() => dispatch({ type: 'selectNode', id: parent === null ? null : parent.id })}
          title="Zurück"
          className="cursor-pointer px-[4px] font-mono text-[13px] leading-none text-blue"
          role="button"
        >
          ←
        </span>
        {root.code !== '' && <span className="tracking-[0.6px] text-mute">§ {root.code}</span>}
        <span className="font-sans text-[12px] font-semibold text-ink">
          {root.label ?? 'Ohne Bezeichnung'}
        </span>
        <span className="text-line2">·</span>
        <span>
          <span className="font-medium text-ink">{formatCount(rows.length)}</span>/
          {formatCount(allRows.length)} Pos.
        </span>
        <span className="text-line2">·</span>
        <span>∑ GP {formatEuro(sumPrice, 0)}</span>
        <span className="ml-auto text-mute">
          sortiert nach {sort.key} {sort.dir > 0 ? '↑' : '↓'}
        </span>
      </div>

      <div
        className="flex min-w-0 overflow-hidden border-b border-line2 bg-white font-mono text-[9px] uppercase tracking-[0.6px] text-mute"
        role="row"
      >
        {COLUMNS.map((column) => (
          <div
            key={column.key}
            role="columnheader"
            aria-sort={
              sort.key === column.key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined
            }
            onClick={() => {
              if (!column.sortable) return;
              const key = column.key as SortKey;
              setSort((current) => ({
                key,
                dir: current.key === key ? ((current.dir * -1) as 1 | -1) : 1,
              }));
            }}
            className="select-none border-r border-line px-[12px] py-[10px]"
            style={{
              flex: `0 0 ${column.width}`,
              textAlign: column.align ?? 'left',
              cursor: column.sortable ? 'pointer' : 'default',
              color: sort.key === column.key ? 'var(--blue)' : 'var(--mute)',
            }}
          >
            {column.label} {sort.key === column.key ? (sort.dir > 0 ? '↑' : '↓') : ''}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {rows.length === 0 && (
          <div className="px-[16px] py-[40px] text-center text-[11px] text-mute">
            Keine Positionen entsprechen den Filtern.
          </div>
        )}
        {rows.map((row, rowIndex) => {
          const selected = selectedPositionId === row.node.id;
          return (
            <div
              key={row.node.id}
              onClick={() =>
                dispatch({
                  type: 'selectPosition',
                  nodeId: root.id,
                  positionId: selected ? null : row.node.id,
                })
              }
              className="flex cursor-pointer border-b border-grid font-mono text-[11px]"
              role="row"
              aria-selected={selected}
              style={{
                background: selected
                  ? 'var(--blueS)'
                  : rowIndex % 2 === 1
                    ? 'var(--panel)'
                    : 'var(--white)',
              }}
            >
              {COLUMNS.map((column) => (
                <div
                  key={column.key}
                  role="cell"
                  className="overflow-hidden text-ellipsis whitespace-nowrap border-r border-grid px-[12px] py-[9px]"
                  style={{
                    flex: `0 0 ${column.width}`,
                    textAlign: column.align ?? 'left',
                    color: column.key === 'shortText' ? 'var(--ink)' : 'var(--dim)',
                    fontWeight: column.key === 'shortText' ? 500 : 400,
                  }}
                  title={column.key === 'shortText' ? row.position.shortText : undefined}
                >
                  {column.render(row.position)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
