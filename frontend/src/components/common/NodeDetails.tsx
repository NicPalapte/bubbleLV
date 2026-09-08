// Abschnitts-/Los-/Projektdetails — dieselben Design-System-Bausteine wie
// PositionDetails. Eigenständige Datei, damit sowohl das Eigenschaften-Panel
// (Tabellenansicht) als auch die schwebende Auswahlkarte im Graphen (Issue #30)
// dieselbe Darstellung nutzen, statt sie zu duplizieren. Ursprünglich Teil von
// `PropertiesPanel.tsx`.

import { Block } from './PositionDetails';
import { PanelHeader } from '../ui/PanelHeader';
import { PropField, PropGrid } from '../ui/PropField';
import { formatCount, formatEuro } from '../../lib/format';
import type { LVNode } from '../../types/lvNode';

export function NodeDetails({
  node,
  onClose,
}: {
  node: LVNode;
  /** Nur die schwebende Karte im Graphen (Issue #30) braucht eine Schließen-Schaltfläche. */
  onClose?: () => void;
}) {
  const eyebrow = node.kind === 'lot' ? 'Los' : node.kind === 'project' ? 'Projekt' : 'Abschnitt';
  const children = node.children.filter((child) => child.kind !== 'position');
  const positions = node.children.filter((child) => child.kind === 'position');
  const averagePrice = node.positionCount === 0 ? 0 : node.totalPrice / node.positionCount;

  return (
    <>
      <PanelHeader
        eyebrow={node.code === '' ? eyebrow : `${eyebrow} · ${node.code}`}
        title={node.label ?? 'Ohne Bezeichnung'}
        right={
          onClose === undefined ? undefined : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Karte schließen"
              className="cursor-pointer border-none bg-transparent px-[2px] font-mono text-[13px] leading-none text-dim"
            >
              ✕
            </button>
          )
        }
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
