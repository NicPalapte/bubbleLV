// Karte für Abschnitt, Los oder Projekt — dieselben Bausteine wie die
// Positionskarte (CardParts.tsx): Kopf, Kennzahlen, Unterknoten.

import { CardHead, GroupPill, PropTable, Section, StatRow } from './CardParts';
import { formatCount, formatEuro } from '../../lib/format';
import { useViewer } from '../../state/viewer';
import type { ReactNode } from 'react';
import type { LVNode } from '../../types/lvNode';

export function NodeDetails({
  node,
  onClose,
  grip,
}: {
  node: LVNode;
  /** Nur die schwebende Karte im Graphen braucht eine Schließen-Schaltfläche. */
  onClose?: () => void;
  grip?: ReactNode;
}) {
  const { lv } = useViewer();
  const kind = node.kind === 'lot' ? 'Los' : node.kind === 'project' ? 'Projekt' : 'Abschnitt';
  const children = node.children.filter((child) => child.kind !== 'position');
  const positions = node.children.filter((child) => child.kind === 'position');
  const priced = (lv?.tree.totalPrice ?? 0) > 0;

  const rows: Array<readonly [string, string]> = [
    ['Unterknoten', formatCount(children.length)],
    ['Direkte Positionen', formatCount(positions.length)],
  ];
  if (priced && node.positionCount > 0) {
    rows.push(['∅ GP je Position', formatEuro(node.totalPrice / node.positionCount)]);
  }

  return (
    <>
      <CardHead
        grip={grip}
        meta={
          <>
            {node.code !== '' && (
              <span className="shrink-0 font-mono text-[11px] text-dim">{node.code}</span>
            )}
            <GroupPill color="var(--line2)">{kind}</GroupPill>
          </>
        }
        title={node.label ?? 'Ohne Bezeichnung'}
        onClose={onClose}
      />
      <StatRow
        stats={[
          { label: 'Positionen', value: formatCount(node.positionCount) },
          priced
            ? { label: 'Summe', value: formatEuro(node.totalPrice, 0) }
            : { label: 'Summe', value: '–', empty: true },
        ]}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-auto px-[16px] pb-[16px] pt-[14px]">
        <Section title="Kennzahlen">
          <PropTable rows={rows} />
        </Section>
        {children.length > 0 && (
          <Section title="Unterknoten">
            <ul className="m-0 flex list-none flex-col p-0">
              {children.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center gap-[8px] border-b border-line py-[6px] font-mono text-[10.5px] last:border-b-0"
                >
                  <span className="w-[52px] shrink-0 text-mute">{child.code}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {child.label ?? 'Ohne Bezeichnung'}
                  </span>
                  <span className="text-dim">{formatCount(child.positionCount)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
