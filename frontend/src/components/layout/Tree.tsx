// Linke Hierarchie-Spalte — über denselben LVNode-Baum wie der Bubble-Graph,
// filter- und suchbewusst. Aufklapp-Zustand und Trefferzahlen kommen aus dem
// Viewer-State, damit Baum und Graph gleich stehen (Issue #18).
// Portiert aus `Tree` in design/claude-design/lv-main.jsx (Analytik-Navigation
// entfällt, out of scope); die Zeile selbst ist der Design-System-Baustein
// `TreeRow`.
//
// Gezeichnet wird nur das sichtbare Fenster: bei aktiver Suche klappen die
// Pfade zu allen Treffern auf, und ein häufiger Begriff öffnet damit praktisch
// den ganzen Baum (gemessen: 10.244 Zeilen, ~3,5 s; Issue #23). Grundlage ist
// die flache Zeilenliste aus `flattenVisible`, die zugleich die Reihenfolge für
// die Tastaturnavigation vorgibt (Issue #28).

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { StatusPill } from '../ui/StatusPill';
import { TreeRow } from '../ui/TreeRow';
import { formatCount } from '../../lib/format';
import { POSITION_STATUS } from '../../lib/status';
import {
  flattenVisible,
  indexRows,
  parentRowIndex,
  type VisibleRow,
} from '../../lib/tree/flattenVisible';
import { matchCount } from '../../lib/tree/matchCounts';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface TreeProps {
  width: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Feste Zeilenhöhe — Voraussetzung dafür, aus der Scrollposition ohne Messung
 * auf den Zeilenindex zu schließen. Der Wert entspricht der bisherigen Höhe
 * einer Abschnittszeile (gemessen 26,5 px); Positionszeilen waren 2,75 px
 * flacher und stehen jetzt im selben Raster.
 */
const ROW_HEIGHT = 26;

/** Zeilen über und unter dem Fenster, damit beim Scrollen nichts aufblitzt. */
const OVERSCAN = 8;

/** Höhe, mit der ohne messbaren Viewport gerechnet wird (jsdom, Tests). */
const UNMEASURED = 0;

const KIND_PREFIX: Record<string, string> = {
  lot: 'LOS',
  section: '§',
};

function nodeTitle(node: LVNode): string {
  if (node.label !== null && node.label !== '') return node.label;
  if (node.code !== '') return node.code;
  return node.kind === 'section' ? 'Ohne Bezeichnung' : 'Ohne Titel';
}

function nodeCode(node: LVNode): string {
  if (node.code === '') return '';
  const prefix = KIND_PREFIX[node.kind];
  return prefix === undefined ? node.code : `${prefix} ${node.code}`;
}

function rowDomId(index: number): string {
  return `lv-tree-row-${index}`;
}

export function Tree({ width, collapsed, onToggleCollapsed }: TreeProps) {
  const {
    tree,
    lv,
    hideMode,
    matches,
    openNodes,
    parents,
    selectedNodeId,
    selectedPositionId,
    selectedPosition,
  } = useViewer();
  const dispatch = useViewerDispatch();

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(UNMEASURED);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rows = useMemo<VisibleRow[]>(
    () => (tree === null ? [] : flattenVisible(tree, openNodes, matches, hideMode === 'hide')),
    [tree, openNodes, matches, hideMode],
  );
  const rowIndex = useMemo(() => indexRows(rows), [rows]);

  useLayoutEffect(() => {
    const element = listRef.current;
    if (element === null) return;
    const measure = (): void => setViewport(element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsed]);

  // Ohne gemessene Höhe (jsdom) lässt sich kein Fenster bestimmen — dann wird
  // alles gezeichnet, damit die Spalte auch dort vollständig ist.
  const windowed = viewport > UNMEASURED;
  const first = windowed ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const last = windowed
    ? Math.min(rows.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN)
    : rows.length;

  /** Zeile in den sichtbaren Bereich holen; sie wird dadurch auch gezeichnet. */
  const revealRow = useCallback((index: number): void => {
    const element = listRef.current;
    if (element === null) return;
    const top = index * ROW_HEIGHT;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight) {
      element.scrollTop = top + ROW_HEIGHT - element.clientHeight;
    }
  }, []);

  const selectRow = useCallback(
    (row: VisibleRow): void => {
      setActiveId(row.node.id);
      if (row.node.kind === 'position') {
        const parent = parents.get(row.node.id) ?? null;
        dispatch({
          type: 'selectPosition',
          nodeId: parent?.id ?? null,
          positionId: row.node.id,
        });
        return;
      }
      // Die Baumzeile ist Navigation — sie führt weiter in die Tabelle und
      // klappt den Knoten auf. Zugeklappt wird nur über das Dreieck, sonst
      // verschwände beim Anklicken genau das, was man sehen will.
      dispatch({ type: 'selectNode', id: row.node.id, open: true });
      if (row.hasChildren) dispatch({ type: 'toggleExpanded', id: row.node.id, open: true });
    },
    [dispatch, parents],
  );

  const activeIndex = activeId === null ? -1 : (rowIndex.get(activeId) ?? -1);

  const moveTo = useCallback(
    (index: number): void => {
      const clamped = Math.max(0, Math.min(rows.length - 1, index));
      const row = rows[clamped];
      if (row === undefined) return;
      setActiveId(row.node.id);
      revealRow(clamped);
    },
    [rows, revealRow],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (rows.length === 0) return;
      // Ohne aktive Zeile beginnt jede Bewegung oben.
      const current = activeIndex < 0 ? 0 : activeIndex;
      const row = rows[current];

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current + 1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveTo(activeIndex < 0 ? 0 : current - 1);
          return;
        case 'Home':
          event.preventDefault();
          moveTo(0);
          return;
        case 'End':
          event.preventDefault();
          moveTo(rows.length - 1);
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (row === undefined) return;
          if (row.hasChildren && !row.open) {
            dispatch({ type: 'toggleExpanded', id: row.node.id, open: true });
            setActiveId(row.node.id);
          } else if (row.hasChildren) {
            moveTo(current + 1);
          }
          return;
        case 'ArrowLeft':
          event.preventDefault();
          if (row === undefined) return;
          if (row.hasChildren && row.open) {
            dispatch({ type: 'toggleExpanded', id: row.node.id, open: false });
            setActiveId(row.node.id);
          } else {
            const parent = parentRowIndex(rows, current);
            if (parent >= 0) moveTo(parent);
          }
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (row !== undefined) selectRow(row);
          return;
        default:
          return;
      }
    },
    [rows, activeIndex, moveTo, dispatch, selectRow],
  );

  // Die Auswahl von außen (Graph, Tabelle) führt die Tastatur mit: sonst
  // springt der nächste Pfeiltastendruck an eine ganz andere Stelle.
  const selectedRowId = selectedPosition !== null ? selectedPositionId : selectedNodeId;
  const [followedSelection, setFollowedSelection] = useState<string | null>(null);
  if (selectedRowId !== followedSelection) {
    setFollowedSelection(selectedRowId);
    if (selectedRowId !== null && rowIndex.has(selectedRowId)) setActiveId(selectedRowId);
  }

  if (collapsed) {
    return (
      <div
        className="flex shrink-0 flex-col overflow-hidden border-r border-line bg-white"
        style={{ width: 'var(--w-tree-collapsed)' }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Baum ausklappen"
          aria-label="Baum ausklappen"
          className="flex w-full cursor-pointer items-center justify-center border-0 border-b border-line bg-transparent font-mono text-[15px] text-dim"
          style={{ height: 'var(--h-view-head)' }}
        >
          ›
        </button>
        <div className="flex-1" />
        <div className="py-[8px] text-center font-mono text-[8px] tracking-[1.2px] text-mute [writing-mode:vertical-rl]">
          STRUKTUR
        </div>
      </div>
    );
  }

  const projectOpen = tree !== null && openNodes.has(tree.id);
  const noMatches = projectOpen && matches.filtering && matchCount(matches, tree) === 0;

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border-r border-line bg-white"
      style={{ width }}
    >
      <div className="border-b border-line bg-paper px-[12px] pb-[11px] pt-[10px]">
        <div className="mb-[5px] flex items-center justify-between">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.6px] text-mute">
            Projekt
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Einklappen"
            aria-label="Baum einklappen"
            className="cursor-pointer border-none bg-transparent px-[2px] font-mono text-[13px] leading-none text-dim"
          >
            ‹
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'selectNode', id: null });
            // Die Projektzeile trägt kein Dreieck — sie ist der Weg zurück,
            // wenn die Projekt-Bubble im Graphen zugeklappt wurde.
            if (tree !== null) dispatch({ type: 'toggleExpanded', id: tree.id, open: true });
          }}
          className="-ml-[2px] block w-full cursor-pointer border-none bg-transparent pl-[8px] text-left"
        >
          <div className="overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[15px] font-bold text-ink">
            {lv?.projectName ?? lv?.fileName ?? 'Kein LV geladen'}
          </div>
          <div className="mt-[3px] font-mono text-[9px] text-mute">
            {tree === null
              ? 'Datei laden'
              : `Übersicht · ${formatCount(tree.positionCount)} Positionen`}
          </div>
        </button>
      </div>

      <div className="px-[12px] pb-[2px] pt-[8px] font-mono text-[9px] uppercase tracking-[0.6px] text-mute">
        Struktur
      </div>

      {tree === null && (
        <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
          Noch keine Struktur — GAEB-Datei laden.
        </div>
      )}
      {tree !== null && !projectOpen && (
        <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
          Projekt zugeklappt — Projektzeile oben öffnet die Struktur.
        </div>
      )}
      {noMatches && (
        <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
          Keine Position entspricht {hideMode === 'hide' ? 'den Filtern' : 'Suche/Filter'}.
        </div>
      )}

      <div
        ref={listRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        onKeyDown={onKeyDown}
        role="tree"
        aria-label="LV-Struktur"
        tabIndex={0}
        aria-activedescendant={activeIndex < 0 ? undefined : rowDomId(activeIndex)}
        className="flex-1 overflow-auto outline-none"
      >
        {/* Trägt die volle Höhe aller Zeilen; ohne Rolle, damit die Zeilen
            unmittelbare Kinder des Baums bleiben. */}
        <div role="none" style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
          {rows.slice(first, last).map((row, offset) => {
            const index = first + offset;
            const node = row.node;
            const isPosition = node.kind === 'position';
            const selected = isPosition
              ? selectedPositionId === node.id
              : selectedNodeId === node.id;
            const count = isPosition ? undefined : (
              <>
                {matches.filtering && row.hits !== node.positionCount && (
                  <>
                    <span style={{ color: 'var(--blueD)' }}>{formatCount(row.hits)}</span>/
                  </>
                )}
                {formatCount(node.positionCount)}
              </>
            );

            return (
              <TreeRow
                key={node.id}
                id={rowDomId(index)}
                style={{
                  position: 'absolute',
                  top: index * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  boxSizing: 'border-box',
                }}
                active={index === activeIndex}
                posInSet={row.posInSet}
                setSize={row.setSize}
                code={nodeCode(node)}
                label={nodeTitle(node)}
                title={nodeTitle(node)}
                depth={row.depth}
                leaf={isPosition}
                open={row.open}
                selected={selected}
                dimmed={row.missed}
                status={isPosition ? <StatusPill status={POSITION_STATUS} dotOnly /> : undefined}
                count={count}
                onClick={() => selectRow(row)}
                onToggle={
                  row.hasChildren
                    ? () => {
                        setActiveId(node.id);
                        dispatch({ type: 'toggleExpanded', id: node.id });
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
