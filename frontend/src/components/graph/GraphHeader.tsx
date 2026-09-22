// Kopfzeile über dem Graphen: Kennzahlen + Umschalter für den Größenmodus und
// für die Trefferansicht (WP-Q, Issue #60). Portiert aus `CenterHint` in
// design/claude-design/lv-main.jsx.

import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES } from '../../lib/graph/constants';
import { FOCUS_GROUP_LABELS, type FocusGroupBy } from '../../lib/graph/focusTree';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch, type GraphFocus, type SizeModeId } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

const FOCUS_OPTIONS: ReadonlyArray<{ value: GraphFocus; label: string; title: string }> = [
  {
    value: 'structure',
    label: 'GESAMTER GRAPH',
    title: 'Das ganze LV zeigen, Treffer darin hervorheben.',
  },
  {
    value: 'isolate',
    label: 'ISOLATION',
    title: 'Nur die Treffer zeigen, neu gebündelt — alles andere tritt weg.',
  },
];

const GROUP_OPTIONS: readonly FocusGroupBy[] = ['abschnitt', 'gewerk', 'bauteiltyp'];

export function GraphHeader({ root }: { root: LVNode }) {
  const {
    view: {
      graph: { sizeMode, focus: focusMode, groupBy },
    },
    matches,
    focus,
    quantities,
  } = useViewer();
  const dispatch = useViewerDispatch();

  // Filter ohne Treffer: dann gibt es nichts zu isolieren, und der Graph zeigt
  // weiter das ganze LV — gedämpft bzw. ausgeblendet, je nach Modus. Das muss
  // dastehen, sonst behauptet der Umschalter „Isolation", während das volle LV
  // auf dem Schirm steht.
  const treffer = matches.counts.get(root.id) ?? 0;
  const keineTreffer = matches.filtering && treffer === 0;

  const lots = root.children.length;
  const sections = root.children.reduce((total, lot) => total + lot.children.length, 0);
  // x83-Dateien führen keine Einheitspreise — der Größenmodus "Gesamtpreis"
  // wäre dann für das ganze LV 0 (docs/implementation-plan.md, WP-D). Die
  // Option wird deshalb gesperrt statt still auf "Anzahl" zurückzufallen: sonst
  // sieht der Knopf gewählt aus und im Graphen ändert sich nichts.
  const priceless = root.totalPrice === 0;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-[14px] z-[1] flex justify-center px-[14px]">
      <div
        className="pointer-events-auto inline-flex max-w-full flex-wrap items-center justify-center gap-x-[12px] gap-y-[6px] border border-line py-[5px] pl-[14px] pr-[6px]"
        style={{ background: 'var(--scrim)', boxShadow: 'var(--shadow-hairline)' }}
      >
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
          {formatCount(lots)} LOSE · {formatCount(sections)} ABSCHNITTE ·{' '}
          {formatCount(root.positionCount)} POS.
          {focus !== null && (
            <>
              {' · '}
              <span className="text-ink">
                {formatCount(focus.hitCount)} TREFFER IN {formatCount(focus.groupCount)} GRUPPEN
              </span>
            </>
          )}
          {keineTreffer && (
            <>
              {' · '}
              <span className="text-ink">
                KEINE TREFFER{focusMode === 'isolate' ? ' — NICHTS ZU ISOLIEREN' : ''}
              </span>
            </>
          )}
          {' · GRÖSSE'}
        </span>
        <SegmentedControl
          label="Größe der Bubbles"
          options={SIZE_MODES.map((mode) => {
            // Ein Modus, der für die geladene Datei bzw. den aktuellen Filter
            // nichts aussagt, wird gesperrt statt still auf „Anzahl"
            // zurückzufallen: sonst sieht der Knopf gewählt aus und im Graphen
            // ändert sich nichts.
            const gesperrt =
              (mode.id === 'cost' && priceless) ||
              (mode.id === 'quantity' && quantities.unit === null);
            const grund =
              mode.id === 'cost'
                ? 'Diese Datei führt keine Einheitspreise — Größe nach Gesamtpreis ist hier ohne Aussage.'
                : 'Mengen lassen sich nur innerhalb einer Einheit vergleichen. Filtere auf eine Einheit, dann greift dieser Modus.';
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

        {/* Die Trefferansicht steht nur zur Wahl, solange es Treffer zu zeigen
            gibt — ohne Filter zeigt der Graph immer die Struktur. */}
        {matches.filtering && (
          <>
            <span className="font-mono text-[9px] tracking-[0.6px] text-mute">TREFFER</span>
            <SegmentedControl
              label="Trefferansicht"
              options={FOCUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                title: option.title,
              }))}
              value={focusMode}
              onChange={(value) => dispatch({ type: 'graphFocus', value: value as GraphFocus })}
            />
          </>
        )}

        {matches.filtering && focusMode !== 'structure' && (
          <>
            <span className="font-mono text-[9px] tracking-[0.6px] text-mute">BÜNDELN NACH</span>
            <SegmentedControl
              label="Treffer bündeln nach"
              options={GROUP_OPTIONS.map((id) => ({
                value: id,
                label: FOCUS_GROUP_LABELS[id].toUpperCase(),
                title: `Treffer nach ${FOCUS_GROUP_LABELS[id]} bündeln`,
              }))}
              value={groupBy}
              onChange={(value) => dispatch({ type: 'focusGroupBy', value: value as FocusGroupBy })}
            />
          </>
        )}
      </div>
    </div>
  );
}
