// Positionstabelle. Portiert aus `PositionsTable` in design/claude-design/lv-main.jsx;
// das Raster ist der Design-System-Baustein `DataTable`, die Bearbeiter-Spalte
// entfällt (out of scope).
//
// Die Tabelle zeigt entweder den gewählten Abschnitt oder das ganze LV. Bei
// aktivem Filter fällt sie automatisch auf das ganze LV zurück, sobald der
// gewählte Abschnitt keinen Treffer hat — sonst stünde man vor einer leeren
// Tabelle, während der Baum daneben Treffer anzeigt (Issue #12).

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '../ui/DataTable';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatusPill } from '../ui/StatusPill';
import { attrString, attrStrings } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { isFiltering, matchPos } from '../../lib/matchPos';
import { POSITION_STATUS } from '../../lib/status';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';

type SortKey =
  'oz' | 'shortText' | 'positionsart' | 'bauteiltyp' | 'beton' | 'unit' | 'quantity' | 'unitPrice';

type Scope = 'node' | 'lv';

interface Row {
  node: LVNode;
  position: PositionSummary;
  /** Überschrift, unter der die Zeile in der Tabelle steht. */
  groupKey: string;
  groupLabel: string;
}

const KIND_PREFIX: Record<string, string> = { lot: 'LOS', section: '§' };

/** Drei verbundene Knoten — dasselbe Motiv wie in der Wortmarke. */
function GraphGlyph() {
  return (
    <svg width="17" height="12" viewBox="0 0 26 18" aria-hidden="true" className="block">
      <line x1="5" y1="9" x2="14" y2="6" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <line x1="14" y1="6" x2="21" y2="12" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <circle cx="14" cy="6" r="2.4" fill="currentColor" />
      <circle cx="5" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="21" cy="12" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function headingOf(node: LVNode): string {
  const title = node.label !== null && node.label !== '' ? node.label : 'Ohne Bezeichnung';
  if (node.code === '') return title;
  const prefix = KIND_PREFIX[node.kind];
  return `${prefix === undefined ? node.code : `${prefix} ${node.code}`} · ${title}`;
}

/**
 * Alle Positionen unterhalb von `scopeRoot`, jeweils mit dem Überschriftenpfad
 * bis zu ihrem direkten Abschnitt. Der Scope-Knoten selbst steht nicht im Pfad —
 * er ist bereits die Überschrift des Tabellenkopfs.
 */
function collectRows(scopeRoot: LVNode): Row[] {
  const out: Row[] = [];
  const walk = (node: LVNode, trail: readonly LVNode[]): void => {
    if (node.kind === 'position') {
      if (node.position === null) return;
      const parent = trail[trail.length - 1] ?? scopeRoot;
      out.push({
        node,
        position: node.position,
        groupKey: parent.id,
        groupLabel:
          trail.length === 0
            ? headingOf(scopeRoot)
            : trail.map((step) => headingOf(step)).join('  ›  '),
      });
      return;
    }
    const next = node === scopeRoot ? trail : [...trail, node];
    for (const child of node.children) walk(child, next);
  };
  walk(scopeRoot, []);
  return out;
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

function compare(a: Row, b: Row, key: SortKey, dir: 1 | -1): number {
  const va = sortValue(a.position, key);
  const vb = sortValue(b.position, key);
  if (va === null) return 1;
  if (vb === null) return -1;
  if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
  return String(va).localeCompare(String(vb), 'de') * dir;
}

export function PositionsTable({ root }: { root: LVNode }) {
  const { tree, filters, search, selectedPositionId, parents } = useViewer();
  const dispatch = useViewerDispatch();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'oz', dir: 1 });
  const [scope, setScope] = useState<Scope>('node');

  const filtering = isFiltering(filters, search);
  const lvRoot = tree ?? root;

  const nodeAll = useMemo(() => collectRows(root), [root]);
  const lvAll = useMemo(
    () => (lvRoot === root ? nodeAll : collectRows(lvRoot)),
    [lvRoot, root, nodeAll],
  );

  const nodeHits = useMemo(
    () => (filtering ? nodeAll.filter((row) => matchPos(row.position, filters, search)) : nodeAll),
    [nodeAll, filters, search, filtering],
  );
  const lvHits = useMemo(
    () =>
      lvAll === nodeAll
        ? nodeHits
        : filtering
          ? lvAll.filter((row) => matchPos(row.position, filters, search))
          : lvAll,
    [lvAll, nodeAll, nodeHits, filters, search, filtering],
  );

  // Automatischer Rückfall: gefiltert, im Abschnitt kein Treffer, im LV schon.
  const fellBack = scope === 'node' && filtering && nodeHits.length === 0 && lvHits.length > 0;
  const effectiveScope: Scope = scope === 'lv' || fellBack ? 'lv' : 'node';
  const scopeRoot = effectiveScope === 'lv' ? lvRoot : root;
  const allRows = effectiveScope === 'lv' ? lvAll : nodeAll;
  const hits = effectiveScope === 'lv' ? lvHits : nodeHits;

  const rows = useMemo<Row[]>(() => {
    // Gruppen bleiben in Dokumentreihenfolge; sortiert wird innerhalb der Gruppe.
    const order = new Map<string, number>();
    for (const row of hits) if (!order.has(row.groupKey)) order.set(row.groupKey, order.size);
    return [...hits].sort((a, b) => {
      const ga = order.get(a.groupKey) ?? 0;
      const gb = order.get(b.groupKey) ?? 0;
      return ga === gb ? compare(a, b, sort.key, sort.dir) : ga - gb;
    });
  }, [hits, sort]);

  const groupCount = new Set(rows.map((row) => row.groupKey)).size;

  // Bewusst keine Mengensumme: die Positionen eines Abschnitts haben gemischte
  // Einheiten (m³, m², Stck), eine Summe darüber wäre eine Scheingenauigkeit.
  const sumPrice = rows.reduce((total, row) => total + row.node.totalPrice, 0);
  const parent = parents.get(root.id) ?? null;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <div
        className="flex min-w-0 shrink-0 items-center gap-[10px] overflow-hidden border-b border-line bg-panel px-[12px] font-mono text-[10px] text-dim"
        style={{ height: 'var(--h-view-head)' }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: 'showGraph' })}
          title="Zurück zum Bubble-Graph"
          className="flex shrink-0 items-center gap-[6px] border border-line bg-white px-[8px] py-[4px] text-blue hover:bg-panel"
        >
          <GraphGlyph />
          <span className="font-mono text-[9.5px]">Graph</span>
        </button>
        <span
          onClick={() =>
            parent === null
              ? dispatch({ type: 'showGraph' })
              : dispatch({ type: 'selectNode', id: parent.id, open: true })
          }
          title={parent === null ? 'Zurück zum Graphen' : 'Eine Ebene höher'}
          className="shrink-0 cursor-pointer px-[4px] font-mono text-[13px] leading-none text-blue"
          role="button"
        >
          ←
        </span>
        {scopeRoot.code !== '' && (
          <span className="shrink-0 tracking-[0.6px] text-mute">§ {scopeRoot.code}</span>
        )}
        <span className="min-w-0 truncate font-sans text-[12px] font-semibold text-ink">
          {effectiveScope === 'lv' && scopeRoot === lvRoot
            ? 'Ganzes LV'
            : (scopeRoot.label ?? 'Ohne Bezeichnung')}
        </span>
        <span className="shrink-0 text-line2">·</span>
        <span className="shrink-0">
          <span className="font-medium text-ink">{formatCount(rows.length)}</span>/
          {formatCount(allRows.length)} Pos.
        </span>
        <span className="shrink-0 text-line2">·</span>
        <span className="shrink-0">∑ GP {formatEuro(sumPrice, 0)}</span>
        {fellBack && (
          <span
            className="shrink-0 text-blue"
            title="Im gewählten Abschnitt passt keine Position — gezeigt werden die Treffer des ganzen LV."
          >
            · LV-weite Treffer
          </span>
        )}
        {lvRoot !== root && (
          <span className="ml-auto shrink-0">
            <SegmentedControl
              options={[
                { value: 'node', label: 'Abschnitt', title: 'Nur der gewählte Abschnitt' },
                { value: 'lv', label: 'Ganzes LV', title: 'Alle Positionen des LV' },
              ]}
              value={effectiveScope}
              onChange={(value) => setScope(value as Scope)}
            />
          </span>
        )}
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
        group={groupCount > 1 ? (row) => ({ key: row.groupKey, label: row.groupLabel }) : undefined}
        cellTitle={(row, column) =>
          column.key === 'shortText' ? row.position.shortText : undefined
        }
      />
    </div>
  );
}
