// „Größte Mengen" — für LVs ohne Preise (x83) an der Stelle der Pareto-Kurve.
// Je Einheit die Positionen mit der größten Menge: dort steckt bei einer
// Leistungsbeschreibung ohne Preise der Aufwand. Einheiten werden nie gemischt —
// 300 m² und 12 m³ in eine Rangfolge zu bringen, wäre eine Scheinaussage.
//
// Die gewählte Einheit ist reiner Anzeigezustand dieser Karte (useState),
// kein Filter; ein Klick auf eine Zeile wählt die Position an.

import { useState } from 'react';
import { ChipGroup, ValueChip } from '../ui/ValueChip';
import { formatNumber } from '../../lib/format';
import type { LargestByUnit } from '../../lib/overview/model';

/** Mehr Einheiten als Knöpfe liest niemand mehr ab; die häufigsten zuerst. */
const MAX_UNITS = 6;

export function LargestQuantities({
  units,
  selectedId,
  onPick,
}: {
  units: readonly LargestByUnit[];
  selectedId: string | null;
  onPick: (nodeId: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (units.length === 0) {
    return <p className="font-mono text-[10px] text-mute">Keine Mengen im aktuellen Filter.</p>;
  }

  const shown = units.slice(0, MAX_UNITS);
  // Fällt die gewählte Einheit aus dem Filter, gilt wieder die häufigste.
  const unit = shown.find((entry) => entry.key === chosen) ?? shown[0];
  const max = unit.items[0]?.quantity ?? 0;

  return (
    <>
      <ChipGroup label="Einheit" radio>
        {shown.map((entry) => (
          <ValueChip
            key={entry.key}
            kind="radio"
            on={entry.key === unit.key}
            count={entry.count}
            onClick={() => setChosen(entry.key)}
          >
            {entry.label}
          </ValueChip>
        ))}
      </ChipGroup>
      <div role="list" aria-label={`Größte Mengen in ${unit.label}`} className="mt-[8px]">
        {unit.items.map((item) => (
          <button
            key={item.nodeId}
            type="button"
            role="listitem"
            onClick={() => onPick(item.nodeId)}
            title={`${item.oz} · ${item.shortText}`}
            className="flex w-full cursor-pointer items-baseline gap-[8px] border-none border-b border-solid border-grid bg-transparent px-0 py-[4px] text-left"
          >
            <span
              className="w-[92px] shrink-0 truncate font-mono text-[9.5px]"
              style={{ color: item.nodeId === selectedId ? 'var(--blueD)' : 'var(--dim)' }}
            >
              {item.oz}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-[11.5px] text-ink">
                {item.shortText}
              </span>
              <span
                className="mt-[2px] block h-[4px]"
                style={{
                  width: `${max > 0 ? Math.max(1, (item.quantity / max) * 100) : 0}%`,
                  background: item.nodeId === selectedId ? 'var(--blue)' : 'var(--line2)',
                }}
              />
            </span>
            {/* Die Einheit steht schon auf dem gewählten Knopf. */}
            <span className="shrink-0 whitespace-nowrap text-right font-mono text-[10px] text-ink">
              {formatNumber(item.quantity)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
