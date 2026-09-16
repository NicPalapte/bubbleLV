// Pareto: welcher Anteil der Positionen trägt 80 % der Summe (WP-L, Schritt 3).
// Die Antwort sagt, wo sich Prüfen lohnt — bei ein paar Positionen oder überall.
//
// Ohne Preise gibt es nichts zu ordnen. Dann steht das hier ausdrücklich, statt
// eine Kurve aus Nullwerten zu zeichnen (WP-L, Schritt 4).

import { formatCount } from '../../lib/format';
import type { ParetoModel } from '../../lib/overview/model';

/** Zeichenfläche in Nutzerkoordinaten; der Rahmen skaliert sie. */
const W = 100;
const H = 46;

function pathOf(curve: ParetoModel['curve']): string {
  return curve
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${(point.x * W).toFixed(2)} ${((1 - point.y) * H).toFixed(2)}`,
    )
    .join(' ');
}

export function ParetoCard({ pareto }: { pareto: ParetoModel | null }) {
  if (pareto === null) {
    return (
      <p className="font-sans text-[11.5px] leading-[1.5] text-dim">
        Ohne Preise lässt sich keine Rangfolge nach Summe bilden — diese Datei führt keine. Die
        Mengen je Einheit daneben tragen dann die Aussage.
      </p>
    );
  }

  const percent = (pareto.share * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return (
    <>
      <p className="font-sans text-[13px] text-ink">
        <span className="font-semibold">{formatCount(pareto.positions)}</span> Positionen ({percent}{' '}
        %) tragen 80 % der Summe
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Pareto-Kurve: ${percent} Prozent der Positionen tragen 80 Prozent der Summe`}
        className="mt-[8px] h-[120px] w-full border border-grid bg-panel"
      >
        {/* 80-%-Marke: waagerecht die Summe, senkrecht der abgelesene Anteil. */}
        <line
          x1="0"
          y1={H * 0.2}
          x2={W}
          y2={H * 0.2}
          stroke="var(--line)"
          strokeWidth="0.4"
          strokeDasharray="1.5 1.5"
        />
        <line
          x1={pareto.share * W}
          y1="0"
          x2={pareto.share * W}
          y2={H}
          stroke="var(--blue)"
          strokeWidth="0.4"
        />
        <path d={pathOf(pareto.curve)} fill="none" stroke="var(--ink)" strokeWidth="0.8" />
      </svg>
      <p className="mt-[4px] font-mono text-[9.5px] text-mute">
        waagerecht: Anteil der Positionen · senkrecht: kumulierte Summe
      </p>
    </>
  );
}
