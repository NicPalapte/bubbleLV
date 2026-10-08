// Reiter „Überblick" im Seitenfenster (WP-L, Schritt 3): Kennzahlen, Treemap
// nach Hauptabschnitt und Einheit, Pareto (mit Preisen) bzw. größte Mengen
// (ohne Preise), Mengen je Einheit und Import-Log. Die
// Prüfung hat einen eigenen Reiter (shell/SidePanel.tsx).
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gerechnet wird
// über der gefilterten Menge, dieselbe, die Tabelle und Graph zeigen. Ohne
// Filter stimmen die Zahlen mit den Summen im Tabellenkopf überein.
//
// Gerechnet wird gegen den flachen Positions-Index, einmal je Filterwechsel —
// nie über den Baum und nie im Render (WP-I).

import { useMemo } from 'react';
import { ImportLogCard } from './ImportLogCard';
import { LargestQuantities } from './LargestQuantities';
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
    <section className="min-w-0 flex-1 basis-[300px] rounded-[var(--r-md)] border border-line bg-surface px-[14px] py-[12px]">
      <BlockLabel right={note}>{title}</BlockLabel>
      {children}
    </section>
  );
}

export function OverviewView() {
  const { lv, index, active, matches, nodes, filter, parents, selection } = useViewer();
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
  const activeUnits = filter.filters.facets.einheit ?? EMPTY_ACTIVE;

  const pickUnit = (unit: string): void =>
    dispatch({
      type: 'setFacet',
      facetId: 'einheit',
      values: toggleFacetValue(filter.filters, 'einheit', unit),
    });

  const pickSection = (sectionId: string): void => dispatch({ type: 'selectNode', id: sectionId });

  const pickSectionUnit = (sectionId: string, unit: string): void => {
    // Anwählen **und** filtern: der Klick sagt „diese Einheit in diesem
    // Abschnitt" — die Ansicht bleibt, wo sie ist.
    pickUnit(unit);
    pickSection(sectionId);
  };

  const pickPosition = (nodeId: string): void =>
    dispatch({
      type: 'selectPosition',
      nodeId: parents.get(nodeId)?.id ?? null,
      positionId: nodeId,
    });

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto">
      <div className="flex flex-col gap-[12px] px-[14px] py-[14px]">
        <div>
          <p className="m-0 font-sans text-[13px] font-semibold text-ink">
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
          title="Verteilung · Abschnitt und Einheit"
          note={model.measure === 'preis' ? 'Fläche = Summe' : 'Fläche = Anzahl Positionen'}
        >
          <Treemap
            groups={model.groups}
            measure={model.measure}
            selectedId={selection.nodeId}
            activeUnits={activeUnits}
            onPickSection={pickSection}
            onPickUnit={pickSectionUnit}
          />
        </Card>

        <div className="flex flex-wrap gap-[12px]">
          {metrics.hasPrices ? (
            <Card title="Pareto · 80 % der Summe">
              <ParetoCard pareto={model.pareto} />
            </Card>
          ) : (
            <Card title="Größte Mengen" note="je Einheit">
              <LargestQuantities
                units={model.largest}
                selectedId={selection.positionId}
                onPick={pickPosition}
              />
            </Card>
          )}
          <Card title="Mengen je Einheit" note="absteigend">
            <UnitTotals units={model.units} active={activeUnits} onPick={pickUnit} />
          </Card>
        </div>

        <Card title="Import-Log" note="ganze Datei">
          <ImportLogCard />
        </Card>
      </div>
    </div>
  );
}
