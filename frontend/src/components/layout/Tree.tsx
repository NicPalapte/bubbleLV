// Linke Hierarchie-Spalte — rekursiv über denselben LVNode-Baum wie der
// Bubble-Graph, filter- und suchbewusst. Aufklapp-Zustand und Trefferzahlen
// kommen aus dem Viewer-State, damit Baum und Graph gleich stehen (Issue #18).
// Portiert aus `Tree` in
// design/claude-design/lv-main.jsx (Analytik-Navigation entfällt, out of scope);
// die Zeile selbst ist der Design-System-Baustein `TreeRow`.

import { StatusPill } from '../ui/StatusPill';
import { TreeRow } from '../ui/TreeRow';
import { formatCount } from '../../lib/format';
import { POSITION_STATUS } from '../../lib/status';
import { matchCount, type MatchIndex } from '../../lib/tree/matchCounts';
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

function nodeCode(node: LVNode): string {
  if (node.code === '') return '';
  const prefix = KIND_PREFIX[node.kind];
  return prefix === undefined ? node.code : `${prefix} ${node.code}`;
}

interface RowProps {
  node: LVNode;
  depth: number;
  index: MatchIndex;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function TreeBranch({ node, depth, index, expanded, onToggle }: RowProps) {
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
      // Die Baumzeile ist Navigation — sie führt weiter in die Tabelle und
      // klappt den Knoten auf. Zugeklappt wird nur über das Dreieck, sonst
      // verschwände beim Anklicken genau das, was man sehen will.
      dispatch({ type: 'selectNode', id: node.id, open: true });
      if (hasChildren) dispatch({ type: 'toggleExpanded', id: node.id, open: true });
    }
  };

  const count = isPosition ? undefined : index.filtering && hits !== node.positionCount ? (
    <>
      <span style={{ color: 'var(--blueD)' }}>{formatCount(hits)}</span>/
      {formatCount(node.positionCount)}
    </>
  ) : (
    formatCount(node.positionCount)
  );

  return (
    <div>
      <TreeRow
        code={nodeCode(node)}
        label={nodeTitle(node)}
        title={nodeTitle(node)}
        depth={depth}
        leaf={isPosition}
        open={open}
        selected={selected}
        dimmed={missed}
        status={isPosition ? <StatusPill status={POSITION_STATUS} dotOnly /> : undefined}
        count={count}
        onClick={select}
        onToggle={hasChildren ? () => onToggle(node.id) : undefined}
      />
      {open &&
        node.children.map((child) => (
          <TreeBranch
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
  const { tree, lv, hideMode, matches: index, openNodes } = useViewer();
  const dispatch = useViewerDispatch();

  const toggle = (id: string): void => dispatch({ type: 'toggleExpanded', id });

  if (collapsed) {
    return (
      <div
        className="flex shrink-0 flex-col overflow-hidden border-r border-line bg-white"
        style={{ width: 'var(--w-tree-collapsed)' }}
      >
        <div
          onClick={onToggleCollapsed}
          title="Baum ausklappen"
          className="flex cursor-pointer items-center justify-center border-b border-line font-mono text-[15px] text-dim"
          style={{ height: 'var(--h-view-head)' }}
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
          <span className="font-mono text-[8.5px] uppercase tracking-[0.6px] text-mute">
            Projekt
          </span>
          <span
            onClick={onToggleCollapsed}
            title="Einklappen"
            className="cursor-pointer px-[2px] font-mono text-[13px] leading-none text-dim"
          >
            ‹
          </span>
        </div>
        <div
          onClick={() => {
            dispatch({ type: 'selectNode', id: null });
            // Die Projektzeile trägt kein Dreieck — sie ist der Weg zurück,
            // wenn die Projekt-Bubble im Graphen zugeklappt wurde.
            if (tree !== null) dispatch({ type: 'toggleExpanded', id: tree.id, open: true });
          }}
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
        {tree !== null && !openNodes.has(tree.id) && (
          <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
            Projekt zugeklappt — Projektzeile oben öffnet die Struktur.
          </div>
        )}
        {tree !== null &&
          openNodes.has(tree.id) &&
          tree.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={0}
              index={index}
              expanded={openNodes}
              onToggle={toggle}
            />
          ))}
        {tree !== null &&
          openNodes.has(tree.id) &&
          index.filtering &&
          matchCount(index, tree) === 0 && (
            <div className="px-[12px] py-[10px] font-mono text-[10px] text-mute">
              Keine Position entspricht {hideMode === 'hide' ? 'den Filtern' : 'Suche/Filter'}.
            </div>
          )}
      </div>
    </div>
  );
}
