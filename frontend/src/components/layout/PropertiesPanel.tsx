// Rechte Spalte: Details des gewählten Knotens. Portiert aus `PropsPanel` in
// design/claude-design/lv-main.jsx; Kopf, Blocklabels und Feldraster sind die
// Design-System-Bausteine. Bearbeiter/Aufgaben/Notizen/Vergabe entfallen
// (out of scope, docs/mvp-scope.md#out-of-scope).

import type { ReactNode } from 'react';
import { Highlighted } from '../common/Highlighted';
import { BlockLabel, PanelHeader } from '../ui/PanelHeader';
import { Chip } from '../ui/Chip';
import { PropField, PropGrid } from '../ui/PropField';
import { StatusPill } from '../ui/StatusPill';
import { attrMeta, attrStrings, displayAttributes } from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber } from '../../lib/format';
import { POSITION_STATUS } from '../../lib/status';
import { useViewer } from '../../state/viewer';
import type { LVNode, PositionSummary } from '../../types/lvNode';

const ATTRIBUTE_LABELS: Record<string, string> = {
  positionsart: 'Positionsart',
  gewerk: 'Gewerk',
  gewerkLb: 'Leistungsbereich (STLB-Bau)',
  bauteiltyp: 'Bauteiltyp',
  beton: 'Druckfestigkeit',
  expo: 'Expositionsklassen',
  feuchtigkeitsklasse: 'Feuchtigkeitsklasse',
  tragend: 'Tragend',
  dicke: 'Dicke',
  hoehe: 'Höhe',
  steinart: 'Steinart',
  keywords: 'Besonderheiten',
  qualifikation: 'Qualifikation',
  zeiteinheit: 'Zeiteinheit',
  planungsart: 'Planungsart',
  einrichtungsart: 'Art der Einrichtung',
};

function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key;
}

function Block({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ padding: 'var(--pad-panel-block)', borderBottom: '1px solid var(--grid)' }}>
      <BlockLabel right={right}>{title}</BlockLabel>
      {children}
    </div>
  );
}

function PositionDetails({ node, position }: { node: LVNode; position: PositionSummary }) {
  const { search, parents } = useViewer();
  const parent = parents.get(node.id) ?? null;
  const total = node.totalPrice;
  const share =
    parent !== null && parent.totalPrice > 0 ? Math.round((total / parent.totalPrice) * 100) : 0;

  const positionsart = FACETS_BY_ID.get('positionsart');
  const meta = attrMeta(position.attributes);
  const expo = attrStrings(position.attributes, 'expo');
  const keywords = attrStrings(position.attributes, 'keywords');
  const attributes = displayAttributes(position);

  return (
    <>
      <PanelHeader
        eyebrow={`Position · OZ ${position.oz}`}
        title={position.shortText}
        size={15}
        right={<StatusPill status={POSITION_STATUS} />}
      />

      <div className="flex-1 overflow-auto">
        {(positionsart !== undefined || expo.length > 0) && (
          <div
            style={{ padding: 'var(--pad-panel-block)', borderBottom: '1px solid var(--grid)' }}
            className="flex flex-wrap gap-[5px]"
          >
            {positionsart !== undefined &&
              positionsart.get(position).map((value) => (
                <Chip key={value} on>
                  {facetOptionLabel(positionsart, value)}
                </Chip>
              ))}
            {expo.map((value) => (
              <Chip key={value}>{value}</Chip>
            ))}
          </div>
        )}

        {position.longText !== '' && (
          <div
            style={{ padding: 'var(--pad-panel-head)', borderBottom: '1px solid var(--grid)' }}
            className="bg-panel"
          >
            <BlockLabel right="** = wichtig">Langtext</BlockLabel>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'var(--fs-prose)',
                lineHeight: 'var(--lh-prose)',
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Highlighted text={position.longText} query={search} />
            </div>
            {keywords.length > 0 && (
              <div className="mt-[10px] flex flex-wrap gap-[4px]">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="border border-line2 bg-white px-[7px] py-[2px] font-mono text-[9px] text-dim"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <Block title="Mengen + Preise">
          <PropGrid>
            <PropField label="Einheit" value={position.unit ?? '—'} />
            <PropField label="Menge" value={formatNumber(position.quantity)} />
            <PropField label="EP" value={formatEuro(position.unitPrice)} />
            <PropField label="GP" value={formatEuro(total, 0)} />
          </PropGrid>
          <div className="mt-[8px] h-[3px] bg-grid">
            <div
              className="h-full"
              style={{
                width: `${share}%`,
                background: 'linear-gradient(90deg,var(--blue),var(--cyan))',
              }}
            />
          </div>
          <div className="mt-[4px] text-[9px] tracking-[0.4px] text-mute">
            {share} % DES ABSCHNITTS
          </div>
        </Block>

        <Block title="Klassifizierung">
          {attributes.length === 0 && <div className="font-mono text-[10px] text-mute">—</div>}
          <PropGrid>
            {attributes.map(([key, value]) => (
              <PropField key={key} label={attributeLabel(key)} value={value} />
            ))}
          </PropGrid>
          {meta !== null && (
            <div className="mt-[8px] font-mono text-[8.5px] text-mute">
              {meta.classifier} · Ruleset {meta.ruleset} · v{meta.version}
            </div>
          )}
        </Block>

        <Block title="Metadaten">
          <PropGrid>
            <PropField label="OZ" value={position.oz} />
            <PropField label="Positionstyp" value={position.positionType} />
          </PropGrid>
        </Block>
      </div>
    </>
  );
}

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
