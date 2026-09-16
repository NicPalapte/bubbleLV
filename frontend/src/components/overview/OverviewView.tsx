// Ansicht „Überblick" (WP-L, Schritt 3) — die Eingangsansicht: Kennzahlen,
// Treemap nach Gewerk und Abschnitt, Pareto und Mengen je Einheit.
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gerechnet wird
// über der gefilterten Menge, dieselbe, die Tabelle und Graph zeigen. Ohne
// Filter stimmen die Zahlen mit den Summen im Tabellenkopf überein.
//
// Gerechnet wird gegen den flachen Positions-Index, einmal je Filterwechsel —
// nie über den Baum und nie im Render (WP-I).

import { useMemo } from 'react';
import { MetricTiles } from './MetricTiles';
import { ParetoCard } from './ParetoCard';
import { Treemap } from './Treemap';
import { UnitTotals } from './UnitTotals';
import { BlockLabel } from '../ui/PanelHeader';
import { formatCount, formatPositions } from '../../lib/format';
import { filterMask } from '../../lib/index/positionIndex';
import { buildOverview } from '../../lib/overview/model';
import { matchCount } from '../../lib/tree/matchCounts';
import { useScrollMemory } from '../common/useScrollMemory';
import { toggleFacetValue } from '../../state/filterState';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const EMPTY_ACTIVE: ReadonlySet<string> = new Set();

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 flex-1 border border-line bg-white px-[14px] py-[12px]">
      <BlockLabel right={note}>{title}</BlockLabel>
      {children}
    </section>
  );
}

export function OverviewView() {
  const { lv, index, active, matches, nodes, filter, gewerkColors, parents } = useViewer();
  const dispatch = useViewerDispatch();
  const [attachScroll, onScroll] = useScrollMemory('overview');

  const model = useMemo(() => {
    const mask = active.filtering ? filterMask(index, active) : null;
    return buildOverview({ index, mask, parents });
  }, [index, active, parents]);

  // Hinweiszahl wie in der Ansicht „Prüfung": abgeschaltete Regeln zählen nicht,
  // und gezählt wird nur, was der Filter durchlässt.
  const flags = useMemo(() => {
    const check = lv?.check ?? null;
    if (check === null) return 0;
    return check.flags.filter((flag) => {
      if (filter.mutedRules.has(flag.id)) return false;
      if (!matches.filtering) return true;
      const node = nodes.get(flag.positionId);
      return node !== undefined && matchCount(matches, node) > 0;
    }).length;
  }, [lv, filter.mutedRules, matches, nodes]);

  if (lv === null) return null;

  const { metrics } = model;
  const activeGewerke = filter.filters.facets.gewerk ?? EMPTY_ACTIVE;
  const activeUnits = filter.filters.facets.einheit ?? EMPTY_ACTIVE;

  /** Gewerk-Kopf: an- und abwählen — der Knopf ist ein Schalter. */
  const pickGewerk = (gewerk: string): void =>
    dispatch({
      type: 'setFacet',
      facetId: 'gewerk',
      values: toggleFacetValue(filter.filters, 'gewerk', gewerk),
    });

  const pickSection = (gewerk: string | null, sectionId: string): void => {
    // Auf das Gewerk **setzen** statt umzuschalten: der Klick sagt „dieser
    // Block". Stünde hier ein Umschalter, nähme derselbe Klick den Filter
    // wieder weg, sobald das Gewerk schon gewählt war.
    //
    // Sammelkacheln („Ohne Gewerk", „Weitere n Gewerke") tragen kein echtes
    // Gewerk — dort wird nur der Abschnitt angewählt, nie gefiltert.
    if (gewerk !== null) {
      dispatch({ type: 'setFacet', facetId: 'gewerk', values: new Set([gewerk]) });
    }
    dispatch({ type: 'selectNode', id: sectionId });
  };

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-[12px] px-[20px] py-[16px]">
        <div>
          <BlockLabel>Überblick</BlockLabel>
          <p className="mt-[2px] font-sans text-[13px] font-semibold text-ink">
            {formatPositions(metrics.positions)}
            {metrics.filtering && (
              <span className="font-normal text-dim">
                {' '}
                · im aktuellen Filter, von {formatCount(metrics.totalPositions)}
              </span>
            )}
          </p>
        </div>

        <MetricTiles metrics={metrics} flags={flags} />

        <Card
          title="Verteilung · Gewerk und Abschnitt"
          note={model.measure === 'preis' ? 'Fläche = Summe' : 'Fläche = Anzahl Positionen'}
        >
          <Treemap
            groups={model.groups}
            measure={model.measure}
            colors={gewerkColors}
            activeGewerke={activeGewerke}
            onPickGewerk={pickGewerk}
            onPickSection={pickSection}
          />
          <p className="mt-[6px] font-mono text-[9.5px] text-mute">
            Klick auf ein Gewerk filtert; Klick auf einen Abschnitt filtert sein Gewerk und wählt
            ihn an. „Ohne Gewerk" und „Weitere Gewerke" wählen nur an — sie stehen für kein Gewerk.
          </p>
        </Card>

        <div className="flex flex-wrap gap-[12px]">
          <Card title="Pareto · 80 % der Summe">
            <ParetoCard pareto={model.pareto} />
          </Card>
          <Card title="Mengen je Einheit" note="absteigend">
            <UnitTotals
              units={model.units}
              active={activeUnits}
              onPick={(key) =>
                dispatch({
                  type: 'setFacet',
                  facetId: 'einheit',
                  values: toggleFacetValue(filter.filters, 'einheit', key),
                })
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
