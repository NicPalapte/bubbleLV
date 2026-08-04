// Positionstabelle des angewählten Knotens. Portiert aus `PositionsTable` in
// design/claude-design/lv-main.jsx; das Raster ist der Design-System-Baustein
// `DataTable`, die Bearbeiter-Spalte entfällt (out of scope).

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '../ui/DataTable';
import { StatusPill } from '../ui/StatusPill';
import { attrString, attrStrings } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { isFiltering, matchPos } from '../../lib/matchPos';
import { POSITION_STATUS } from '../../lib/status';
import { collectPositions } from '../../lib/tree/buildTree';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';

type SortKey =
  | 'oz'
  | 'shortText'
  | 'positionsart'
  | 'bauteiltyp'
  | 'beton'
  | 'unit'
  | 'quantity'
  | 'unitPrice';

interface Row {
  node: LVNode;
  position: PositionSummary;
}

const COLUMNS: ReadonlyArray<Column<Row>> = [
  { key: 'oz', label: 'OZ', width: '14%', render: (r) => r.position.oz },
  {
    key: 'shortText',
    label: 'Bezeichnung',
    width: '24%',
    primary: true,
    render: (r) => r.position.shortText,
  },
  {
    key: 'positionsart',
    label: 'Positionsart',
    width: '11%',
    render: (r) => {
      const value = attrString(r.position.attributes, 'positionsart');
      const facet = FACETS_BY_ID.get('positionsart');
      if (value === null || facet === undefined) return '—';
      return facetOptionLabel(facet, value);
    },
  },
  {
    key: 'bauteiltyp',
    label: 'Bauteiltyp',
    width: '10%',
    render: (r) => attrString(r.position.attributes, 'bauteiltyp') ?? '—',
  },
  {
    key: 'beton',
    label: 'Druckfestigkeit',
    width: '10%',
    render: (r) => {
      const beton = attrString(r.position.attributes, 'beton');
      const expo = attrStrings(r.position.attributes, 'expo');
      if (beton === null) return expo.join(', ') || '—';
      return expo.length === 0 ? beton : `${beton} · ${expo.join(', ')}`;
    },
  },
  { key: 'unit', label: 'Einheit', width: '6%', render: (r) => r.position.unit ?? '—' },
  {
    key: 'quantity',
    label: 'Menge',
    width: '8%',
    align: 'right',
    render: (r) => formatNumber(r.position.quantity),
  },
  {
    key: 'unitPrice',
    label: 'EP €',
    width: '8%',
    align: 'right',
    render: (r) => formatEuro(r.position.unitPrice),
  },
  {
    key: 'status',
    label: 'Status',
    width: '9%',
    sortable: false,
    render: () => <StatusPill status={POSITION_STATUS} />,
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
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
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

      <DataTable
        label="Positionen"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.node.id}
        selectedKey={selectedPositionId}
        onPick={(key) =>
          dispatch({
            type: 'selectPosition',
            nodeId: root.id,
            positionId: selectedPositionId === key ? null : key,
          })
        }
        empty="Keine Positionen entsprechen den Filtern."
        sort={sort}
        onSort={(key) =>
          setSort((current) => ({
            key: key as SortKey,
            dir: current.key === key ? ((current.dir * -1) as 1 | -1) : 1,
          }))
        }
        cellTitle={(row, column) =>
          column.key === 'shortText' ? row.position.shortText : undefined
        }
      />
    </div>
  );
}
