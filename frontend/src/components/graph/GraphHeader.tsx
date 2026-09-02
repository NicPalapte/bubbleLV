// Kopfzeile über dem Graphen: Kennzahlen + Umschalter für den Größenmodus.
// Portiert aus `CenterHint` in design/claude-design/lv-main.jsx.

import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES } from '../../lib/graph/constants';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch, type SizeModeId } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

export function GraphHeader({ root }: { root: LVNode }) {
  const { sizeMode } = useViewer();
  const dispatch = useViewerDispatch();

  const lots = root.children.length;
  const sections = root.children.reduce((total, lot) => total + lot.children.length, 0);
  // x83-Dateien führen keine Einheitspreise — der Größenmodus "Gesamtpreis"
  // wäre dann für das ganze LV 0 (docs/implementation-plan.md, WP-D). Die
  // Option wird deshalb gesperrt statt still auf "Anzahl" zurückzufallen: sonst
  // sieht der Knopf gewählt aus und im Graphen ändert sich nichts.
  const priceless = root.totalPrice === 0;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-[14px] z-[1] flex justify-center">
      <div
        className="pointer-events-auto inline-flex items-center gap-[12px] border border-line py-[5px] pl-[14px] pr-[6px]"
        style={{ background: 'var(--scrim)', boxShadow: 'var(--shadow-hairline)' }}
      >
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
          {formatCount(lots)} LOSE · {formatCount(sections)} ABSCHNITTE ·{' '}
          {formatCount(root.positionCount)} POS. · GRÖSSE
        </span>
        <SegmentedControl
          label="Größe der Bubbles"
          options={SIZE_MODES.map((mode) => {
            const disabled = mode.id === 'cost' && priceless;
            return {
              value: mode.id,
              label: disabled ? `${mode.short} ·—` : mode.short,
              disabled,
              title: disabled
                ? 'Diese Datei führt keine Einheitspreise — Größe nach Gesamtpreis ist hier ohne Aussage.'
                : mode.label,
            };
          })}
          value={sizeMode}
          onChange={(value) => dispatch({ type: 'sizeMode', value: value as SizeModeId })}
        />
      </div>
    </div>
  );
}
