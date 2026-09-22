// Ansicht „Matrix" (WP-O): zwei Facetten als Achsen, eine Zelle je Wertepaar.
// Was fehlt, ist hier genauso eine Aussage wie was da ist — eine leere Zelle
// heißt „diese Kombination kommt im LV nicht vor" und bleibt deshalb stehen.
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gezählt wird die
// gefilterte Menge, dieselbe, die Tabelle und Graph zeigen. Ein Klick auf eine
// Zelle setzt beide Facetten als Filter und wechselt in die Tabelle — die
// Ansicht ist damit der Einstieg in eine Teilmenge, nicht nur ein Bild.
//
// Gerechnet wird im Modell (lib/matrix/model.ts), einmal je Filterwechsel.

import { useMemo } from 'react';
import { AxisPicker } from './AxisPicker';
import { EmptyState } from '../ui/EmptyState';
import { BlockLabel } from '../ui/PanelHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useScrollMemory } from '../common/useScrollMemory';
import { FACETS_BY_ID } from '../../lib/facets';
import { formatCount, formatEuro, formatNumber, formatPositions } from '../../lib/format';
import { filterMask } from '../../lib/index/positionIndex';
import { buildMatrix, cellKey, type MatrixMeasure, type MatrixModel } from '../../lib/matrix/model';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** Fünf Stufen der Skala; die Token stehen in src/index.css. */
const HEAT = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--heat-5)'];

const MEASURES: ReadonlyArray<{ value: MatrixMeasure; label: string }> = [
  { value: 'anzahl', label: 'Anzahl' },
  { value: 'menge', label: 'Menge' },
  { value: 'summe', label: 'Summe' },
];

/** Ton einer Zelle. `value` von 0 bleibt farblos — nichts ist nichts. */
function heatOf(value: number, max: number): string {
  if (value <= 0 || max <= 0) return 'var(--white)';
  // Wurzel statt linear: ohne sie verschwände alles neben der einen großen
  // Zelle, die ein LV fast immer hat, in derselben blassen Stufe.
  const share = Math.sqrt(value / max);
  const step = Math.min(HEAT.length - 1, Math.floor(share * HEAT.length));
  return HEAT[step];
}

function formatValue(value: number, model: MatrixModel): string {
  if (value === 0) return '';
  if (model.measure === 'summe') return formatEuro(value, 0);
  if (model.measure === 'menge') return formatNumber(value, 0);
  return formatCount(value);
}

/** Wofür die Zahl in einer Zelle steht. */
function measureLabel(model: MatrixModel): string {
  if (model.measure === 'summe') return 'Summe';
  if (model.measure === 'menge') return `Menge in ${model.unit ?? ''}`;
  return 'Anzahl Positionen';
}

export function MatrixView() {
  const { lv, index, active, view } = useViewer();
  const dispatch = useViewerDispatch();
  const [attachScroll, onScroll] = useScrollMemory('matrix');
  const { rowFacetId, colFacetId, measure } = view.matrix;

  const model = useMemo(() => {
    const mask = active.filtering ? filterMask(index, active) : null;
    return buildMatrix({ index, mask, rowFacetId, colFacetId, measure });
  }, [index, active, rowFacetId, colFacetId, measure]);

  if (lv === null) return null;

  const rowFacet = FACETS_BY_ID.get(rowFacetId);
  const colFacet = FACETS_BY_ID.get(colFacetId);

  /** Achse setzen — dieselbe Facette wie gegenüber heißt „andersherum". */
  const setAxis = (axis: 'row' | 'col', facetId: string): void => {
    const other = axis === 'row' ? colFacetId : rowFacetId;
    if (facetId === other) {
      dispatch({ type: 'matrixAxis', axis: 'row', facetId: colFacetId });
      dispatch({ type: 'matrixAxis', axis: 'col', facetId: rowFacetId });
      return;
    }
    dispatch({ type: 'matrixAxis', axis, facetId });
  };

  /**
   * Klick auf eine Zelle: beide Facetten auf genau diesen Wert setzen und in
   * die Tabelle wechseln. Die Zelle **ersetzt** den bisherigen Wert dieser
   * Facetten, statt ihn zu ergänzen — sonst zeigte die Tabelle mehr, als in
   * der Zelle steht.
   *
   * Nur aufgerufen, wenn beide Werte filterbar sind: „Ohne Angabe" und
   * „Weitere" lassen sich als Filter nicht ausdrücken, und nur eine der beiden
   * Achsen zu setzen führte zu einer Tabelle mit mehr Zeilen, als in der Zelle
   * stehen.
   */
  const pickCell = (row: number, col: number): void => {
    dispatch({ type: 'setFacet', facetId: rowFacetId, values: new Set([model.rows[row].key]) });
    dispatch({ type: 'setFacet', facetId: colFacetId, values: new Set([model.cols[col].key]) });
    dispatch({ type: 'setViewMode', mode: 'table' });
  };

  const leer = model.rows.length === 0 || model.cols.length === 0;

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto max-w-[1200px] px-[20px] py-[16px]">
        <div className="border-b border-line pb-[10px]">
          <BlockLabel>Matrix</BlockLabel>
          <p className="mt-[2px] font-sans text-[13px] text-ink">
            <span className="font-semibold">{formatPositions(model.positions)}</span>
            <span className="text-dim">
              {/* Wie im Überblick: sobald gefiltert wird, steht die
                  Bezugsgröße daneben. Sonst liest man die Zahlen im Raster
                  leicht als Aussage über das ganze LV. */}
              {active.filtering && <> · im aktuellen Filter, von {formatCount(index.size)}</>}
              {' · '}
              {rowFacet?.label ?? rowFacetId} × {colFacet?.label ?? colFacetId}
              {' · '}
              Zellwert: {measureLabel(model)}
            </span>
          </p>
          <p className="mt-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">
            Klick auf eine Zelle filtert darauf und wechselt in die Tabelle. Leere Zellen bleiben
            leer — dass eine Kombination nicht vorkommt, ist die Aussage.
          </p>

          <div className="mt-[10px] flex flex-wrap items-center gap-[12px]">
            <div className="flex items-center gap-[6px]">
              <span className="font-mono text-[8px] tracking-[0.6px] text-mute">ZEILEN</span>
              <AxisPicker
                label="Zeilen"
                facetId={rowFacetId}
                otherFacetId={colFacetId}
                onChange={(facetId) => setAxis('row', facetId)}
              />
            </div>
            <div className="flex items-center gap-[6px]">
              <span className="font-mono text-[8px] tracking-[0.6px] text-mute">SPALTEN</span>
              <AxisPicker
                label="Spalten"
                facetId={colFacetId}
                otherFacetId={rowFacetId}
                onChange={(facetId) => setAxis('col', facetId)}
              />
            </div>
            <div className="flex items-center gap-[6px]">
              <span className="font-mono text-[8px] tracking-[0.6px] text-mute">ZELLWERT</span>
              <SegmentedControl
                label="Zellwert"
                options={MEASURES.map((entry) => ({
                  ...entry,
                  // Eine Option, die für diese Datei nichts aussagen kann,
                  // steht gesperrt da statt stillschweigend etwas anderes zu
                  // zeigen (wie im Graphen, WP-Q).
                  disabled:
                    (entry.value === 'menge' && model.unit === null) ||
                    (entry.value === 'summe' && !model.hasPrices),
                  title:
                    entry.value === 'menge'
                      ? 'Nur innerhalb einer Einheit — sonst addierte man m³ und Stück'
                      : entry.value === 'summe' && !model.hasPrices
                        ? 'Die Datei führt keine Preise'
                        : undefined,
                }))}
                value={model.measure}
                onChange={(value) =>
                  dispatch({ type: 'matrixMeasure', value: value as MatrixMeasure })
                }
              />
            </div>
          </div>

          {measure === 'menge' && model.measure !== 'menge' && (
            <p className="mt-[6px] font-mono text-[9.5px] text-mute">
              MENGEN NUR INNERHALB EINER EINHEIT — DER FILTER MISCHT MEHRERE, DESHALB ANZAHL
            </p>
          )}
          {model.multiValued && (
            <p className="mt-[6px] font-mono text-[9.5px] text-mute">
              EINE POSITION KANN MEHRERE WERTE TRAGEN — SIE ZÄHLT DANN IN JEDER ZELLE MIT
            </p>
          )}
        </div>

        {leer && (
          <div className="mt-[16px]">
            <EmptyState>Keine Position im aktuellen Filter</EmptyState>
          </div>
        )}

        {!leer && (
          <div className="mt-[12px] overflow-auto">
            <table className="border-collapse" aria-label="Matrix">
              <caption className="sr-only">
                {rowFacet?.label ?? rowFacetId} nach {colFacet?.label ?? colFacetId}. Jede Zelle:{' '}
                {measureLabel(model)}.
              </caption>
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] border border-line bg-white px-[8px] py-[6px] text-left font-mono text-[9px] tracking-[0.6px] text-mute">
                    {(rowFacet?.label ?? rowFacetId).toUpperCase()}
                  </th>
                  {model.cols.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      title={`${col.label} · ${formatPositions(col.count)}`}
                      className={`max-w-[92px] border border-line bg-white px-[6px] py-[6px] text-left align-bottom font-mono text-[9.5px] font-normal ${
                        col.filterable ? 'text-dim' : 'text-mute italic'
                      }`}
                    >
                      <span className="block truncate">{col.label}</span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="border border-line bg-white px-[6px] py-[6px] text-right align-bottom font-mono text-[9px] tracking-[0.6px] text-mute"
                  >
                    GESAMT
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row, r) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      title={`${row.label} · ${formatPositions(row.count)}`}
                      className={`sticky left-0 z-[1] max-w-[180px] border border-line bg-white px-[8px] py-[4px] text-left font-mono text-[10px] font-normal ${
                        row.filterable ? 'text-ink' : 'text-mute italic'
                      }`}
                    >
                      <span className="block truncate">{row.label}</span>
                    </th>
                    {model.cols.map((col, c) => {
                      const cell = model.cells.get(cellKey(r, c));
                      const value = cell?.value ?? 0;
                      const beschriftung = `${row.label} × ${col.label}`;
                      if (cell === undefined) {
                        return (
                          <td
                            key={col.key}
                            title={`${beschriftung} · kommt nicht vor`}
                            className="border border-line bg-white px-[6px] py-[4px] text-right font-mono text-[10px] text-mute"
                          >
                            ·
                          </td>
                        );
                      }
                      if (!row.filterable || !col.filterable) {
                        // Steht da, ist aber kein Einstieg: für „Ohne Angabe"
                        // und „Weitere" gibt es keinen Filter, der genau diese
                        // Zelle trifft.
                        return (
                          <td
                            key={col.key}
                            title={`${beschriftung} · ${formatPositions(cell.count)} · nicht filterbar`}
                            style={{ background: heatOf(value, model.max) }}
                            className="border border-line px-[6px] py-[4px] text-right font-mono text-[10px] text-dim"
                          >
                            {formatValue(value, model)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className="border border-line p-0">
                          <button
                            type="button"
                            onClick={() => pickCell(r, c)}
                            title={`${beschriftung} · ${formatPositions(cell.count)}`}
                            aria-label={`${beschriftung}, ${formatValue(value, model)}`}
                            style={{ background: heatOf(value, model.max) }}
                            className="block w-full cursor-pointer border-none px-[6px] py-[4px] text-right font-mono text-[10px] text-ink hover:outline hover:outline-1 hover:outline-blue"
                          >
                            {formatValue(value, model)}
                          </button>
                        </td>
                      );
                    })}
                    <td
                      title={`${row.label} · ${formatPositions(row.count)}`}
                      className="border border-line bg-panel px-[6px] py-[4px] text-right font-mono text-[10px] text-dim"
                    >
                      {formatValue(row.value, model)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-[1] border border-line bg-panel px-[8px] py-[4px] text-left font-mono text-[9px] tracking-[0.6px] text-mute"
                  >
                    GESAMT
                  </th>
                  {model.cols.map((col) => (
                    <td
                      key={col.key}
                      title={`${col.label} · ${formatPositions(col.count)}`}
                      className="border border-line bg-panel px-[6px] py-[4px] text-right font-mono text-[10px] text-dim"
                    >
                      {formatValue(col.value, model)}
                    </td>
                  ))}
                  <td
                    title="Jede Position genau einmal gezählt"
                    className="border border-line bg-panel px-[6px] py-[4px] text-right font-mono text-[10px] text-ink"
                  >
                    {formatValue(model.total, model)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
