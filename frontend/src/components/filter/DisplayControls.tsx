// Gliederung des Graphen (docs/decisions/0035-graph-gliederung.md): nach LV oder
// als Matrix mit Zeilen und Spalten. Steht seit Issue #154 in der aufklappbaren
// Darstellung an der Graph-Steuerung (GraphControls), neben der Größe.
// Der Umgang mit Nicht-Treffern steht in der Suche (TopBar, Entscheidung 0058).

import type { ReactNode } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ChipGroup, ValueChip } from '../ui/ValueChip';
import { FACETS_BY_ID } from '../../lib/facets';
import {
  AXIS_IDS,
  QUANTITY_AXIS,
  SECTION_AXIS,
  type GraphLayoutId,
} from '../../lib/graph/layoutMap';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const LAYOUTS: ReadonlyArray<{ value: GraphLayoutId; label: string; title: string }> = [
  { value: 'lv', label: 'nach LV', title: 'Lose und Abschnitte, wie das LV gegliedert ist' },
  { value: 'matrix', label: 'Matrix', title: 'Nach Merkmalen in Zeilen und Spalten ordnen' },
];

/** Kein Wert gewählt — der Knopf „keine Spalten". */
const NO_COLS = '';

/** Kleine Großbuchstaben-Beschriftung wie im Mockup (`.cap`). */
export const CAP = 'font-mono text-[10px] font-medium uppercase tracking-[0.7px] text-mute';

export function Row({
  label,
  tour,
  children,
}: {
  label: string;
  /** Ziel eines Tour-Schritts (components/tour/). */
  tour?: string;
  children: ReactNode;
}) {
  return (
    <div data-tour={tour} className="flex flex-col gap-[6px]">
      <span className={CAP}>{label}</span>
      <div className="flex flex-wrap">{children}</div>
    </div>
  );
}

const AXIS_LABELS: Readonly<Record<string, string>> = {
  [SECTION_AXIS]: 'Abschnitt',
  [QUANTITY_AXIS]: 'Mengenstufe',
};

export function DisplayControls() {
  const {
    lv,
    summary,
    view: {
      graph: { layout, rows, cols },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  // Nur Merkmale, die in dieser Datei mindestens einen Wert haben; Abschnitt
  // und Mengenstufe stehen immer da, sie kommen aus der Datei selbst.
  const axes = AXIS_IDS.filter(
    (id) => id === SECTION_AXIS || id === QUANTITY_AXIS || (summary.facets.get(id)?.size ?? 0) > 0,
  ).map((id) => ({
    value: id,
    label: AXIS_LABELS[id] ?? FACETS_BY_ID.get(id)?.label ?? id,
  }));

  return (
    <div className="flex flex-col gap-[12px]">
      <Row label="Gliederung" tour="layout">
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
              {[
                { value: NO_COLS, label: '—' },
                // Abschnitt nur als Zeile: lange Titel nebeneinander überlappen (0059).
                ...axes.filter((axis) => axis.value !== rows && axis.value !== SECTION_AXIS),
              ].map((axis) => (
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
              ))}
            </ChipGroup>
          </Row>
        </>
      )}
    </div>
  );
}
