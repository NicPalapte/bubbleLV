// Eine Gruppe ähnlicher Positionen (WP-M, Schritt 5).
//
// Die Karte beantwortet drei Fragen in dieser Reihenfolge: Wie groß ist die
// Gruppe? Was haben ihre Positionen gemeinsam? Und was hält sie auseinander?
// Erst danach kommen die Mitglieder — sie sind der Beleg, nicht die Aussage.
//
// Zahlen stehen immer mit ihrer Bezugsgröße da: „18,50 €" allein ist keine
// Erkenntnis, „18,50 € gegen einen Median von 12,00 €" schon.

import { Chip } from '../ui/Chip';
import { attributeLabel } from '../../lib/attributes';
import { formatEuro, formatNumber, truncate } from '../../lib/format';
import { spread } from '../../lib/relate';
import type { Cluster, Outlier, ValueStats } from '../../lib/relate';
import type { LVNode } from '../../types/lvNode';

/** Eine Gruppe, auf die im aktuellen Filter sichtbaren Mitglieder gekürzt. */
export interface VisibleCluster {
  cluster: Cluster;
  members: LVNode[];
}

/** Mehr Merkmals-Chips als das liest niemand ab; der Rest steht als Zahl da. */
const MAX_CHIPS = 6;

function statsLine(label: string, stats: ValueStats, unit: string | null): string {
  const format = (value: number): string =>
    unit === null ? formatEuro(value) : `${formatNumber(value)} ${unit}`;
  return `${label} ${format(stats.median)} · von ${format(stats.min)} bis ${format(stats.max)}`;
}

function OutlierNote({ outlier, unit }: { outlier: Outlier; unit: string | null }) {
  const wert = outlier.field === 'ep' ? formatEuro(outlier.value) : formatNumber(outlier.value);
  const median = outlier.field === 'ep' ? formatEuro(outlier.median) : formatNumber(outlier.median);
  const feld = outlier.field === 'ep' ? 'Einheitspreis' : 'Menge';
  const suffix = outlier.field === 'ep' || unit === null ? '' : ` ${unit}`;
  return (
    <span className="font-mono text-[9.5px]" style={{ color: 'var(--amber)' }}>
      {feld} {wert}
      {suffix} · {outlier.direction === 'hoch' ? 'über' : 'unter'} dem Erwartungsbereich (Median{' '}
      {median}
      {suffix})
    </span>
  );
}

function MemberRow({
  node,
  outliers,
  unit,
  onJump,
}: {
  node: LVNode;
  outliers: readonly Outlier[];
  unit: string | null;
  onJump: () => void;
}) {
  const position = node.position;
  if (position === null) return null;
  return (
    <div className="border-b border-solid border-grid py-[5px]">
      <button
        type="button"
        onClick={onJump}
        className="flex w-full cursor-pointer items-baseline gap-[10px] border-none bg-transparent px-0 text-left"
      >
        <span className="w-[110px] shrink-0 font-mono text-[10px] text-dim">{position.oz}</span>
        <span className="min-w-0 flex-1 truncate font-sans text-[11.5px] text-ink">
          {position.shortText}
        </span>
        <span className="w-[90px] shrink-0 text-right font-mono text-[10px] text-mute">
          {formatNumber(position.quantity)} {position.unit ?? ''}
        </span>
        <span className="w-[90px] shrink-0 text-right font-mono text-[10px] text-mute">
          {formatEuro(position.unitPrice)}
        </span>
      </button>
      {outliers.map((outlier) => (
        <div key={`${outlier.field}-${outlier.positionId}`} className="pl-[120px]">
          <OutlierNote outlier={outlier} unit={unit} />
        </div>
      ))}
    </div>
  );
}

export function ClusterCard({
  entry,
  open,
  onToggle,
  onJump,
}: {
  entry: VisibleCluster;
  open: boolean;
  onToggle: () => void;
  onJump: (positionId: string) => void;
}) {
  const { cluster, members } = entry;
  const unit = members[0]?.position?.unit ?? null;

  // Ausreißer nur für Mitglieder zeigen, die der Filter durchlässt — sonst
  // stünde hier ein Hinweis auf eine Position, die nirgends sonst zu sehen ist.
  const sichtbar = new Set(members.map((node) => node.id));
  const ausreisser = cluster.ausreisser.filter((outlier) => sichtbar.has(outlier.positionId));

  const gemeinsam = Object.entries(cluster.gemeinsameMerkmale);
  const preisStreuung = cluster.unitPrice === null ? null : spread(cluster.unitPrice);

  return (
    <section className="border-b border-grid py-[12px]">
      <div className="flex flex-wrap items-baseline gap-[8px]">
        <button
          type="button"
          onClick={onToggle}
          className="cursor-pointer border-none bg-transparent p-0 text-left font-sans text-[13px] font-semibold text-ink"
        >
          {truncate(cluster.label, 90)}
          <span aria-hidden="true" className="ml-[6px] font-mono text-[10px] text-mute">
            {open ? '▾' : '▸'}
          </span>
        </button>
        <Chip static on>
          {members.length} Positionen
        </Chip>
        <span className="font-mono text-[9.5px] text-mute">
          Ähnlichkeit {Math.round(cluster.similarity * 100)} %
        </span>
        {ausreisser.length > 0 && (
          <span className="font-mono text-[9.5px]" style={{ color: 'var(--amber)' }}>
            {ausreisser.length} Ausreißer
          </span>
        )}
      </div>

      {cluster.unitPrice !== null && (
        <p className="mt-[4px] font-mono text-[10px] text-dim">
          {statsLine('Einheitspreis · Median', cluster.unitPrice, null)}
          {preisStreuung !== null && preisStreuung > 0 && (
            <span className="text-mute"> · Streuung {Math.round(preisStreuung * 100)} %</span>
          )}
        </p>
      )}
      {cluster.unitPrice === null && cluster.quantity !== null && (
        <p className="mt-[4px] font-mono text-[10px] text-dim">
          {statsLine('Menge · Median', cluster.quantity, unit)}
          <span className="text-mute"> · keine Preise in der Datei</span>
        </p>
      )}

      {gemeinsam.length > 0 && (
        <div className="mt-[6px] flex flex-wrap items-center gap-[5px]">
          <span className="font-mono text-[8px] tracking-[0.6px] text-mute">GEMEINSAM</span>
          {gemeinsam.slice(0, MAX_CHIPS).map(([key, value]) => (
            <Chip key={key} static title={attributeLabel(key)}>
              {attributeLabel(key)}: {truncate(value, 40)}
            </Chip>
          ))}
          {gemeinsam.length > MAX_CHIPS && (
            <span className="font-mono text-[9.5px] text-mute">
              +{gemeinsam.length - MAX_CHIPS} weitere
            </span>
          )}
        </div>
      )}

      {cluster.unterscheidendeMerkmale.length > 0 && (
        <div className="mt-[4px] flex flex-wrap items-center gap-[5px]">
          <span className="font-mono text-[8px] tracking-[0.6px] text-mute">UNTERSCHIEDLICH</span>
          {cluster.unterscheidendeMerkmale.map((key) => (
            <Chip key={key} static dashed>
              {attributeLabel(key)}
            </Chip>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-[8px] border-t border-grid">
          {members.map((node) => (
            <MemberRow
              key={node.id}
              node={node}
              outliers={ausreisser.filter((outlier) => outlier.positionId === node.id)}
              unit={unit}
              onJump={() => onJump(node.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
