// Kennzahlen-Kapsel oben links über dem Graphen. Jede Zahl ist ein Knopf: sie
// öffnet den Reiter im Seitenfenster, der sie erklärt.

import { useMemo } from 'react';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer, useViewerDispatch, type SidePanel } from '../../state/viewer';

function Kpi({
  value,
  label,
  panel,
  warn = false,
  marks = true,
}: {
  value: React.ReactNode;
  label: string;
  panel: SidePanel;
  warn?: boolean;
  /** Zeigt den offenen Reiter an; nur eine Zahl je Reiter tut das. */
  marks?: boolean;
}) {
  const { view } = useViewer();
  const dispatch = useViewerDispatch();
  const on = view.side === panel && marks;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => dispatch({ type: 'sidePanel', panel: view.side === panel ? null : panel })}
      className={`flex cursor-pointer flex-col items-start gap-[1px] rounded-[var(--r-md)] border-none px-[12px] py-[6px] text-left hover:bg-sunken ${
        on ? 'bg-blueS' : 'bg-transparent'
      }`}
    >
      <span
        className={`font-sans text-[17px] font-semibold leading-tight ${warn ? 'text-amber' : 'text-ink'}`}
      >
        {value}
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.6px] text-mute">{label}</span>
    </button>
  );
}

export function KpiCapsule() {
  const { lv, matches, hints } = useViewer();
  // `hints` lässt abgeschaltete Regeln schon weg (ViewerProvider).
  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );
  if (lv === null) return null;

  const root = lv.tree;
  const lots = root.children.length;
  const sections = root.children.reduce((total, lot) => total + lot.children.length, 0);
  const hits = matches.filtering ? (matches.counts.get(root.id) ?? 0) : root.positionCount;

  return (
    <div
      role="group"
      aria-label="Kennzahlen"
      className="ov-glass absolute left-[16px] top-[16px] z-[8] flex gap-[2px] p-[4px]"
    >
      <Kpi
        panel="overview"
        label={matches.filtering ? 'Treffer' : 'Positionen'}
        value={
          matches.filtering ? (
            <>
              {formatCount(hits)}{' '}
              <small className="font-mono text-[10px] font-normal text-mute">
                von {formatCount(root.positionCount)}
              </small>
            </>
          ) : (
            formatCount(hits)
          )
        }
      />
      <Kpi
        panel="overview"
        marks={false}
        label="Abschnitte"
        value={
          <>
            {formatCount(sections)}{' '}
            {lots > 1 && (
              <small className="font-mono text-[10px] font-normal text-mute">
                in {formatCount(lots)} Losen
              </small>
            )}
          </>
        }
      />
      <Kpi panel="check" label="Hinweise ⚠" value={formatCount(hintCount)} warn={hintCount > 0} />
    </div>
  );
}
