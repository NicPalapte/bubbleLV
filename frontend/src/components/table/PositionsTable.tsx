// Positionstabelle. Portiert aus `PositionsTable` in design/claude-design/lv-main.jsx;
// das Raster ist der Design-System-Baustein `DataTable`, die Bearbeiter-Spalte
// entfällt (out of scope).
//
// Die Tabelle zeigt entweder den gewählten Abschnitt oder das ganze LV. Bei
// aktivem Filter fällt sie automatisch auf das ganze LV zurück, sobald der
// gewählte Abschnitt keinen Treffer hat — sonst stünde man vor einer leeren
// Tabelle, während der Baum daneben Treffer anzeigt (Issue #12).
//
// Spalten lassen sich ein-/ausblenden, verschieben und in der Breite ziehen
// (Issue #41). Die Konfiguration ist reiner UI-Zustand dieser Komponente und
// überlebt keinen Reload — gewollt, kein localStorage.

import { useMemo, useRef, useState } from 'react';
import { useDismiss } from '../common/useDismiss';
import { Chip } from '../ui/Chip';
import { DataTable, type Column } from '../ui/DataTable';
import { Popover, PopoverHead } from '../ui/Popover';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatusPill } from '../ui/StatusPill';
import { attrString, attrStrings } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { isFiltering, matchPos } from '../../lib/matchPos';
import { POSITION_STATUS } from '../../lib/status';
import {
  defaultColumnConfig,
  moveColumn,
  resizeColumn,
  toggleColumn,
  visibleColumnKeys,
  type ColumnConfig,
} from '../../lib/table/columns';
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

/**
 * Alle Spalten mit Pixelbreite. Die Anzeigereihenfolge steht in
 * `DEFAULT_ORDER`: Kennung und Mengengerüst zuerst, dann die Klassifizierung.
 */
const COLUMNS: ReadonlyArray<Column<Row>> = [
  { key: 'oz', label: 'OZ', width: 110, render: (r) => r.position.oz },
  {
    key: 'shortText',
    label: 'Bezeichnung',
    width: 260,
    primary: true,
    render: (r) => r.position.shortText,
  },
  { key: 'unit', label: 'Einheit', width: 70, render: (r) => r.position.unit ?? '—' },
  {
    key: 'quantity',
    label: 'Menge',
    width: 90,
    align: 'right',
    render: (r) => formatNumber(r.position.quantity),
  },
  {
    key: 'unitPrice',
    label: 'EP €',
    width: 90,
    align: 'right',
    render: (r) => formatEuro(r.position.unitPrice),
  },
  {
    key: 'positionsart',
    label: 'Positionsart',
    width: 120,
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
    width: 110,
    render: (r) => attrString(r.position.attributes, 'bauteiltyp') ?? '—',
  },
  {
    key: 'beton',
    label: 'Druckfestigkeit',
    width: 130,
    render: (r) => {
      const beton = attrString(r.position.attributes, 'beton');
      const expo = attrStrings(r.position.attributes, 'expo');
      if (beton === null) return expo.join(', ') || '—';
      return expo.length === 0 ? beton : `${beton} · ${expo.join(', ')}`;
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: 90,
    sortable: false,
    render: () => <StatusPill status={POSITION_STATUS} />,
  },
];

const COLUMNS_BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]));
const DEFAULT_ORDER: readonly string[] = COLUMNS.map((column) => column.key);
const DEFAULT_WIDTHS: Readonly<Record<string, number>> = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.width]),
);
/** Ohne OZ und Bezeichnung wäre eine Zeile nicht mehr zuzuordnen. */
const LOCKED_COLUMNS: ReadonlySet<string> = new Set(['oz', 'shortText']);

function initialColumnConfig(): ColumnConfig {
  return defaultColumnConfig(DEFAULT_ORDER, DEFAULT_WIDTHS);
}

const ICON_BUTTON =
  'inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center border border-line bg-white p-0 font-mono text-[9px] leading-none text-dim disabled:cursor-default disabled:opacity-30';

/** Popover „Spalten": ein-/ausblenden per Kästchen, verschieben per Pfeil. */
function ColumnPicker({
  config,
  onChange,
}: {
  config: ColumnConfig;
  onChange: (next: ColumnConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss([anchorRef, popoverRef], open, () => setOpen(false));

  const hiddenCount = config.hidden.size;
  // Auch eine geänderte Breite zählt — sonst gäbe es nach dem Ziehen keinen
  // Weg zurück (Review zu PR #43).
  const isDefault =
    hiddenCount === 0 &&
    config.order.every((key, index) => key === DEFAULT_ORDER[index]) &&
    config.order.every((key) => config.widths[key] === DEFAULT_WIDTHS[key]);

  return (
    <div ref={anchorRef}>
      <Chip
        on={open || hiddenCount > 0}
        count={hiddenCount}
        onClick={() => setOpen((o) => !o)}
        title="Spalten ein-/ausblenden und anordnen"
      >
        Spalten <span className="-ml-[2px] text-mute">▾</span>
      </Chip>
      <Popover ref={popoverRef} open={open} width={230} align="right" anchorRef={anchorRef}>
        <PopoverHead onReset={isDefault ? undefined : () => onChange(initialColumnConfig())}>
          Spalten
        </PopoverHead>
        <div role="list" aria-label="Spalten" style={{ padding: '4px 0' }}>
          {config.order.map((key, index) => {
            const column = COLUMNS_BY_KEY.get(key);
            if (column === undefined) return null;
            const shown = !config.hidden.has(key);
            const locked = LOCKED_COLUMNS.has(key);
            return (
              <div
                key={key}
                role="listitem"
                className="flex items-center gap-[8px]"
                style={{ padding: 'var(--pad-popover-row)' }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={shown}
                  aria-label={column.label}
                  disabled={locked}
                  title={locked ? 'Immer sichtbar' : shown ? 'Ausblenden' : 'Einblenden'}
                  onClick={() => onChange(toggleColumn(config, key, LOCKED_COLUMNS))}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-left font-mono text-[10px] text-ink disabled:cursor-default"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      flexShrink: 0,
                      border: `1px solid ${shown ? 'var(--blue)' : 'var(--line2)'}`,
                      background: shown ? 'var(--blue)' : 'var(--white)',
                      color: '#fff',
                      fontSize: 9,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    {shown ? '✓' : ''}
                  </span>
                  <span className="truncate">{column.label}</span>
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  aria-label={`${column.label} nach oben`}
                  title="Nach vorn"
                  disabled={index === 0}
                  onClick={() => onChange(moveColumn(config, key, -1))}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  aria-label={`${column.label} nach unten`}
                  title="Nach hinten"
                  disabled={index === config.order.length - 1}
                  onClick={() => onChange(moveColumn(config, key, 1))}
                >
                  ▼
                </button>
              </div>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

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
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(initialColumnConfig);

  const columns = useMemo<Column<Row>[]>(
    () =>
      visibleColumnKeys(columnConfig).flatMap((key) => {
        const column = COLUMNS_BY_KEY.get(key);
        return column === undefined ? [] : [{ ...column, width: columnConfig.widths[key] }];
      }),
    [columnConfig],
  );

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
          onClick={() =>
            parent === null
              ? dispatch({ type: 'showGraph' })
              : dispatch({ type: 'selectNode', id: parent.id })
          }
          title={parent === null ? 'Zurück zum Graphen' : 'Eine Ebene höher'}
          aria-label={parent === null ? 'Zurück zum Graphen' : 'Eine Ebene höher'}
          className="shrink-0 cursor-pointer border-none bg-transparent px-[4px] font-mono text-[13px] leading-none text-blue"
        >
          ←
        </button>
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
        <span className="ml-auto flex shrink-0 items-center gap-[8px]">
          {lvRoot !== root && (
            <SegmentedControl
              label="Umfang der Tabelle"
              options={[
                { value: 'node', label: 'Abschnitt', title: 'Nur der gewählte Abschnitt' },
                { value: 'lv', label: 'Ganzes LV', title: 'Alle Positionen des LV' },
              ]}
              value={effectiveScope}
              onChange={(value) => setScope(value as Scope)}
            />
          )}
          <ColumnPicker config={columnConfig} onChange={setColumnConfig} />
        </span>
      </div>

      <DataTable
        label="Positionen"
        columns={columns}
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
        onResize={(key, width) => setColumnConfig((current) => resizeColumn(current, key, width))}
      />
    </div>
  );
}
