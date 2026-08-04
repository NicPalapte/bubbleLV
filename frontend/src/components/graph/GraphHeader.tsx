// Kopfzeile über dem Graphen: Kennzahlen + Umschalter für den Größenmodus.
// Portiert aus `CenterHint` in design/claude-design/lv-main.jsx.

import { SIZE_MODES } from '../../lib/graph/constants';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

export function GraphHeader({ root }: { root: LVNode }) {
  const { sizeMode } = useViewer();
  const dispatch = useViewerDispatch();

  const lots = root.children.length;
  const sections = root.children.reduce((total, lot) => total + lot.children.length, 0);
  // x83-Dateien führen keine Einheitspreise — der Größenmodus "Gesamtpreis"
  // wäre dann für das ganze LV 0 (docs/implementation-plan.md, WP-D).
  const priceless = root.totalPrice === 0;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-[14px] z-[1] flex justify-center">
      <div className="pointer-events-auto inline-flex items-center gap-[12px] border border-line bg-white/95 py-[5px] pl-[14px] pr-[6px]">
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
          {formatCount(lots)} LOSE · {formatCount(sections)} ABSCHNITTE ·{' '}
          {formatCount(root.positionCount)} POS. · GRÖSSE
        </span>
        <div className="flex border border-line">
          {SIZE_MODES.map((mode, index) => {
            const on = mode.id === sizeMode;
            const disabled = mode.id === 'cost' && priceless;
            return (
              <span
                key={mode.id}
                onClick={() => dispatch({ type: 'sizeMode', value: mode.id })}
                title={
                  disabled
                    ? 'Diese Datei führt keine Einheitspreise — Größe fällt auf "Anzahl" zurück.'
                    : mode.label
                }
                className="cursor-pointer whitespace-nowrap px-[10px] py-[4px] font-mono text-[10px]"
                style={{
                  background: on ? 'var(--blueS)' : 'var(--white)',
                  color: on ? 'var(--blueD)' : disabled ? 'var(--mute)' : 'var(--dim)',
                  borderLeft: index > 0 ? '1px solid var(--line)' : 'none',
                  fontWeight: on ? 500 : 400,
                }}
              >
                {mode.short}
                {disabled ? ' ·—' : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
