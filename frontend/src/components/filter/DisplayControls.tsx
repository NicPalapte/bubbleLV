// „Darstellung" im Seitenfenster: wie der Graph zeigt, was der Filter
// durchlässt. Stand früher als Kopfzeile über dem Graphen (WP-Q, Issue #60);
// seit dem neuen Hauptscreen sitzt es über den Filtern, damit die Kopfleiste
// schmal bleibt (docs/decisions/0032-graph-als-hauptscreen.md).
//
// Eine Wahl, die für die geladene Datei nichts aussagt, wird gesperrt statt
// still auf eine andere zurückzufallen: sonst sieht der Knopf gewählt aus und
// im Graphen ändert sich nichts.

import type { ReactNode } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES } from '../../lib/graph/constants';
import { FOCUS_GROUP_LABELS, type FocusGroupBy } from '../../lib/graph/focusTree';
import {
  useViewer,
  useViewerDispatch,
  type GraphFocus,
  type HideMode,
  type SizeModeId,
} from '../../state/viewer';

const FOCUS_OPTIONS: ReadonlyArray<{ value: GraphFocus; label: string; title: string }> = [
  { value: 'structure', label: 'im LV', title: 'Das ganze LV zeigen, Treffer darin hervorheben.' },
  { value: 'isolate', label: 'nur Treffer', title: 'Nur die Treffer zeigen, neu gebündelt.' },
];

const HIDE_MODES = [
  { value: 'dim', label: 'abblenden' },
  { value: 'hide', label: 'ausblenden' },
] as const;

const GROUP_OPTIONS: readonly FocusGroupBy[] = ['abschnitt', 'gewerk', 'bauteiltyp'];

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
      graph: { sizeMode, focus: focusMode, groupBy },
    },
    filter: { hideMode },
    matches,
    focus,
    quantities,
  } = useViewer();
  const dispatch = useViewerDispatch();
  if (lv === null) return null;

  // x83-Dateien führen keine Einheitspreise — „Gesamtpreis" wäre für das ganze
  // LV 0 (docs/implementation-plan.md, WP-D).
  const priceless = lv.tree.totalPrice === 0;

  return (
    <div className="flex flex-col gap-[14px]">
      <Row label="Größe">
        <SegmentedControl
          label="Größe der Bubbles"
          options={SIZE_MODES.map((mode) => {
            const gesperrt =
              (mode.id === 'cost' && priceless) ||
              (mode.id === 'quantity' && quantities.unit === null);
            const grund =
              mode.id === 'cost'
                ? 'Diese Datei führt keine Einheitspreise.'
                : 'Mengen lassen sich nur innerhalb einer Einheit vergleichen. Filtere auf eine Einheit.';
            const beschriftung =
              mode.id === 'quantity' && quantities.unit !== null
                ? `${mode.short} ${quantities.unit}`
                : mode.short;
            return {
              value: mode.id,
              label: gesperrt ? `${mode.short} ·—` : beschriftung,
              disabled: gesperrt,
              title: gesperrt ? grund : mode.label,
            };
          })}
          value={sizeMode}
          onChange={(value) => dispatch({ type: 'sizeMode', value: value as SizeModeId })}
        />
      </Row>

      {/* Die Trefferansicht steht nur zur Wahl, solange es Treffer zu zeigen
          gibt — ohne Filter zeigt der Graph immer die Struktur. */}
      {matches.filtering && (
        <Row label="Treffer">
          <SegmentedControl
            label="Trefferansicht"
            options={FOCUS_OPTIONS}
            value={focusMode}
            onChange={(value) => dispatch({ type: 'graphFocus', value: value as GraphFocus })}
          />
        </Row>
      )}

      {/* Nicht-Treffer gibt es nur zu sehen, solange der Graph das ganze LV
          zeigt; die Isolation zeigt ausschließlich Treffer. */}
      {matches.filtering && focus === null && (
        <Row label="Nicht-Treffer">
          <SegmentedControl
            label="Nicht-Treffer"
            options={HIDE_MODES}
            value={hideMode}
            onChange={(value) => dispatch({ type: 'hideMode', value: value as HideMode })}
          />
        </Row>
      )}

      {matches.filtering && focusMode !== 'structure' && (
        <Row label="Bündeln nach">
          <SegmentedControl
            label="Treffer bündeln nach"
            options={GROUP_OPTIONS.map((id) => ({
              value: id,
              label: FOCUS_GROUP_LABELS[id],
              title: `Treffer nach ${FOCUS_GROUP_LABELS[id]} bündeln`,
            }))}
            value={groupBy}
            onChange={(value) => dispatch({ type: 'focusGroupBy', value: value as FocusGroupBy })}
          />
        </Row>
      )}
    </div>
  );
}
