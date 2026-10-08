// „Visualisierung" im Seitenfenster über den Filtern: wie der Graph gliedert und
// was mit Nicht-Treffern geschieht (docs/decisions/0035-graph-gliederung.md).
// Die Größe der Positionen steht unten rechts am Graphen (GraphControls).

import type { ReactNode } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ChipGroup, ValueChip } from '../ui/ValueChip';
import { FACETS_BY_ID } from '../../lib/facets';
import { AXIS_IDS, SECTION_AXIS, type GraphLayoutId } from '../../lib/graph/layoutMap';
import { useViewer, useViewerDispatch, type HideMode } from '../../state/viewer';

const LAYOUTS: ReadonlyArray<{ value: GraphLayoutId; label: string; title: string }> = [
  { value: 'lv', label: 'nach LV', title: 'Lose und Abschnitte, wie das LV gegliedert ist' },
  { value: 'matrix', label: 'Matrix', title: 'Nach Merkmalen in Zeilen und Spalten ordnen' },
];

const HIDE_MODES = [
  { value: 'dim', label: 'dimmen' },
  { value: 'hide', label: 'ausblenden' },
] as const;

/** Kein Wert gewählt — der Knopf „keine Spalten". */
const NO_COLS = '';

/** Kleine Großbuchstaben-Beschriftung wie im Mockup (`.cap`). */
export const CAP = 'font-mono text-[9.5px] font-medium uppercase tracking-[0.7px] text-mute';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className={CAP}>{label}</span>
      <div className="flex flex-wrap">{children}</div>
    </div>
  );
}

export function DisplayControls() {
  const {
    lv,
    view: {
      graph: { layout, rows, cols },
    },
    filter: { hideMode },
    matches,
  } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  // Nur Merkmale, die in dieser Datei mindestens einen Wert haben; der
  // Abschnitt steht immer da, er kommt aus der Gliederung der Datei.
  const axes = AXIS_IDS.filter(
    (id) => id === SECTION_AXIS || (lv.summary.facets.get(id)?.size ?? 0) > 0,
  ).map((id) => ({
    value: id,
    label: id === SECTION_AXIS ? 'Abschnitt' : (FACETS_BY_ID.get(id)?.label ?? id),
  }));

  return (
    <div className="flex flex-col gap-[12px]">
      <Row label="Gliederung">
        <SegmentedControl
          label="Gliederung"
          options={LAYOUTS}
          value={layout}
          onChange={(value) => dispatch({ type: 'graphLayout', value: value as GraphLayoutId })}
        />
      </Row>

      {layout === 'matrix' && (
        <>
          <Row label="Zeilen">
            <ChipGroup label="Zeilen" radio>
              {axes.map((axis) => (
                <ValueChip
                  key={axis.value}
                  kind="radio"
                  on={rows === axis.value}
                  onClick={() => dispatch({ type: 'graphRows', value: axis.value })}
                >
                  {axis.label}
                </ValueChip>
              ))}
            </ChipGroup>
          </Row>
          <Row label="Spalten">
            <ChipGroup label="Spalten" radio>
              {[{ value: NO_COLS, label: '—' }, ...axes.filter((axis) => axis.value !== rows)].map(
                (axis) => (
                  <ValueChip
                    key={axis.value}
                    kind="radio"
                    on={(cols ?? NO_COLS) === axis.value}
                    title={axis.value === NO_COLS ? 'Keine Spalten' : undefined}
                    onClick={() =>
                      dispatch({
                        type: 'graphCols',
                        value: axis.value === NO_COLS ? null : axis.value,
                      })
                    }
                  >
                    {axis.label}
                  </ValueChip>
                ),
              )}
            </ChipGroup>
          </Row>
        </>
      )}

      {matches.filtering && (
        <Row label="Nicht-Treffer">
          <SegmentedControl
            label="Nicht-Treffer"
            options={HIDE_MODES}
            value={hideMode}
            onChange={(value) => dispatch({ type: 'hideMode', value: value as HideMode })}
          />
        </Row>
      )}
    </div>
  );
}
