// „Darstellung" im Seitenfenster über den Filtern: wie der Graph gliedert und
// was mit Nicht-Treffern geschieht (docs/decisions/0035-graph-gliederung.md).
// Die Größe der Positionen steht unten rechts am Graphen (GraphControls).

import type { ReactNode } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FACETS_BY_ID } from '../../lib/facets';
import { AXIS_FACETS, type GraphLayoutId } from '../../lib/graph/layoutMap';
import { useViewer, useViewerDispatch, type HideMode } from '../../state/viewer';

const LAYOUTS: ReadonlyArray<{ value: GraphLayoutId; label: string; title: string }> = [
  { value: 'lv', label: 'nach LV', title: 'Lose und Abschnitte, wie das LV gegliedert ist' },
  { value: 'frei', label: 'frei', title: 'Nach Merkmalen in Zeilen und Spalten ordnen' },
];

const HIDE_MODES = [
  { value: 'dim', label: 'dimmen' },
  { value: 'hide', label: 'ausblenden' },
] as const;

/** Kein Wert gewählt — der Knopf „keine Spalten". */
const NO_COLS = '';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] text-dim">{label}</span>
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

  // Nur Merkmale, die in dieser Datei mindestens einen Wert haben.
  const axes = AXIS_FACETS.filter((id) => (lv.summary.facets.get(id)?.size ?? 0) > 0).map((id) => ({
    value: id,
    label: FACETS_BY_ID.get(id)?.label ?? id,
  }));

  return (
    <div className="flex flex-col gap-[14px]">
      <Row label="Gliederung">
        <SegmentedControl
          label="Gliederung"
          options={LAYOUTS}
          value={layout}
          onChange={(value) => dispatch({ type: 'graphLayout', value: value as GraphLayoutId })}
        />
      </Row>

      {layout === 'frei' && (
        <>
          <Row label="Zeilen">
            <SegmentedControl
              label="Zeilen"
              options={axes}
              value={rows}
              onChange={(value) => dispatch({ type: 'graphRows', value })}
            />
          </Row>
          <Row label="Spalten">
            <SegmentedControl
              label="Spalten"
              options={[
                { value: NO_COLS, label: '—', title: 'Keine Spalten' },
                ...axes.filter((axis) => axis.value !== rows),
              ]}
              value={cols ?? NO_COLS}
              onChange={(value) =>
                dispatch({ type: 'graphCols', value: value === NO_COLS ? null : value })
              }
            />
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
