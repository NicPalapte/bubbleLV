// Rechte Spalte: Details des gewählten Knotens. Portiert aus `PropsPanel` in
// design/claude-design/lv-main.jsx; Kopf, Blocklabels und Feldraster sind die
// Design-System-Bausteine. Bearbeiter/Aufgaben/Notizen/Vergabe entfallen
// (out of scope, docs/mvp-scope.md#out-of-scope).

import { NodeDetails } from '../common/NodeDetails';
import { PositionDetails } from '../common/PositionDetails';
import { PanelHeader } from '../ui/PanelHeader';
import { useViewer } from '../../state/viewer';

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
