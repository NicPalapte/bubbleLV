// Rechte Spalte: Details des gewählten Knotens. Portiert aus `PropsPanel` in
// design/claude-design/lv-main.jsx; Kopf, Blocklabels und Feldraster sind die
// Design-System-Bausteine. Bearbeiter/Aufgaben/Notizen/Vergabe entfallen
// (out of scope, docs/mvp-scope.md#out-of-scope).

import { Block, PositionDetails } from '../common/PositionDetails';
import { PanelHeader } from '../ui/PanelHeader';
import { PropField, PropGrid } from '../ui/PropField';
import { formatCount, formatEuro } from '../../lib/format';
import { useViewer } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

function NodeDetails({ node }: { node: LVNode }) {
  const eyebrow = node.kind === 'lot' ? 'Los' : node.kind === 'project' ? 'Projekt' : 'Abschnitt';
  const children = node.children.filter((child) => child.kind !== 'position');
  const positions = node.children.filter((child) => child.kind === 'position');
  const averagePrice = node.positionCount === 0 ? 0 : node.totalPrice / node.positionCount;

  return (
    <>
      <PanelHeader
        eyebrow={node.code === '' ? eyebrow : `${eyebrow} · ${node.code}`}
        title={node.label ?? 'Ohne Bezeichnung'}
      />

      <div className="flex-1 overflow-auto">
        <Block title="Kennzahlen">
          <PropGrid>
            <PropField label="Unterknoten" value={formatCount(children.length)} />
            <PropField label="Direkte Positionen" value={formatCount(positions.length)} />
            <PropField label="Positionen gesamt" value={formatCount(node.positionCount)} />
            <PropField label="Gesamtpreis" value={formatEuro(node.totalPrice, 0)} />
            <PropField label="∅ GP je Position" value={formatEuro(averagePrice)} />
          </PropGrid>
        </Block>

        {children.length > 0 && (
          <Block title="Unterknoten">
            {children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-[8px] border-b border-grid py-[5px] font-mono text-[10.5px]"
              >
                <span className="w-[52px] shrink-0 text-mute">{child.code}</span>
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-ink">
                  {child.label ?? 'Ohne Bezeichnung'}
                </span>
                <span className="text-dim">{formatCount(child.positionCount)}</span>
              </div>
            ))}
          </Block>
        )}
      </div>
    </>
  );
}

export function PropertiesPanel({ width }: { width: number }) {
  const { lv, tree, selectedNode, selectedPosition, hoveredNodeId, nodes } = useViewer();

  // Hover auf einer Bubble zeigt eine Vorschau; Klick-Auswahl hat Vorrang.
  const hovered = hoveredNodeId === null ? null : (nodes.get(hoveredNodeId) ?? null);
  const target = selectedPosition ?? (selectedNode === null ? hovered : selectedNode) ?? tree;

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border-l border-line bg-white"
      style={{ width }}
    >
      {target === null || lv === null ? (
        <>
          <PanelHeader eyebrow="Eigenschaften" title="Übersicht" size={14} />
          <div className="px-[16px] py-[14px] text-[11px] leading-[1.6] text-mute">
            GAEB-Datei laden, dann eine Bubble oder Position auswählen.
          </div>
        </>
      ) : target.position !== null ? (
        <PositionDetails node={target} position={target.position} />
      ) : (
        <NodeDetails node={target} />
      )}
    </div>
  );
}
