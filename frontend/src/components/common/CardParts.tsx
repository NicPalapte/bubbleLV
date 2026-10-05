// Bausteine der Positionskarte im Graphen (docs/decisions/0034-graph-als-hauptscreen.md):
// Kopf, Kennzahlenleiste, Abschnitt mit Überschrift und Eigenschaftstabelle.
// PositionDetails und NodeDetails setzen sich daraus zusammen.

import type { ReactNode } from 'react';

const CLOSE =
  'ml-auto inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

export function CardHead({
  grip,
  meta,
  title,
  onClose,
}: {
  /** Ziehgriff der schwebenden Karte; fehlt, wo nichts zu verschieben ist. */
  grip?: ReactNode;
  meta: ReactNode;
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-[8px] border-b border-line px-[16px] pb-[12px] pt-[12px]">
      <div className="flex min-w-0 items-center gap-[8px]">
        {grip}
        {meta}
        {onClose !== undefined && (
          <button type="button" onClick={onClose} aria-label="Karte schließen" className={CLOSE}>
            ✕
          </button>
        )}
      </div>
      <h2 className="m-0 font-sans text-[18px] font-semibold leading-[1.25] tracking-[-0.3px] text-ink">
        {title}
      </h2>
    </div>
  );
}

/** Abschnitts-/Gewerk-Pille im Kopf: Farbpunkt + Name. */
export function GroupPill({ color, children }: { color: string; children: string }) {
  return (
    <span
      title={children}
      className="inline-flex min-w-0 items-center gap-[6px] rounded-[var(--r-pill)] bg-sunken py-[2px] pl-[6px] pr-[8px] font-mono text-[10px] text-dim"
    >
      <span
        aria-hidden="true"
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface Stat {
  label: string;
  value: string;
  unit?: string;
  /** Kein Wert in der Datei — „–" in gedämpfter Farbe. */
  empty?: boolean;
}

export function StatRow({ stats }: { stats: readonly Stat[] }) {
  return (
    <div
      className="grid shrink-0 gap-[8px] border-b border-line px-[16px] py-[12px]"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <div className="font-mono text-[10px] text-mute">{stat.label}</div>
          <div
            className={`mt-[2px] truncate font-sans text-[15px] font-semibold ${
              stat.empty === true ? 'text-mute' : 'text-ink'
            }`}
            title={stat.value}
          >
            {stat.value}
            {stat.unit !== undefined && (
              <small className="ml-[3px] font-mono text-[10px] font-normal text-mute">
                {stat.unit}
              </small>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-[8px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <span className="font-mono text-[10px] text-mute">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Zweispaltige Eigenschaftstabelle mit Rahmen und Radius. */
export function PropTable({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  if (rows.length === 0) return <div className="font-mono text-[10.5px] text-mute">–</div>;
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] overflow-hidden rounded-[var(--r-md)] border border-line bg-surface">
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`} className="contents">
          <dt
            className={`bg-sunken px-[12px] py-[7px] font-mono text-[10.5px] text-mute ${
              index > 0 ? 'border-t border-line' : ''
            }`}
          >
            {label}
          </dt>
          <dd
            className={`m-0 min-w-0 break-words px-[12px] py-[7px] font-mono text-[10.5px] text-ink ${
              index > 0 ? 'border-t border-line' : ''
            }`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export const CARD_BUTTON =
  'inline-flex h-[30px] cursor-pointer items-center rounded-[var(--r-sm)] border border-line bg-surface px-[12px] font-mono text-[10.5px] text-ink hover:border-line2 focus-visible:border-blue';
