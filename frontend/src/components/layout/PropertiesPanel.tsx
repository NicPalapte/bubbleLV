// Rechte Spalte: Details des gewählten Knotens. Portiert aus `PropsPanel` in
// design/claude-design/lv-main.jsx; Bearbeiter/Aufgaben/Notizen/Vergabe entfallen
// (out of scope, docs/mvp-scope.md#out-of-scope).

import { Chip } from '../common/Chip';
import { Highlighted } from '../common/Highlighted';
import { PropField } from '../common/PropField';
import { Status } from '../common/Status';
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-grid px-[16px] py-[12px]">
      <div className="mb-[6px] font-mono text-[9px] tracking-[0.6px] text-mute">{title}</div>
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
      <div className="border-b border-line px-[16px] py-[14px]">
        <div className="mb-[5px] flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
            POSITION · OZ {position.oz}
          </span>
          <Status value={POSITION_STATUS} />
        </div>
        <div className="font-sans text-[15px] font-semibold leading-[1.3] text-ink">
          {position.shortText}
        </div>
        <div className="mt-[8px] flex flex-wrap gap-[5px]">
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
      </div>

      <div className="flex-1 overflow-auto">
        {position.longText !== '' && (
          <div className="border-b border-grid bg-panel px-[16px] py-[14px]">
            <div className="mb-[8px] flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-[0.6px] text-mute">LANGTEXT</span>
              <span className="font-mono text-[8px] text-mute">** = wichtig</span>
            </div>
            <div className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.55] text-ink">
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

        <Section title="MENGEN + PREISE">
          <div className="grid grid-cols-2 gap-x-[18px]">
            <PropField label="Einheit" value={position.unit ?? '—'} />
            <PropField label="Menge" value={formatNumber(position.quantity)} />
            <PropField label="EP" value={formatEuro(position.unitPrice)} />
            <PropField label="GP" value={formatEuro(total, 0)} />
          </div>
          <div className="mt-[8px] h-[3px] bg-grid">
            <div
              className="h-full"
              style={{ width: `${share}%`, background: 'linear-gradient(90deg,var(--blue),var(--cyan))' }}
            />
          </div>
          <div className="mt-[4px] text-[9px] tracking-[0.4px] text-mute">
            {share} % DES ABSCHNITTS
          </div>
        </Section>

        <Section title="KLASSIFIZIERUNG">
          {attributes.length === 0 && <div className="font-mono text-[10px] text-mute">—</div>}
          <div className="grid grid-cols-2 gap-x-[18px]">
            {attributes.map(([key, value]) => (
              <PropField key={key} label={attributeLabel(key)} value={value} />
            ))}
          </div>
          {meta !== null && (
            <div className="mt-[8px] font-mono text-[8.5px] text-mute">
              {meta.classifier} · Ruleset {meta.ruleset} · v{meta.version}
            </div>
          )}
        </Section>

        <Section title="METADATEN">
          <div className="grid grid-cols-2 gap-x-[18px]">
            <PropField label="OZ" value={position.oz} />
            <PropField label="Positionstyp" value={position.positionType} />
          </div>
        </Section>
      </div>
    </>
  );
}

function NodeDetails({ node }: { node: LVNode }) {
  const label = node.kind === 'lot' ? 'LOS' : node.kind === 'project' ? 'PROJEKT' : 'ABSCHNITT';
  const children = node.children.filter((child) => child.kind !== 'position');
  const positions = node.children.filter((child) => child.kind === 'position');
  const averagePrice = node.positionCount === 0 ? 0 : node.totalPrice / node.positionCount;

  return (
    <>
      <div className="border-b border-line px-[16px] py-[14px]">
        <div className="mb-[5px] flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
            {label}
            {node.code === '' ? '' : ` · ${node.code}`}
          </span>
        </div>
        <div className="font-sans text-[18px] font-semibold text-ink">
          {node.label ?? 'Ohne Bezeichnung'}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Section title="KENNZAHLEN">
          <div className="grid grid-cols-2 gap-x-[18px]">
            <PropField label="Unterknoten" value={formatCount(children.length)} />
            <PropField label="Direkte Positionen" value={formatCount(positions.length)} />
            <PropField label="Positionen gesamt" value={formatCount(node.positionCount)} />
            <PropField label="Gesamtpreis" value={formatEuro(node.totalPrice, 0)} />
            <PropField label="∅ GP je Position" value={formatEuro(averagePrice)} />
          </div>
        </Section>

        {children.length > 0 && (
          <Section title="UNTERKNOTEN">
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
          </Section>
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
          <div className="border-b border-line px-[16px] py-[18px]">
            <div className="font-mono text-[9px] tracking-[0.6px] text-mute">EIGENSCHAFTEN</div>
            <div className="mt-[4px] font-sans text-[14px] font-semibold text-ink">Übersicht</div>
          </div>
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
