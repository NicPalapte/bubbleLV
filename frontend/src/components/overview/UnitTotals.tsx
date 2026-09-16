// Mengen je Einheit, absteigend (WP-L, Schritt 3). Bewusst keine Gesamtsumme
// über alle Einheiten: m³ und Stück zusammenzuzählen wäre eine Scheinzahl.
//
// Zusammengeführt wird nach demselben Schlüssel wie im Filter (lib/units.ts) —
// „psch" und „PSCH" stehen also in einer Zeile. Ein Klick filtert.

import { formatCount, formatNumber, formatPositions } from '../../lib/format';
import type { UnitTotal } from '../../lib/overview/model';

/** Mehr Zeilen liest niemand mehr ab; der Rest steht als Zusatz darunter. */
const MAX_ROWS = 10;

export function UnitTotals({
  units,
  active,
  onPick,
}: {
  units: readonly UnitTotal[];
  active: ReadonlySet<string>;
  onPick: (key: string) => void;
}) {
  if (units.length === 0) {
    return (
      <p className="font-mono text-[10px] text-mute">
        Keine Mengen im aktuellen Filter — die Datei führt hier keine.
      </p>
    );
  }

  const rows = units.slice(0, MAX_ROWS);
  const max = rows[0].quantity;

  return (
    <div role="list" aria-label="Mengen je Einheit">
      {rows.map((unit) => (
        <button
          key={unit.key}
          type="button"
          role="listitem"
          onClick={() => onPick(unit.key)}
          title={`${formatPositions(unit.count)} — klicken filtert nach ${unit.label}`}
          className="flex w-full cursor-pointer items-baseline gap-[8px] border-none border-b border-solid border-grid bg-transparent px-0 py-[5px] text-left"
        >
          <span
            className="w-[52px] shrink-0 truncate font-mono text-[10px]"
            style={{ color: active.has(unit.key) ? 'var(--blueD)' : 'var(--dim)' }}
          >
            {unit.label}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block h-[6px]"
              style={{
                width: `${max > 0 ? Math.max(1, (unit.quantity / max) * 100) : 0}%`,
                background: active.has(unit.key) ? 'var(--blue)' : 'var(--line2)',
              }}
            />
          </span>
          <span className="w-[110px] shrink-0 text-right font-mono text-[10px] text-ink">
            {formatNumber(unit.quantity, 0)}
          </span>
          <span className="w-[70px] shrink-0 text-right font-mono text-[9.5px] text-mute">
            {formatCount(unit.count)} Pos.
          </span>
        </button>
      ))}
      {units.length > rows.length && (
        <p className="mt-[6px] font-mono text-[9.5px] text-mute">
          {formatCount(units.length - rows.length)} weitere Einheiten
        </p>
      )}
    </div>
  );
}
