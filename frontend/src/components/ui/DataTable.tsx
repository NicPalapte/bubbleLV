// Bubble — DataTable: flex-basierte Zebra-Tabelle mit sortierbarem Mono-Kopf.
// Portiert aus .claude/skills/bubble-design/components/core/DataTable.jsx.
//
// Ergänzungen gegenüber der Skill-Vorlage:
//  - `sortable` je Spalte: Status und Exposition lassen sich nicht sinnvoll sortieren.
//  - ARIA-Rollen (table/row/columnheader/cell): das Markup ist aus Flex-Divs gebaut,
//    ohne die Rollen ist es für Screenreader und Tests keine Tabelle.
//  - `group`: Kopfzeilen je Abschnittsebene — die Positionstabelle zeigt
//    Filtertreffer nach Überschriften gruppiert (Issue #12). Jede Ebene hat eine
//    eigene Zeile und lässt sich zuklappen (`collapsed`, `onToggleGroup`); oben
//    stehen bleibt nur der Abschnitt, in dem die oberste Zeile liegt.
//  - Fenster-Virtualisierung: bei 10k Positionen dauerte „Ganzes LV" 10,6 s und
//    Sortieren 10 s, weil jede Zeile neun DOM-Zellen bekam (Issue #22). Gezeichnet
//    wird nur der sichtbare Ausschnitt — Prinzip wie `Tree.tsx` (Issue #23), hier
//    aber mit zwei Zeilenhöhen (Daten- und Gruppenkopfzeile), deshalb kumulierte
//    Offsets statt fester Schrittweite. Beide Höhen werden per unsichtbarer
//    Messzeile ermittelt statt geraten, damit sie nicht von den CSS-Tokens
//    abweichen können.
//  - Pixelbreiten statt Prozent und ein Zieh-Griff je Spaltenkopf (`onResize`,
//    Issue #41). Alle Spalten sind fest, ein Füllelement deckt den Rest ab —
//    so wirkt jeder Griff, auch der an der letzten Spalte. Ist die Summe
//    breiter als der Platz, scrollt die Tabelle waagerecht; der Kopf läuft
//    dabei mit. Doppelklick auf einen Griff passt die Spalte an den breitesten
//    gerade gezeichneten Inhalt an (bei Virtualisierung: das sichtbare Fenster).

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from '../../lib/table/columns';

export interface Column<T> {
  key: string;
  label: string;
  /** Breite in Pixeln — Spalten sind flex-basis, nie auto. */
  width: number;
  align?: 'left' | 'right' | 'center';
  /** Kurzer Kopf, wenn `label` nicht in die Spalte passt (z. B. „!"); `label` bleibt Name. */
  short?: string;
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
  /**
   * Zeile, die in den sichtbaren Bereich geholt werden soll, sobald sie
   * wechselt. Ein Sprung aus Graph, Prüfung oder Ähnlichkeit landet sonst zwar
   * auf der richtigen Zeile — nur steht die bei 10.000 Zeilen weit außerhalb
   * des Fensters (WP-Q, Schritt 5).
   */
  revealKey?: string | null;
  /**
   * Zeile gewählt. Das Ereignis kommt mit, damit Aufrufer Strg-/Cmd-Klick von
   * einem gewöhnlichen Klick unterscheiden können (Mehrfachauswahl, WP-N).
   */
  onPick?: (key: string, event: ReactMouseEvent | ReactKeyboardEvent) => void;
  /** Rechtsklick auf eine Zeile — z. B. das Vergleichsmenü (PR #86). */
  onRowContextMenu?: (key: string, event: ReactMouseEvent) => void;
  empty?: string;
  sort?: { key: string; dir: 1 | -1 };
  onSort?: (key: string) => void;
  /** aria-label der Tabelle. */
  label?: string;
  /** Titel-Attribut je Zelle, z. B. für abgeschnittene Bezeichnungen. */
  cellTitle?: (row: T, column: Column<T>) => string | undefined;
  /** Zeile blass zeichnen — Nicht-Treffer im Modus „dimmen" (Entscheidung 0058). */
  dimmed?: (row: T) => boolean;
  /**
   * Abschnittspfad einer Zeile, äußerster zuerst. Für jede Ebene, die gegenüber
   * der vorigen Zeile wechselt, steht darüber eine Kopfzeile. Die Zeilen müssen
   * dafür bereits nach Abschnitten sortiert ankommen.
   */
  group?: (row: T) => readonly GroupHead[];
  /** Zugeklappte Abschnitte (`GroupHead.key`): Kopfzeile bleibt, Inhalt fällt weg. */
  collapsed?: ReadonlySet<string>;
  /** Klick auf eine Kopfzeile; ohne Callback lassen sich Abschnitte nicht zuklappen. */
  onToggleGroup?: (key: string) => void;
  /**
   * Breite einer Spalte per Zieh-Griff ändern; ohne Callback gibt es keinen
   * Griff. Doppelklick auf den Griff liefert die Breite des breitesten
   * gezeichneten Inhalts.
   */
  onResize?: (key: string, width: number) => void;
  /**
   * Scrollposition, mit der die Tabelle aufgeht — sie überlebt damit einen
   * Ansichtswechsel (WP-L). Nur der Wert beim Einhängen zählt.
   */
  initialScrollTop?: number;
  /**
   * Beim Abbau einmal die erreichte Scrollposition. Bewusst nicht bei jedem
   * Scroll-Ereignis: das feuert dutzendfach je Sekunde und zöge über den
   * Viewer-Zustand die ganze Seite neu auf.
   */
  onLeave?: (scrollTop: number) => void;
}

/** Waagerechter Innenabstand einer Zelle (var(--pad-row)) plus rechter Rand. */
const CELL_CHROME = 12 * 2 + 1;
/** Platz für den Sortierpfeil im Spaltenkopf. */
const SORT_ARROW_ROOM = 14;

/**
 * Zieh-Griff am rechten Rand eines Spaltenkopfs. Gleiche Mechanik wie
 * `ResizeHandle` der Seitenspalten, aber als schmaler Streifen über dem
 * Spaltenrand statt als eigener Trenner im Layout.
 */
function ColumnGrip({
  width,
  label,
  onResize,
  onFit,
}: {
  width: number;
  label: string;
  onResize: (width: number) => void;
  onFit: () => void;
}) {
  const start = (event: ReactMouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const x0 = event.clientX;
    // Das Fenster, in dem der Griff steht — bei abgekoppelter Tabelle das zweite.
    const doc = event.currentTarget.ownerDocument;
    const win = doc.defaultView ?? window;
    const move = (moveEvent: MouseEvent): void => {
      onResize(
        Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width + moveEvent.clientX - x0)),
      );
    };
    const up = (): void => {
      win.removeEventListener('mousemove', move);
      win.removeEventListener('mouseup', up);
      doc.body.style.cursor = '';
      doc.body.style.userSelect = '';
    };
    doc.body.style.cursor = 'col-resize';
    doc.body.style.userSelect = 'none';
    win.addEventListener('mousemove', move);
    win.addEventListener('mouseup', up);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Breite der Spalte ${label} ändern`}
      title="Ziehen: Breite ändern · Doppelklick: an Inhalt anpassen"
      onMouseDown={start}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onFit();
      }}
      style={{
        position: 'absolute',
        top: 0,
        right: -4,
        width: 8,
        height: '100%',
        cursor: 'col-resize',
        zIndex: 2,
      }}
    />
  );
}

/** Zelleninhalt einzeilig mit Auslassungspunkten — auch im Spaltenkopf. */
const CLIPPED: CSSProperties = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/** Rest rechts der letzten Spalte — trägt Zebra und Rahmen, aber keinen Inhalt. */
function Filler() {
  return <div aria-hidden="true" style={{ flex: '1 1 0', minWidth: 0 }} />;
}

export interface GroupHead {
  key: string;
  label: ReactNode;
  /** Rechts in der Kopfzeile, z. B. Anzahl und Fortschritt. */
  info?: ReactNode;
}

/**
 * Eine gezeichnete Zeile: Abschnittskopf oder Datenzeile. `parent` ist der
 * Index des nächsthöheren Kopfs in `items` (-1 = keiner) — er steht oben, solange
 * die Zeile die oberste ist.
 */
type Item<T> =
  | { kind: 'head'; head: GroupHead; level: number; closed: boolean; parent: number }
  | { kind: 'row'; row: T; parent: number };

/**
 * Kopf- und Datenzeilen in Anzeigereihenfolge. Unter einem zugeklappten Abschnitt
 * fällt alles weg, auch tiefere Köpfe. Bewusst außerhalb der Komponente, damit im
 * Render nichts fortgeschrieben wird.
 */
function layoutItems<T>(
  rows: readonly T[],
  group: ((row: T) => readonly GroupHead[]) | undefined,
  collapsed: ReadonlySet<string>,
): Item<T>[] {
  if (group === undefined) return rows.map((row) => ({ kind: 'row', row, parent: -1 }));
  const items: Item<T>[] = [];
  // Offener Pfad: Schlüssel und Item-Index je Ebene (-1 = Kopf liegt unter einem zugeklappten).
  let openKeys: string[] = [];
  let openItems: number[] = [];
  for (const row of rows) {
    const path = group(row);
    let same = 0;
    while (same < path.length && same < openKeys.length && path[same]!.key === openKeys[same]) {
      same++;
    }
    openKeys = openKeys.slice(0, same);
    openItems = openItems.slice(0, same);
    for (let level = same; level < path.length; level++) {
      const head = path[level]!;
      const hidden = openKeys.some((key) => collapsed.has(key));
      openKeys.push(head.key);
      if (hidden) {
        openItems.push(-1);
        continue;
      }
      items.push({
        kind: 'head',
        head,
        level,
        closed: collapsed.has(head.key),
        parent: openItems[level - 1] ?? -1,
      });
      openItems.push(items.length - 1);
    }
    if (openKeys.some((key) => collapsed.has(key))) continue;
    items.push({ kind: 'row', row, parent: openItems[openItems.length - 1] ?? -1 });
  }
  return items;
}

const NO_KEYS: ReadonlySet<string> = new Set();

/** Zeilen über/unter dem Fenster, damit beim Scrollen nichts aufblitzt. */
const OVERSCAN_PX = 240;

/** Höhe, mit der ohne messbare Zeile gerechnet wird (Fallback vor der Messung). */
const UNMEASURED = 0;

/**
 * Zeilen, die vor der Messung höchstens gezeichnet werden (Issue #98). Der erste
 * Frame hat noch keine Fensterhöhe, also kein Fenster — früher hieß das „alle
 * Zeilen": bei rund 9.500 Positionen ca. 200.000 DOM-Knoten, die sofort nach der
 * Messung wieder abgebaut wurden (7 bis 14 s beim Ansichtswechsel).
 *
 * Die Messung braucht keine einzige Zeile: Zeilen- und Kopfhöhe kommen aus den
 * unsichtbaren Messzeilen. Der unvermessene Frame wird zudem nie gemalt, die
 * Messung läuft im Layout-Effekt davor. Klein ist er deshalb mit Absicht: 200
 * statt 40 Zeilen kosteten bei 9.500 Positionen noch rund 100 ms Layout je
 * Ansichtswechsel. In jsdom, das nie misst, bleibt die Tabelle dauerhaft in
 * diesem Zustand.
 */
export const UNMEASURED_ROWS = 40;

/** Feste Höhe einer Kopfzeile: alle Ebenen gleich hoch, sonst stimmen die Offsets nicht. */
const HEAD_ROW_HEIGHT = 32;

function GroupHeadRow({
  head,
  level,
  closed,
  onToggle,
  width,
  style,
}: {
  head: GroupHead;
  level: number;
  closed: boolean;
  onToggle?: () => void;
  /** Sichtbare Breite: der Inhalt bleibt beim waagerechten Scrollen links stehen. */
  width?: number;
  style?: CSSProperties;
}) {
  const top = level === 0;
  const label = (
    <>
      {onToggle !== undefined && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 10,
            fontSize: 9,
            color: 'var(--dim)',
            transform: closed ? 'rotate(-90deg)' : undefined,
            transition: 'transform 120ms',
          }}
        >
          ▼
        </span>
      )}
      <span style={{ ...CLIPPED, minWidth: 0 }}>{head.label}</span>
    </>
  );
  return (
    // Die ganze Zeile klappt; der Knopf darin trägt Tastatur und aria-expanded,
    // sein Klick kommt über das Bubbeln hier an.
    <div
      role="row"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: HEAD_ROW_HEIGHT,
        cursor: onToggle === undefined ? undefined : 'pointer',
        userSelect: 'none',
        background: top ? 'var(--sec1)' : 'var(--sec2)',
        color: top ? 'var(--sec1-ink)' : 'var(--ink)',
        borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--sans)',
        fontSize: top ? 12.5 : 12,
        fontWeight: 600,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        role="gridcell"
        style={{
          position: 'sticky',
          left: 0,
          flex: width === undefined ? 1 : `0 0 ${width}px`,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingRight: 12,
          paddingLeft: 12 + level * 16,
          boxSizing: 'border-box',
        }}
      >
        {onToggle === undefined ? (
          <span style={{ display: 'flex', minWidth: 0, gap: 8 }}>{label}</span>
        ) : (
          <button
            type="button"
            aria-expanded={!closed}
            title={closed ? 'Abschnitt aufklappen' : 'Abschnitt zuklappen'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
              maxWidth: '100%',
              padding: 0,
              border: 'none',
              background: 'transparent',
              font: 'inherit',
              color: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {label}
          </button>
        )}
        {head.info !== undefined && (
          <span
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              fontWeight: 400,
              color: 'var(--dim)',
            }}
          >
            {head.info}
          </span>
        )}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectedKey = null,
  revealKey = null,
  onPick,
  onRowContextMenu,
  empty = 'Keine Einträge.',
  sort,
  onSort,
  label,
  cellTitle,
  dimmed,
  group,
  collapsed = NO_KEYS,
  onToggleGroup,
  onResize,
  initialScrollTop = 0,
  onLeave,
}: DataTableProps<T>) {
  const items = useMemo(() => layoutItems(rows, group, collapsed), [rows, group, collapsed]);
  // Sichtbare Datenzeilen und ihr Platz in `items` — Tastatur und Sprung arbeiten darauf.
  const { visibleRows, itemOf } = useMemo(() => {
    const list: T[] = [];
    const at: number[] = [];
    items.forEach((item, i) => {
      if (item.kind !== 'row') return;
      list.push(item.row);
      at.push(i);
    });
    return { visibleRows: list, itemOf: at };
  }, [items]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const rowProbeRef = useRef<HTMLDivElement>(null);
  const headProbeRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  // Laufende Position ohne Zustandswechsel — sie wird beim Abbau gemeldet.
  const scrollRef = useRef(initialScrollTop);
  const [viewport, setViewport] = useState(UNMEASURED);
  const [viewportWidth, setViewportWidth] = useState(UNMEASURED);
  const [rowHeight, setRowHeight] = useState(UNMEASURED);
  const [headHeight, setHeadHeight] = useState(UNMEASURED);

  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (element === null) return;
    const measure = (): void => {
      setViewport(element.clientHeight);
      setViewportWidth(element.clientWidth);
    };
    measure();
    // Der Beobachter des eigenen Fensters: ein fremder meldet in einem zweiten
    // Fenster (abgekoppelte Tabelle) nicht zuverlässig.
    const Observer = element.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver;
    const observer = new Observer(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Gemerkte Position wiederherstellen und beim Abbau zurückmelden.
  const leaveRef = useRef(onLeave);
  useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);
  useLayoutEffect(() => {
    if (bodyRef.current !== null) bodyRef.current.scrollTop = scrollRef.current;
    return () => leaveRef.current?.(scrollRef.current);
  }, []);

  // Zeilenhöhe per unsichtbarer Messzeile statt Annahme — bleibt korrekt, auch
  // wenn --pad-row/--fs-row sich ändern.
  useLayoutEffect(() => {
    const rowProbeHeight = rowProbeRef.current?.getBoundingClientRect().height ?? UNMEASURED;
    if (rowProbeHeight > 0) setRowHeight(rowProbeHeight);
    const headProbeHeight = headProbeRef.current?.getBoundingClientRect().height ?? UNMEASURED;
    if (headProbeHeight > 0) setHeadHeight(headProbeHeight);
  });

  // Kumulierte Offsets: itemTop[i] ist die Position, an der Kopf- oder Datenzeile i beginnt.
  const itemTop = useMemo(() => {
    const offsets = new Array<number>(items.length + 1);
    offsets[0] = 0;
    for (let i = 0; i < items.length; i++) {
      offsets[i + 1] = offsets[i]! + (items[i]!.kind === 'head' ? headHeight : rowHeight);
    }
    return offsets;
  }, [items, headHeight, rowHeight]);

  const totalHeight = itemTop[items.length] ?? 0;
  const measured = viewport > UNMEASURED && rowHeight > UNMEASURED;

  // Gewählte Zeile ins Fenster holen — einmal je Wechsel, und nur, wenn sie
  // nicht ohnehin zu sehen ist: ein Klick in die Tabelle soll nicht scrollen.
  const revealed = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (revealKey === null) {
      revealed.current = null;
      return;
    }
    if (!measured || revealed.current === revealKey) return;
    const element = bodyRef.current;
    if (element === null) return;
    const index = visibleRows.findIndex((row) => rowKey(row) === revealKey);
    if (index < 0) return;
    revealed.current = revealKey;
    const item = itemOf[index]!;
    const top = itemTop[item]!;
    const bottom = itemTop[item + 1]!;
    // Oben verdeckt der stehende Abschnittskopf eine Zeile.
    const pinRoom = group === undefined ? 0 : headHeight;
    if (top >= element.scrollTop + pinRoom && bottom <= element.scrollTop + viewport) return;
    const next = Math.max(0, top - viewport / 2 + rowHeight / 2);
    element.scrollTop = next;
    scrollRef.current = next;
    setScrollTop(next);
  }, [
    revealKey,
    measured,
    visibleRows,
    itemOf,
    rowKey,
    itemTop,
    group,
    headHeight,
    viewport,
    rowHeight,
  ]);

  // ── Tastatur ──────────────────────────────────────────────────────────────
  // Dieselbe Bedeutung wie im Baum (layout/Tree.tsx): die Pfeiltasten bewegen
  // eine **aktive** Zeile, Enter wählt sie. Bewegen und Wählen zu trennen ist
  // hier nicht Geschmack, sondern nötig: jede Auswahl zieht das
  // Eigenschaften-Panel und den Graphen mit, und bei 10.000 Zeilen wäre ein
  // Durchlauf mit gedrückter Pfeiltaste sonst eine Kaskade aus Neuberechnungen.
  const gridId = useId();
  const rowDomId = useCallback((key: string): string => `${gridId}-${key}`, [gridId]);

  const [activeKey, setActiveKey] = useState<string | null>(selectedKey ?? null);
  // Eine Auswahl von außen (Graph, Positionskarte, Prüfung) führt die Tastatur
  // mit — sonst spränge der nächste Pfeiltastendruck an eine andere Stelle.
  const [followedSelection, setFollowedSelection] = useState<string | null>(selectedKey ?? null);
  if ((selectedKey ?? null) !== followedSelection) {
    setFollowedSelection(selectedKey ?? null);
    if (selectedKey !== null && selectedKey !== undefined) setActiveKey(selectedKey);
  }

  const activeIndex = useMemo(
    () => (activeKey === null ? -1 : visibleRows.findIndex((row) => rowKey(row) === activeKey)),
    [activeKey, visibleRows, rowKey],
  );

  /** Zeile ins Fenster holen — die Tabelle ist virtualisiert. */
  const revealRow = useCallback(
    (index: number): void => {
      const element = bodyRef.current;
      if (element === null || !measured) return;
      const item = itemOf[index]!;
      const top = itemTop[item]!;
      const bottom = itemTop[item + 1]!;
      const pinRoom = group === undefined ? 0 : headHeight;
      if (top >= element.scrollTop + pinRoom && bottom <= element.scrollTop + viewport) return;
      const next = top < element.scrollTop + pinRoom ? top - pinRoom : bottom - viewport;
      const geklemmt = Math.max(0, next);
      element.scrollTop = geklemmt;
      scrollRef.current = geklemmt;
      setScrollTop(geklemmt);
    },
    [measured, itemOf, itemTop, group, headHeight, viewport],
  );

  const moveTo = useCallback(
    (index: number): void => {
      const geklemmt = Math.max(0, Math.min(visibleRows.length - 1, index));
      const row = visibleRows[geklemmt];
      if (row === undefined) return;
      setActiveKey(rowKey(row));
      revealRow(geklemmt);
    },
    [visibleRows, rowKey, revealRow],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      // Nur Tasten, die dem Raster selbst gelten. Die Spaltenköpfe und die
      // Zieh-Griffe darin sind eigene Schaltflächen; ihr Enter blubberte sonst
      // bis hierher und wählte nebenbei eine Zeile aus — mitsamt Panel und
      // Graph, obwohl jemand nur sortieren wollte.
      if (event.target !== event.currentTarget) return;
      if (visibleRows.length === 0) return;
      // Ohne aktive Zeile beginnt jede Bewegung oben.
      const current = activeIndex < 0 ? 0 : activeIndex;
      const seite = Math.max(1, Math.floor(viewport / Math.max(1, rowHeight)) - 1);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current + 1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current - 1);
          return;
        case 'PageDown':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current + seite);
          return;
        case 'PageUp':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current - seite);
          return;
        case 'Home':
          event.preventDefault();
          moveTo(0);
          return;
        case 'End':
          event.preventDefault();
          moveTo(visibleRows.length - 1);
          return;
        case 'Enter':
        case ' ': {
          event.preventDefault();
          const row = visibleRows[current];
          if (row !== undefined) onPick?.(rowKey(row), event);
          return;
        }
        default:
          return;
      }
    },
    [visibleRows, rowKey, activeIndex, moveTo, onPick, viewport, rowHeight],
  );

  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  /**
   * Breite, mit der der breiteste gezeichnete Inhalt einer Spalte ohne
   * Auslassung passt. `scrollWidth` liefert die volle Inhaltsbreite auch bei
   * `overflow: hidden`. Virtualisiert werden nur die Zeilen im Fenster
   * gemessen — für 10k Zeilen wäre alles andere nicht bezahlbar.
   */
  const fitWidth = (key: string): number => {
    let widest = 0;
    for (const scope of [headRef.current, bodyRef.current]) {
      if (scope === null) continue;
      for (const element of scope.querySelectorAll<HTMLElement>('[data-column]')) {
        if (element.dataset.column !== key) continue;
        const room = element.dataset.head === '1' ? SORT_ARROW_ROOM : 0;
        widest = Math.max(widest, element.scrollWidth + CELL_CHROME + room);
      }
    }
    return widest;
  };

  // Ohne gemessenes Layout (jsdom in Tests, erster Frame) gibt es kein Fenster:
  // gezeichnet wird dann nur der Anfang, begrenzt auf UNMEASURED_ROWS.
  let first = 0;
  let last = Math.min(items.length, UNMEASURED_ROWS);
  if (measured) {
    const from = Math.max(0, scrollTop - OVERSCAN_PX);
    const to = scrollTop + viewport + OVERSCAN_PX;
    // itemTop ist monoton steigend — binäre Suche statt linearem Scan über bis
    // zu 10k Einträge je Scroll-Event.
    first = Math.max(0, lowerBound(itemTop, from) - 1);
    last = Math.min(items.length, lowerBound(itemTop, to));
  }

  // Stehender Abschnittskopf — Ersatz für "position: sticky", das mit absolut
  // positionierten, virtualisierten Zeilen nicht greift. Es steht nur der Abschnitt
  // der obersten Zeile, nicht der ganze Pfad darüber.
  const pinned = useMemo(() => {
    // Ohne gemessenes Layout (jsdom, erster Frame) sind alle Offsets 0 — dann
    // stünde hier ein falscher Kopf, und sein Label erschiene doppelt.
    if (group === undefined || !measured || items.length === 0 || scrollTop <= 0) return null;
    const top = Math.min(items.length - 1, lowerBound(itemTop, scrollTop + 1) - 1);
    const item = items[top]!;
    // Ein Kopf, der ganz zu sehen ist, braucht keinen Doppelgänger.
    if (item.kind === 'head' && itemTop[top]! >= scrollTop) return null;
    const index = item.kind === 'head' ? top : item.parent;
    if (index < 0) return null;
    const head = items[index];
    if (head === undefined || head.kind !== 'head') return null;
    // Der nächste Kopf schiebt den stehenden nach oben weg.
    let shift = 0;
    for (let i = top + 1; i < items.length && itemTop[i]! < scrollTop + headHeight; i++) {
      if (items[i]!.kind === 'head') {
        shift = itemTop[i]! - scrollTop - headHeight;
        break;
      }
    }
    return { head, shift };
  }, [group, measured, items, itemTop, scrollTop, headHeight]);

  return (
    // `grid` statt `table`: die Tabelle ist bedienbar, nicht nur lesbar — sie
    // nimmt den Fokus und führt eine aktive Zeile (WP-P, Schritt 5).
    <div
      role="grid"
      aria-label={label}
      tabIndex={0}
      aria-activedescendant={
        activeIndex < 0 ? undefined : rowDomId(rowKey(visibleRows[activeIndex]!))
      }
      onKeyDown={onKeyDown}
      // Wer die Tabelle mit Tab erreicht, muss sehen, wo er steht: ohne aktive
      // Zeile zeigte der Fokus sonst gar nichts an.
      onFocus={(event) => {
        // Wie beim Tastendruck: nur der Fokus auf dem Raster selbst zählt.
        // `onFocus` folgt dem bubbelnden `focusin` — ein Klick auf einen
        // Spaltenkopf markierte sonst Zeile 1 als aktiv, obwohl niemand mit
        // der Tastatur unterwegs ist.
        if (event.target !== event.currentTarget) return;
        if (activeKey === null && visibleRows.length > 0) setActiveKey(rowKey(visibleRows[0]!));
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'var(--white)',
        // Den Fokusring des Browsers nur dann abschalten, wenn die aktive
        // Zeile ihn übernimmt. Ohne Zeilen — leeres Filterergebnis — bliebe
        // sonst gar nichts sichtbar, obwohl die Tastatur hier steht.
        outline: activeIndex < 0 ? undefined : 'none',
      }}
    >
      {/* Der Kopf scrollt waagerecht mit dem Körper mit (scrollLeft-Abgleich in
          onScroll), hat aber keinen eigenen Rollbalken. */}
      <div ref={headRef} style={{ overflow: 'hidden', flexShrink: 0 }}>
        <div
          role="row"
          style={{
            display: 'flex',
            minWidth: totalWidth,
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
                  position: 'relative',
                  flex: `0 0 ${column.width}px`,
                  minWidth: 0,
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
                      ...CLIPPED,
                    }}
                  >
                    <span data-column={column.key} data-head="1">
                      {column.short ?? column.label}
                    </span>{' '}
                    {active ? (sort.dir > 0 ? '↑' : '↓') : ''}
                  </button>
                ) : (
                  <span style={{ padding: '10px 12px', ...CLIPPED }}>
                    <span data-column={column.key} data-head="1">
                      {column.short ?? column.label}
                    </span>
                  </span>
                )}
                {onResize !== undefined && (
                  <ColumnGrip
                    width={column.width}
                    label={column.label}
                    onResize={(width) => onResize(column.key, width)}
                    onFit={() => onResize(column.key, fitWidth(column.key))}
                  />
                )}
              </div>
            );
          })}
          <Filler />
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        {/*
        Ersatz für "position: sticky" auf der Kopfzeile: sie steckt unter den
        virtualisierten, absolut positionierten Zeilen und würde nicht kleben. Dieser
        Balken liegt über der obersten Zeile des Scroll-Containers.
      */}
        {pinned !== null && (
          <div
            data-pinned-head=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: viewportWidth > 0 ? viewportWidth : '100%',
              height: headHeight,
              overflow: 'hidden',
              zIndex: 2,
              boxShadow: '0 2px 6px rgba(21, 33, 49, 0.10)',
            }}
          >
            <GroupHeadRow
              head={pinned.head.head}
              level={pinned.head.level}
              closed={pinned.head.closed}
              width={viewportWidth > 0 ? viewportWidth : undefined}
              onToggle={
                onToggleGroup === undefined ? undefined : () => onToggleGroup(pinned.head.head.key)
              }
              style={{ transform: `translateY(${pinned.shift}px)` }}
            />
          </div>
        )}

        <div
          ref={bodyRef}
          data-table-body=""
          onScroll={(event) => {
            scrollRef.current = event.currentTarget.scrollTop;
            setScrollTop(event.currentTarget.scrollTop);
            if (headRef.current !== null)
              headRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative' }}
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
              <GroupHeadRow head={{ key: 'X', label: 'X' }} level={0} closed={false} />
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

          <div
            style={{
              height: measured ? totalHeight : undefined,
              minWidth: totalWidth,
              position: 'relative',
            }}
          >
            {items.slice(first, last).map((item, offset) => {
              const index = first + offset;
              const top = measured ? itemTop[index] : undefined;
              const placed: CSSProperties = measured
                ? { position: 'absolute', top, left: 0, right: 0, boxSizing: 'border-box' }
                : {};
              if (item.kind === 'head') {
                const { key: headKey } = item.head;
                return (
                  <GroupHeadRow
                    key={`group:${headKey}`}
                    head={item.head}
                    level={item.level}
                    closed={item.closed}
                    width={viewportWidth > 0 ? viewportWidth : undefined}
                    onToggle={
                      onToggleGroup === undefined ? undefined : () => onToggleGroup(headKey)
                    }
                    style={placed}
                  />
                );
              }
              const { row } = item;
              const key = rowKey(row);
              const selected = selectedKey === key;
              return (
                <div
                  key={key}
                  id={rowDomId(key)}
                  data-row-key={key}
                  role="row"
                  aria-selected={selected}
                  onClick={(event) => onPick?.(key, event)}
                  onContextMenu={
                    onRowContextMenu === undefined
                      ? undefined
                      : (event) => onRowContextMenu(key, event)
                  }
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--grid)',
                    cursor: onPick === undefined ? 'default' : 'pointer',
                    // Die aktive Zeile ist die, auf der die Tastatur steht; die
                    // gewählte ist blau. Beide zugleich sichtbar zu halten
                    // braucht zwei verschiedene Mittel — Fläche und Kante.
                    outline: key === activeKey ? '1px solid var(--blue)' : 'none',
                    outlineOffset: '-1px',
                    background: selected
                      ? 'var(--blueS)'
                      : index % 2 === 1
                        ? 'var(--panel)'
                        : 'var(--white)',
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--fs-row)',
                    opacity: dimmed?.(row) === true ? 0.4 : undefined,
                    ...placed,
                  }}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      role="gridcell"
                      data-cell={column.key}
                      title={cellTitle?.(row, column)}
                      style={{
                        position: 'relative',
                        flex: `0 0 ${column.width}px`,
                        minWidth: 0,
                        padding: 'var(--pad-row)',
                        borderRight: '1px solid var(--grid)',
                        textAlign: column.align ?? 'left',
                        color: column.primary === true ? 'var(--ink)' : 'var(--dim)',
                        fontWeight: column.primary === true ? 500 : 400,
                        ...CLIPPED,
                      }}
                    >
                      {/* Innerer Messknoten: sein scrollWidth ist die Inhaltsbreite
                        ohne Zellenabstand — Grundlage für „an Inhalt anpassen". */}
                      <span data-column={column.key} style={CLIPPED}>
                        {column.render === undefined ? '—' : column.render(row)}
                      </span>
                    </div>
                  ))}
                  <Filler />
                </div>
              );
            })}
          </div>
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
