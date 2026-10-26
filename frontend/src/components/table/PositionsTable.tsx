// Positionstabelle. Portiert aus `PositionsTable` in design/claude-design/lv-main.jsx;
// das Raster ist der Design-System-Baustein `DataTable`, die Bearbeiter-Spalte
// entfällt (out of scope).
//
// Die Tabelle zeigt entweder den gewählten Abschnitt oder das ganze LV. Bei
// aktivem Filter fällt sie automatisch auf das ganze LV zurück, sobald der
// gewählte Abschnitt keinen Treffer hat — sonst stünde man vor einer leeren
// Tabelle, während der Baum daneben Treffer anzeigt (Issue #12).
//
// Alle Spalten lassen sich ein-/ausblenden, verschieben und in der Breite ziehen
// (Issue #41). Sortierung, Umfang, Spalten und Scrollposition liegen seit WP-L
// im Ansichts-Zustand (`view.table`) statt als lokaler `useState`: die
// Komponente wird beim Ansichtswechsel abgebaut, der Zustand soll ihn aber
// überleben. Persistenz über die Sitzung hinaus gibt es weiterhin nicht —
// kein localStorage.
//
// Arbeitsliste: Fortschritt, „Wichtig" und Kommentar lassen sich direkt in der Zeile
// setzen; Fortschritt und „Wichtig" per Griff über mehrere Zeilen ziehen (wie in
// Excel). Abschnitte stehen als eigene Kopfzeilen je Ebene und lassen sich zuklappen.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Highlighted } from '../common/Highlighted';
import {
  fillMarkerNow,
  PROGRESS_CHOICES,
  setImportantNow,
  setProgressNow,
} from '../common/markers';
import { usePositionMenu } from '../common/positionMenuContext';
import { useDismiss } from '../common/useDismiss';
import { Chip } from '@conocto/design';
import { DataTable, type Column, type GroupHead } from '../ui/DataTable';
import { Popover, PopoverHead } from '../ui/Popover';
import { SegmentedControl } from '@conocto/design';
import { attrString, attrStrings } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { createPositionFilter } from '../../lib/index/positionIndex';
import { flat, searchSnippet } from '../../lib/searchSnippet';
import { headingOf } from '../../lib/tree/heading';
import {
  defaultColumnConfig,
  moveColumn,
  resizeColumn,
  toggleColumn,
  visibleColumnKeys,
  type ColumnConfig,
} from '../../lib/table/columns';
import {
  formatAt,
  IMPORTANT_INFO,
  latestCommentsOf,
  type Annotations,
  type MarkerValue,
  type Progress,
} from '../../lib/annotations';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';
import type { PositionType } from '@core';

type SortKey = 'oz' | 'shortText' | 'positionsart' | 'beton' | 'unit' | 'quantity' | 'unitPrice';

type Scope = 'node' | 'lv';

interface Row {
  node: LVNode;
  position: PositionSummary;
  /** Direkter Abschnitt der Zeile — innerhalb davon wird sortiert. */
  groupKey: string;
  /** Abschnitte zwischen Tabellenkopf und Zeile, äußerster zuerst. */
  trail: readonly LVNode[];
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
      out.push({ node, position: node.position, groupKey: parent.id, trail });
      return;
    }
    const next = node === scopeRoot ? trail : [...trail, node];
    for (const child of node.children) walk(child, next);
  };
  walk(scopeRoot, []);
  return out;
}

/** Kürzel für Positionen, die nicht sicher beauftragt werden (Issue #102). */
const TYPE_MARKS: Partial<Record<PositionType, { label: string; title: string }>> = {
  ALTERNATIV: { label: 'Alt', title: 'Alternativposition' },
  BEDARF: { label: 'Bed', title: 'Bedarfsposition' },
};

function TypeMark({ type }: { type: PositionType }) {
  const mark = TYPE_MARKS[type];
  if (mark === undefined) return null;
  return (
    <>
      <span
        title={mark.title}
        aria-hidden="true"
        className="mr-[6px] inline-block rounded-[var(--r-sm)] border border-line px-[4px] font-mono text-[11px] uppercase text-ink"
      >
        {mark.label}
      </span>
      <span className="sr-only">{mark.title}: </span>
    </>
  );
}

/**
 * Bezeichnungs-Zelle, mit und ohne Suche dieselbe. Trifft die Suche nur den
 * Langtext, steht dahinter ein Ausschnitt um die Fundstelle — sonst wäre
 * unklar, warum die Zeile ein Treffer ist (Issue #100).
 */
function ShortTextCell({ position, query }: { position: PositionSummary; query: string }) {
  const { shortText, longText } = position;
  const snippet =
    query === '' || shortText.toLowerCase().includes(query) ? null : searchSnippet(longText, query);
  return (
    <>
      <TypeMark type={position.positionType} />
      <Highlighted text={shortText} query={query} />
      {snippet !== null && (
        <span className="ml-[8px] font-normal text-mute" title="Treffer im Langtext">
          <Highlighted text={snippet} query={flat(query)} />
        </span>
      )}
    </>
  );
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
    render: (r) => <ShortTextCell position={r.position} query="" />,
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
  // Eigene Notizen (Entscheidungen 0047, 0053, 0062): der Inhalt kommt aus dem
  // Viewer-Zustand, `render` wird deshalb in der Tabelle ersetzt (siehe `annotationRender`).
  { key: 'progress', label: 'Fortschritt', width: 130, sortable: false },
  { key: 'important', label: 'Wichtig', short: '!', width: 44, align: 'center', sortable: false },
  { key: 'note', label: 'Kommentar', width: 240, sortable: false },
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
];

/**
 * Spalten, in denen die Suche den Treffer markiert (Issue #100). Ohne Suche
 * gilt das `render` aus `COLUMNS`.
 */
function searchRender(key: string, query: string): Column<Row>['render'] | undefined {
  if (query === '') return undefined;
  if (key === 'oz') return (r) => <Highlighted text={r.position.oz} query={query} />;
  if (key === 'shortText') return (r) => <ShortTextCell position={r.position} query={query} />;
  return undefined;
}

type FillColumn = 'progress' | 'important';

/** Was die Zellen der Notiz-Spalten zum Zeichnen brauchen. */
interface NoteCells {
  annotations: Annotations;
  /** Zellen, die das laufende Ziehen gerade abdeckt. */
  filling: { column: FillColumn; ids: ReadonlySet<string> } | null;
  openMenu: (kind: 'progress' | 'comment', id: string, anchor: HTMLElement) => void;
  toggleImportant: (id: string) => void;
  startFill: (event: ReactPointerEvent<HTMLElement>, id: string, column: FillColumn) => void;
}

/** Klicks in den Notiz-Zellen wählen die Zeile nicht mit aus. */
const stop = (event: ReactMouseEvent): void => event.stopPropagation();

/** Griff unten rechts in der Zelle: ziehen übernimmt den Wert in andere Zeilen. */
function FillHandle({
  onPointerDown,
}: {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <span
      aria-hidden="true"
      className="fill-handle"
      title="Ziehen, um den Wert in andere Zeilen zu übernehmen"
      onPointerDown={onPointerDown}
      onClick={stop}
    />
  );
}

/** Blaue Fläche über einer Zelle, solange das Ziehen sie abdeckt. */
function FillMark() {
  return <span aria-hidden="true" className="fill-mark" />;
}

/** Fortschritt in der Zeile: helle Fläche statt der vollen Farbe der Karte. */
const PROGRESS_CELL: Readonly<Record<Progress, { label: string; bg: string; fg: string }>> = {
  bearbeitung: { label: 'In Bearbeitung', bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  fertig: { label: 'Erledigt', bg: 'var(--greenS)', fg: 'var(--greenD)' },
};

const CELL_BUTTON =
  '-my-[3px] inline-flex h-[20px] max-w-full cursor-pointer align-middle items-center justify-center rounded-[var(--r-pill)] border border-transparent bg-transparent px-[9px] text-center font-mono text-[11.5px] leading-none hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

/** Spalten aus den eigenen Markern und Kommentaren. */
function annotationRender(key: string, cells: NoteCells): Column<Row>['render'] {
  const { annotations, filling } = cells;
  const covered = (column: FillColumn, id: string): boolean =>
    filling !== null && filling.column === column && filling.ids.has(id);
  if (key === 'progress') {
    return (r) => {
      const id = r.node.id;
      const progress = annotations.progress.get(id);
      const look = progress === undefined ? null : PROGRESS_CELL[progress];
      return (
        <>
          {covered('progress', id) && <FillMark />}
          <button
            type="button"
            aria-label={`Fortschritt ${r.position.oz}`}
            aria-haspopup="menu"
            onClick={(event) => {
              stop(event);
              cells.openMenu('progress', id, event.currentTarget);
            }}
            className={`${CELL_BUTTON} ${look === null ? 'text-mute' : ''}`}
            style={look === null ? undefined : { background: look.bg, color: look.fg }}
          >
            {look === null ? 'Offen' : look.label}
          </button>
          <FillHandle onPointerDown={(event) => cells.startFill(event, id, 'progress')} />
        </>
      );
    };
  }
  if (key === 'important') {
    return (r) => {
      const id = r.node.id;
      const on = annotations.important.has(id);
      return (
        <>
          {covered('important', id) && <FillMark />}
          <button
            type="button"
            aria-label={`${IMPORTANT_INFO.label} ${r.position.oz}`}
            aria-pressed={on}
            title={on ? '„Wichtig" aufheben' : 'Als wichtig markieren'}
            onClick={(event) => {
              stop(event);
              cells.toggleImportant(id);
            }}
            className="-my-[3px] inline-flex h-[20px] w-[20px] cursor-pointer align-middle items-center justify-center rounded-[var(--r-sm)] border font-display text-[13px] font-bold leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            style={
              on
                ? {
                    background: IMPORTANT_INFO.fill,
                    borderColor: IMPORTANT_INFO.fill,
                    color: IMPORTANT_INFO.text,
                  }
                : { background: 'transparent', borderColor: 'var(--line)', color: 'var(--line2)' }
            }
          >
            {IMPORTANT_INFO.glyph}
          </button>
          <FillHandle onPointerDown={(event) => cells.startFill(event, id, 'important')} />
        </>
      );
    };
  }
  if (key === 'note') {
    return (r) => {
      const id = r.node.id;
      const comments = latestCommentsOf(annotations, id);
      const newest = comments[0];
      return (
        <button
          type="button"
          aria-label={`Kommentar ${r.position.oz}`}
          aria-haspopup="dialog"
          onClick={(event) => {
            stop(event);
            cells.openMenu('comment', id, event.currentTarget);
          }}
          className="flex w-full min-w-0 cursor-text items-center gap-[6px] border-none bg-transparent p-0 text-left font-mono text-[12px]"
        >
          {newest === undefined ? (
            <span className="note-add text-mute">+ Kommentar</span>
          ) : (
            <>
              <span className="min-w-0 truncate text-accent">{newest.text}</span>
              {comments.length > 1 && (
                <span className="shrink-0 rounded-[var(--r-pill)] border border-line2 px-[5px] text-[11px] text-dim">
                  +{comments.length - 1}
                </span>
              )}
            </>
          )}
        </button>
      );
    };
  }
  return undefined;
}

/** Kommentar schreiben und den Verlauf lesen, der neueste zuerst. */
function CommentEditor({
  id,
  oz,
  annotations,
  onClose,
}: {
  id: string;
  oz: string;
  annotations: Annotations;
  onClose: () => void;
}) {
  const dispatch = useViewerDispatch();
  const [draft, setDraft] = useState('');
  const comments = latestCommentsOf(annotations, id);
  const save = (): void => {
    if (draft.trim() !== '') {
      dispatch({ type: 'addComment', id, text: draft, at: Date.now() });
    }
    onClose();
  };
  return (
    <div
      role="dialog"
      aria-label={`Kommentare ${oz}`}
      className="flex w-[300px] max-w-full flex-col gap-[8px] p-[6px]"
    >
      <span className="font-mono text-[11px] text-dim">{oz}</span>
      <textarea
        // Das Fenster geht für genau diese Eingabe auf.
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save();
          } else if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
        placeholder="Neuer Kommentar (Enter speichert)"
        aria-label="Neuer Kommentar"
        rows={2}
        className="min-w-0 resize-y rounded-[var(--r-md)] border border-line bg-panel px-[8px] py-[6px] font-mono text-[13px] leading-[1.5] text-ink outline-none placeholder:text-mute focus:border-accent"
      />
      <div className="flex justify-end gap-[6px]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-[26px] cursor-pointer items-center justify-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] text-center font-mono text-[12px] text-ink"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={save}
          disabled={draft.trim() === ''}
          className="inline-flex h-[26px] cursor-pointer items-center justify-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[12px] text-center font-mono text-[12px] text-white disabled:cursor-default disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
      {comments.length > 0 && (
        <ol
          aria-label="Kommentare, der neueste zuerst"
          className="m-0 flex max-h-[220px] list-none flex-col gap-[6px] overflow-auto p-0"
        >
          {comments.map((comment, i) => (
            <li key={`${comment.at}-${i}`} className="border-t border-grid pt-[6px]">
              <span className="block font-mono text-[11px] text-mute">{formatAt(comment.at)}</span>
              <p className="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5] text-ink">
                {comment.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Auswahl des Fortschritts, wie in der Positionskarte. */
function ProgressChoices({
  current,
  onPick,
}: {
  current: Progress | null;
  onPick: (value: Progress | null) => void;
}) {
  return (
    <div role="menu" aria-label="Fortschritt" className="flex flex-col gap-[2px]">
      {PROGRESS_CHOICES.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          role="menuitemradio"
          aria-checked={value === current}
          onClick={() => onPick(value)}
          className="flex h-[30px] cursor-pointer items-center justify-between gap-[12px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] text-left font-mono text-[12px] text-ink hover:bg-sunken"
        >
          {label}
          {value === current && (
            <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}

/** Kopfzeile eines Abschnitts: Name, Anzahl Positionen, wie viele erledigt sind. */
function sectionInfo(count: number, done: number): GroupHead['info'] {
  const share = count === 0 ? 0 : Math.round((done / count) * 100);
  return (
    <span className="inline-flex items-center gap-[10px]">
      <span>{formatCount(count)} Pos.</span>
      <span
        aria-hidden="true"
        className="inline-block h-[5px] w-[48px] overflow-hidden rounded-full bg-line"
      >
        <span className="block h-full bg-greenD" style={{ width: `${share}%` }} />
      </span>
      <span>{formatCount(done)} erledigt</span>
    </span>
  );
}

const COLUMNS_BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]));
const DEFAULT_ORDER: readonly string[] = COLUMNS.map((column) => column.key);
const DEFAULT_WIDTHS: Readonly<Record<string, number>> = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.width]),
);

const DEFAULT_COLUMN_CONFIG: ColumnConfig = defaultColumnConfig(DEFAULT_ORDER, DEFAULT_WIDTHS);

const ICON_BUTTON =
  'inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center border border-line bg-white p-0 font-mono text-[11px] leading-none text-dim disabled:cursor-default disabled:opacity-30';

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
        <PopoverHead onReset={isDefault ? undefined : () => onChange(DEFAULT_COLUMN_CONFIG)}>
          Spalten
        </PopoverHead>
        <div role="list" aria-label="Spalten" style={{ padding: '4px 0' }}>
          {config.order.map((key, index) => {
            const column = COLUMNS_BY_KEY.get(key);
            if (column === undefined) return null;
            const shown = !config.hidden.has(key);
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
                  title={shown ? 'Ausblenden' : 'Einblenden'}
                  onClick={() => onChange(toggleColumn(config, key))}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-left font-mono text-[11px] text-ink disabled:cursor-default"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      flexShrink: 0,
                      border: `1px solid ${shown ? 'var(--accent-fill)' : 'var(--line2)'}`,
                      background: shown ? 'var(--accent-fill)' : 'var(--white)',
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
  const {
    tree,
    index,
    active,
    selection: { positionId: selectedPositionId },
    view: { table, scroll },
    parents,
    annotations,
    filter: { hideMode },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const openMenu = usePositionMenu();
  // Der Ansichts-Zustand führt den Sortierschlüssel als Zeichenkette: die
  // Spaltenschlüssel kennt nur diese Komponente. Unbekannte Schlüssel fallen
  // unten in `sortValue` auf „kein Wert" zurück, sortieren also stabil.
  const { sort, scope } = table;
  // `null` heißt „unverändert": die Vorgabe kennt nur diese Komponente, weil
  // nur sie die Spaltendefinitionen hat.
  const columnConfig = table.columns ?? DEFAULT_COLUMN_CONFIG;
  const setColumnConfig = (columns: ColumnConfig): void =>
    dispatch({ type: 'tableColumns', columns });

  const { collapsed } = table;

  // Offenes Menü in einer Notiz-Zelle: Fortschritt oder Kommentar. Der Anker ist der
  // Knopf in der Zelle; Popover richtet sich an ihm aus.
  const [menu, setMenu] = useState<{ kind: 'progress' | 'comment'; id: string } | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Popover und useDismiss erwarten ein Ref-Objekt; der Knopf kommt aus dem Klick.
  const menuAnchor = useMemo(() => ({ current: anchor }), [anchor]);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = (): void => setMenu(null);
  useDismiss([menuAnchor, menuRef], menu !== null, closeMenu);
  // Die Tabelle ist virtualisiert: scrollt der Anker weg, verliert das Menü seinen Platz.
  useEffect(() => {
    if (menu === null) return;
    const body = anchor?.closest('[data-table-body]');
    if (body === null || body === undefined) return;
    // Nur senkrecht: waagerecht bleibt die Zeile gezeichnet, der Anker also da.
    const top = body.scrollTop;
    const close = (): void => {
      if (body.scrollTop !== top) setMenu(null);
    };
    body.addEventListener('scroll', close);
    return () => body.removeEventListener('scroll', close);
  }, [menu, anchor]);

  const [fill, setFill] = useState<{ column: FillColumn; from: string; to: string } | null>(null);

  // Eine Prüffunktion je Filterwechsel statt einer Ableitung je Zeile: sie
  // schlägt den Treffer im flachen Positions-Index nach (WP-I, Schritt 3).
  // `active` kommt aus dem Provider — eine Aufbereitung für alle Ansichten.
  const matchesPosition = useMemo(() => createPositionFilter(index, active), [index, active]);
  const filtering = active.filtering;
  const lvRoot = tree ?? root;

  const nodeAll = useMemo(() => collectRows(root), [root]);
  const lvAll = useMemo(
    () => (lvRoot === root ? nodeAll : collectRows(lvRoot)),
    [lvRoot, root, nodeAll],
  );

  const nodeHits = useMemo(
    () => (filtering ? nodeAll.filter((row) => matchesPosition(row.node)) : nodeAll),
    [nodeAll, matchesPosition, filtering],
  );
  const lvHits = useMemo(
    () =>
      lvAll === nodeAll
        ? nodeHits
        : filtering
          ? lvAll.filter((row) => matchesPosition(row.node))
          : lvAll,
    [lvAll, nodeAll, nodeHits, matchesPosition, filtering],
  );

  // Automatischer Rückfall: gefiltert, im Abschnitt kein Treffer, im LV schon.
  const fellBack = scope === 'node' && filtering && nodeHits.length === 0 && lvHits.length > 0;
  const effectiveScope: Scope = scope === 'lv' || fellBack ? 'lv' : 'node';
  const scopeRoot = effectiveScope === 'lv' ? lvRoot : root;
  const allRows = effectiveScope === 'lv' ? lvAll : nodeAll;
  const hits = effectiveScope === 'lv' ? lvHits : nodeHits;
  // „dimmen" zeigt alle Zeilen, Nicht-Treffer blass — wie im Graphen (Entscheidung 0058).
  const dimming = filtering && hideMode === 'dim';
  const shown = dimming ? allRows : hits;
  const hitKeys = useMemo(
    () => (dimming ? new Set(hits.map((row) => row.node.id)) : null),
    [dimming, hits],
  );

  const rows = useMemo<Row[]>(() => {
    // Gruppen bleiben in Dokumentreihenfolge; sortiert wird innerhalb der Gruppe.
    const order = new Map<string, number>();
    for (const row of shown) if (!order.has(row.groupKey)) order.set(row.groupKey, order.size);
    const sorted = [...shown].sort((a, b) => {
      const ga = order.get(a.groupKey) ?? 0;
      const gb = order.get(b.groupKey) ?? 0;
      return ga === gb ? compare(a, b, sort.key as SortKey, sort.dir) : ga - gb;
    });
    // Ebenen, die alle Zeilen teilen (z. B. das LV selbst über der ersten Gliederung),
    // sagen nichts und kosten eine Zeile. Der direkte Abschnitt bleibt immer stehen.
    const first = sorted[0]?.trail ?? [];
    let common = first.length;
    for (const row of sorted) {
      common = Math.min(common, row.trail.length - 1);
      let same = 0;
      while (same < common && row.trail[same] === first[same]) same++;
      common = same;
    }
    return common <= 0 ? sorted : sorted.map((row) => ({ ...row, trail: row.trail.slice(common) }));
  }, [shown, sort]);

  // Zeilen, die gerade zu sehen sind — das Ziehen läuft über diese Reihenfolge.
  const visibleIds = useMemo(
    () =>
      rows
        .filter((row) => !row.trail.some((step) => collapsed.has(step.id)))
        .map((row) => row.node.id),
    [rows, collapsed],
  );

  // Zeilen von `from` bis `to` in Anzeigereihenfolge; `null`, wenn eine fehlt.
  const spanOf = useMemo(() => {
    const at = new Map(visibleIds.map((id, i) => [id, i]));
    return (from: string, to: string): string[] | null => {
      const a = at.get(from);
      const b = at.get(to);
      if (a === undefined || b === undefined) return null;
      return visibleIds.slice(Math.min(a, b), Math.max(a, b) + 1);
    };
  }, [visibleIds]);

  const fillIds = useMemo(() => {
    if (fill === null) return null;
    return spanOf(fill.from, fill.to) ?? [fill.from];
  }, [fill, spanOf]);

  /**
   * Ausfüllen per Ziehen (wie in Excel): Griff fassen, über die Zeilen ziehen, loslassen.
   * Die Zeile unter dem Zeiger kommt aus `data-row-key`; am Rand scrollt die Tabelle mit.
   * Fenster und Dokument des Griffs — bei abgekoppelter Tabelle das zweite Fenster.
   */
  const startFill = useCallback(
    (event: ReactPointerEvent<HTMLElement>, id: string, column: FillColumn): void => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
      const handle = event.currentTarget;
      const doc = handle.ownerDocument;
      const win = doc.defaultView ?? window;
      const body = handle.closest<HTMLElement>('[data-table-body]');
      // Waagerecht zählt nur die Spalte des Griffs, egal wohin der Zeiger abdriftet.
      const cell = handle.closest<HTMLElement>('[role="gridcell"]') ?? handle;
      const cellRect = cell.getBoundingClientRect();
      const x = cellRect.left + cellRect.width / 2;
      let y = event.clientY;
      let to = id;
      setFill({ column, from: id, to: id });

      const pick = (): void => {
        const area = body?.getBoundingClientRect();
        const probeY =
          area === undefined ? y : Math.min(area.bottom - 2, Math.max(area.top + 40, y));
        const key = doc
          .elementFromPoint(x, probeY)
          ?.closest('[data-row-key]')
          ?.getAttribute('data-row-key');
        if (key === null || key === undefined || key === to) return;
        to = key;
        setFill({ column, from: id, to });
      };
      const move = (moveEvent: PointerEvent): void => {
        y = moveEvent.clientY;
        pick();
      };
      const timer = win.setInterval(() => {
        if (body === null) return;
        const area = body.getBoundingClientRect();
        if (y > area.bottom - 24) body.scrollTop += 16;
        else if (y < area.top + 40) body.scrollTop -= 16;
        else return;
        pick();
      }, 40);
      const up = (): void => {
        win.clearInterval(timer);
        win.removeEventListener('pointermove', move);
        win.removeEventListener('pointerup', up);
        win.removeEventListener('pointercancel', up);
        doc.body.style.cursor = '';
        doc.body.style.userSelect = '';
        // Wert der Quelle beim Griff; Reihenfolge der Zeilen ändert sich beim Ziehen nicht.
        const ids = spanOf(id, to) ?? [];
        const value: MarkerValue =
          column === 'progress'
            ? { kind: 'progress', progress: annotations.progress.get(id) ?? null }
            : { kind: 'important', on: annotations.important.has(id) };
        fillMarkerNow(
          dispatch,
          ids.filter((other) => other !== id),
          value,
        );
        setFill(null);
      };
      doc.body.style.cursor = 'ns-resize';
      doc.body.style.userSelect = 'none';
      win.addEventListener('pointermove', move);
      win.addEventListener('pointerup', up);
      win.addEventListener('pointercancel', up);
    },
    [spanOf, annotations, dispatch],
  );

  const filling = useMemo(
    () =>
      fill === null || fillIds === null ? null : { column: fill.column, ids: new Set(fillIds) },
    [fill, fillIds],
  );

  const columns = useMemo<Column<Row>[]>(() => {
    const cells: NoteCells = {
      annotations,
      filling,
      openMenu: (kind, id, element) => {
        setAnchor(element);
        setMenu((open) => (open?.kind === kind && open.id === id ? null : { kind, id }));
      },
      toggleImportant: (id) => setImportantNow(dispatch, id, !annotations.important.has(id)),
      startFill,
    };
    return visibleColumnKeys(columnConfig).flatMap((key) => {
      const column = COLUMNS_BY_KEY.get(key);
      if (column === undefined) return [];
      const render =
        annotationRender(key, cells) ?? searchRender(key, active.query) ?? column.render;
      return [{ ...column, render, width: columnConfig.widths[key] }];
    });
  }, [columnConfig, active.query, annotations, filling, dispatch, startFill]);

  // Kopfzeile je Abschnitt: Name, Anzahl der gezeigten Positionen, davon erledigt.
  const heads = useMemo(() => {
    const counts = new Map<string, { node: LVNode; count: number; done: number }>();
    for (const row of rows) {
      const done = annotations.progress.get(row.node.id) === 'fertig' ? 1 : 0;
      for (const step of row.trail) {
        const entry = counts.get(step.id) ?? { node: step, count: 0, done: 0 };
        entry.count++;
        entry.done += done;
        counts.set(step.id, entry);
      }
    }
    const out = new Map<string, GroupHead>();
    for (const [id, { node, count, done }] of counts) {
      out.set(id, { key: id, label: headingOf(node), info: sectionInfo(count, done) });
    }
    return out;
  }, [rows, annotations]);

  const group = useMemo(
    () =>
      heads.size === 0
        ? undefined
        : (row: Row): GroupHead[] => row.trail.flatMap((step) => heads.get(step.id) ?? []),
    [heads],
  );

  const sectionIds = useMemo(() => [...heads.keys()], [heads]);

  // Eine neue Auswahl (Graph, Rechtsklick „In der Tabelle zeigen") klappt ihren Abschnitt
  // auf — sonst landete der Sprung in einem zugeklappten Abschnitt im Leeren.
  const followed = useRef(selectedPositionId);
  useEffect(() => {
    if (followed.current === selectedPositionId) return;
    followed.current = selectedPositionId;
    if (selectedPositionId === null) return;
    const row = rows.find((candidate) => candidate.node.id === selectedPositionId);
    const hidden = row?.trail.filter((step) => collapsed.has(step.id)) ?? [];
    if (hidden.length === 0) return;
    const open = new Set(hidden.map((step) => step.id));
    dispatch({ type: 'tableCollapse', ids: [...collapsed].filter((id) => !open.has(id)) });
  }, [selectedPositionId, rows, collapsed, dispatch]);

  const menuRow = menu === null ? undefined : rows.find((row) => row.node.id === menu.id);

  // Bewusst keine Mengensumme: die Positionen eines Abschnitts haben gemischte
  // Einheiten (m³, m², Stck), eine Summe darüber wäre eine Scheingenauigkeit.
  const sumPrice = hits.reduce((total, row) => total + row.node.totalPrice, 0);
  const parent = parents.get(root.id) ?? null;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      <div
        className="flex min-w-0 shrink-0 items-center gap-[10px] overflow-hidden border-b border-line bg-panel px-[12px] font-mono text-[11px] text-dim"
        style={{ height: 'var(--h-view-head)' }}
      >
        {/* Auf LV-Ebene gibt es nichts darüber; das Fenster schließt sein eigenes ✕. */}
        {parent !== null && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'selectNode', id: parent.id })}
            title="Eine Ebene höher"
            aria-label="Eine Ebene höher"
            className="shrink-0 cursor-pointer border-none bg-transparent px-[4px] font-mono text-[14px] leading-none text-accent"
          >
            ←
          </button>
        )}
        {scopeRoot.code !== '' && (
          <span className="shrink-0 tracking-[0.6px] text-mute">§ {scopeRoot.code}</span>
        )}
        <span className="min-w-0 truncate font-display text-[13px] font-semibold text-ink">
          {effectiveScope === 'lv' && scopeRoot === lvRoot
            ? 'Ganzes LV'
            : (scopeRoot.label ?? 'Ohne Bezeichnung')}
        </span>
        <span className="shrink-0 text-line2">·</span>
        <span className="shrink-0">
          <span className="font-medium text-ink">{formatCount(hits.length)}</span>/
          {formatCount(allRows.length)} Pos.
        </span>
        <span className="shrink-0 text-line2">·</span>
        <span className="shrink-0">∑ GP {formatEuro(sumPrice, 0)}</span>
        {fellBack && (
          <span
            className="shrink-0 text-accent"
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
              onChange={(value) => dispatch({ type: 'tableScope', scope: value as Scope })}
            />
          )}
          {sectionIds.length > 0 && (
            <Chip
              on={false}
              onClick={() =>
                dispatch({ type: 'tableCollapse', ids: collapsed.size > 0 ? [] : sectionIds })
              }
              title="Alle Abschnitte auf- oder zuklappen"
            >
              {collapsed.size > 0 ? 'Alle aufklappen' : 'Alle zuklappen'}
            </Chip>
          )}
          <ColumnPicker config={columnConfig} onChange={setColumnConfig} />
        </span>
      </div>

      {columns.length === 0 ? (
        <p className="m-0 p-[16px] font-mono text-[11px] text-mute">Alle Spalten ausgeblendet.</p>
      ) : (
        <DataTable
          label="Positionen"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.node.id}
          dimmed={hitKeys === null ? undefined : (row) => !hitKeys.has(row.node.id)}
          selectedKey={selectedPositionId}
          revealKey={selectedPositionId}
          onPick={(key, event) => {
            // Shift + Klick legt die Position in den Vergleich — wie im Graphen.
            if (event.shiftKey) {
              dispatch({ type: 'toggleCompare', positionId: key });
              return;
            }
            dispatch({
              type: 'selectPosition',
              nodeId: root.id,
              positionId: selectedPositionId === key ? null : key,
            });
          }}
          onRowContextMenu={(key, event) => {
            event.preventDefault();
            openMenu(key, event.clientX, event.clientY, 'table', event.currentTarget.ownerDocument);
          }}
          initialScrollTop={scroll.table}
          onLeave={(top) => dispatch({ type: 'viewScroll', view: 'table', top })}
          empty="Keine Positionen entsprechen den Filtern."
          sort={sort}
          onSort={(key) => dispatch({ type: 'tableSort', key })}
          group={group}
          collapsed={collapsed}
          onToggleGroup={(id) => dispatch({ type: 'tableToggleSection', id })}
          cellTitle={(row, column) =>
            column.key === 'shortText'
              ? row.position.shortText
              : column.key === 'note'
                ? latestCommentsOf(annotations, row.node.id)
                    .map((comment) => comment.text)
                    .join('\n') || undefined
                : undefined
          }
          onResize={(key, width) => setColumnConfig(resizeColumn(columnConfig, key, width))}
        />
      )}
      <Popover
        ref={menuRef}
        open={menu !== null && menuRow !== undefined}
        width={menu?.kind === 'comment' ? 300 : 170}
        align={menu?.kind === 'comment' ? 'right' : 'left'}
        anchorRef={menuAnchor}
      >
        {menu !== null && menuRow !== undefined && menu.kind === 'progress' && (
          <ProgressChoices
            current={annotations.progress.get(menu.id) ?? null}
            onPick={(value) => {
              if (value !== (annotations.progress.get(menu.id) ?? null)) {
                setProgressNow(dispatch, menu.id, value);
              }
              closeMenu();
            }}
          />
        )}
        {menu !== null && menuRow !== undefined && menu.kind === 'comment' && (
          <CommentEditor
            key={menu.id}
            id={menu.id}
            oz={menuRow.position.oz}
            annotations={annotations}
            onClose={closeMenu}
          />
        )}
      </Popover>
    </div>
  );
}
