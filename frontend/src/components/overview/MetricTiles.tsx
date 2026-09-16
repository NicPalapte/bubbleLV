// Kennzahlen des Überblicks (WP-L, Schritt 3). Fünf Kacheln, mehr trägt kein
// erster Blick.
//
// **Ohne Preise in der Datei** steht das ausdrücklich in der Geld-Kachel statt
// „0 €" (WP-L, Schritt 4): eine Null wäre eine Aussage über das LV, die die
// Datei gar nicht macht. Die Mengen-Kachel tritt dann an ihre Stelle.

import { formatCount, formatEuro, formatPositions } from '../../lib/format';
import type { OverviewMetrics } from '../../lib/overview/model';

function percent(share: number): string {
  return `${(share * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0 flex-1 border border-line bg-white px-[12px] py-[10px]">
      <div className="font-mono text-[9px] uppercase tracking-[0.6px] text-mute">{label}</div>
      <div className="mt-[3px] truncate font-sans text-[18px] font-semibold text-ink" title={value}>
        {value}
      </div>
      <div className="mt-[2px] truncate font-mono text-[9.5px] text-mute" title={note}>
        {note}
      </div>
    </div>
  );
}

export function MetricTiles({ metrics, flags }: { metrics: OverviewMetrics; flags: number }) {
  const gefiltert = metrics.filtering;
  return (
    <div className="flex flex-wrap gap-[8px]">
      <Tile
        label="Positionen"
        value={formatCount(metrics.positions)}
        note={gefiltert ? `von ${formatCount(metrics.totalPositions)} im LV` : 'im ganzen LV'}
      />
      {metrics.hasPrices ? (
        <Tile
          label="Summe"
          value={formatEuro(metrics.totalPrice, 0)}
          note={gefiltert ? 'der gefilterten Positionen' : 'Menge × EP über alle Positionen'}
        />
      ) : (
        <Tile
          label="Summe"
          value="keine Preise"
          note="Diese Datei führt keine Preise — die Mengen tragen die Aussage."
        />
      )}
      <Tile
        label="Gewerke"
        value={formatCount(metrics.gewerke)}
        note="verschiedene Leistungsbereiche"
      />
      {metrics.hasPrices ? (
        <Tile
          label="Ohne Preis"
          value={percent(metrics.withoutPriceShare)}
          note={`${formatPositions(metrics.withoutPrice)} ohne EP`}
        />
      ) : (
        <Tile
          label="Ohne Menge"
          value={percent(metrics.withoutQuantityShare)}
          note={`${formatPositions(metrics.withoutQuantity)} ohne Menge`}
        />
      )}
      <Tile
        label="Hinweise"
        value={formatCount(flags)}
        note="aus den aktiven Prüfregeln — Hinweis, kein Urteil"
      />
    </div>
  );
}
