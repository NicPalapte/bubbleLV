// Linke Hierarchie-Spalte — rekursiv über denselben LVNode-Baum wie der
// Bubble-Graph, filter- und suchbewusst. Portiert aus `Tree` in
// design/claude-design/lv-main.jsx (Analytik-Navigation entfällt, out of scope).

import { useMemo, useState } from 'react';
import { Status } from '../common/Status';
import { formatCount } from '../../lib/format';
import { POSITION_STATUS } from '../../lib/status';
import { isFiltering } from '../../lib/matchPos';
import { computeMatchCounts, matchCount, type MatchIndex } from '../../lib/tree/matchCounts';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

interface TreeProps {
  width: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const KIND_PREFIX: Record<string, string> = {
  lot: 'LOS',
  section: '§',
};

function nodeTitle(node: LVNode): string {
  if (node.label !== null && node.label !== '') return node.label;
  if (node.code !== '') return node.code;
  return node.kind === 'section' ? 'Ohne Bezeichnung' : 'Ohne Titel';
}

interface RowProps {
  node: LVNode;
  depth: number;
  index: MatchIndex;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}

function TreeRow({ node, depth, index, expanded, onToggle }: RowProps) {
  const { selectedNodeId, selectedPositionId, hideMode, parents } = useViewer();
  const dispatch = useViewerDispatch();

  const hits = matchCount(index, node);
  const missed = index.filtering && hits === 0;
  if (missed && hideMode === 'hide') return null;

  const isPosition = node.kind === 'position';
  const selected = isPosition ? selectedPositionId === node.id : selectedNodeId === node.id;
  const open = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  const select = (): void => {
    if (isPosition) {
      const parent = parents.get(node.id) ?? null;
      dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId: node.id });
    } else {
      dispatch({ type: 'selectNode', id: node.id });
      if (hasChildren) onToggle(node.id);
    }
  };

  return (
    <div style={{ opacity: missed ? 0.4 : 1 }}>
      <div
        onClick={select}
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={selected}
        aria-expanded={hasChildren ? open : undefined}
        className="flex cursor-pointer items-center gap-[6px] py-[5px] pr-[12px] font-mono"
        style={{
          paddingLeft: 8 + depth * 10,
          borderLeft: selected ? '2px solid var(--blue)' : '2px solid transparent',
          background: selected ? 'var(--blueS)' : 'transparent',
          color: selected ? 'var(--blueD)' : 'var(--ink)',
          fontSize: isPosition ? 10.5 : 11,
        }}
      >
        <span
          className="w-[10px] shrink-0 text-[9px] text-mute"
          onClick={(event) => {
            if (!hasChildren) return;
            event.stopPropagation();
            onToggle(node.id);
          }}
        >
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </span>
        {node.code !== '' && (
          <span className="shrink-0 text-[10px] text-mute">
            {KIND_PREFIX[node.kind] === undefined ? '' : `${KIND_PREFIX[node.kind]} `}
            {node.code}
          </span>
        )}
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ fontWeight: isPosition ? 400 : 500 }}
          title={nodeTitle(node)}
        >
          {nodeTitle(node)}
        </span>
        {isPosition ? (
          <Status value={POSITION_STATUS} dotOnly />
        ) : (
          <span className="min-w-[32px] shrink-0 text-right text-[9px] text-mute">
            {index.filtering && hits !== node.positionCount ? (
              <>
                <span className="text-blueD">{formatCount(hits)}</span>/
                {formatCount(node.positionCount)}
              </>
            ) : (
              formatCount(node.positionCount)
            )}
          </span>
        )}
      </div>
      {open &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            index={index}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

export function Tree({ width, collapsed, onToggleCollapsed }: TreeProps) {
  const { tree, lv, filters, search, hideMode } = useViewer();
  const dispatch = useViewerDispatch();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['project']));

  const index = useMemo<MatchIndex>(() => {
    if (tree === null) return { counts: new Map(), filtering: false };
    return computeMatchCounts(tree, filters, search, isFiltering(filters, search));
  }, [tree, filters, search]);

  // Bei aktiver Suche/Filterung die Pfade zu den Treffern automatisch öffnen.
  const effectiveExpanded = useMemo<Set<string>>(() => {
    if (tree === null) return expanded;
    if (!index.filtering) return expanded;
    const open = new Set(expanded);
    const visit = (node: LVNode): void => {
      if (node.kind === 'position') return;
      if ((index.counts.get(node.id) ?? 0) > 0) open.add(node.id);
      for (const child of node.children) visit(child);
    };
    visit(tree);
    return open;
  }, [tree, expanded, index]);

  const toggle = (id: string): void =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (collapsed) {
    return (
      <div className="flex w-[44px] shrink-0 flex-col overflow-hidden border-r border-line bg-white">
        <div
          onClick={onToggleCollapsed}
          title="Baum ausklappen"
          className="flex h-[42px] cursor-pointer items-center justify-center border-b border-line font-mono text-[15px] text-dim"
        >
          ›
        </div>
        <div className="flex-1" />
        <div className="py-[8px] text-center font-mono text-[8px] tracking-[1.2px] text-mute [writing-mode:vertical-rl]">
          STRUKTUR
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border-r border-line bg-white"
      style={{ width }}
    >
      <div className="border-b border-line bg-paper px-[12px] pb-[11px] pt-[10px]">
        <div className="mb-[5px] flex items-center justify-between">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.6px] text-mute">Projekt</span>
          <span
            onClick={onToggleCollapsed}
            title="Einklappen"
            className="cursor-pointer px-[2px] font-mono text-[13px] leading-none text-dim"
          >
            ‹
          </span>
        </div>
        <div
          onClick={() => dispatch({ type: 'selectNode', id: null })}
          className="-ml-[2px] cursor-pointer pl-[8px]"
        >
          <div className="overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[15px] font-bold text-ink">
            {lv?.projectName ?? lv?.fileName ?? 'Kein LV geladen'}
          </div>
          <div className="mt-[3px] font-mono text-[9px] text-mute">
            {tree === null
              ? 'Datei laden'
              : `Übersicht · ${formatCount(tree.positionCount)} Positionen`}
          </div>
        </div>
      </div>

      <div className="px-[12px] pb-[2px] pt-[8px] font-mono text-[9px] uppercase tracking-[0.6px] text-mute">
        Struktur
      </div>

      <div className="flex-1 overflow-auto py-[4px]" role="tree" aria-label="LV-Struktur">
        {tree === null && (
          <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
            Noch keine Struktur — GAEB-Datei laden.
          </div>
        )}
        {tree !== null &&
          tree.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={0}
              index={index}
              expanded={effectiveExpanded}
              onToggle={toggle}
            />
          ))}
        {tree !== null && index.filtering && matchCount(index, tree) === 0 && (
          <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
            Keine Position entspricht {hideMode === 'hide' ? 'den Filtern' : 'Suche/Filter'}.
          </div>
        )}
      </div>
    </div>
  );
}
