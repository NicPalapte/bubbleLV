// Facetten-Dropdown mit Werten + Trefferzahlen, dynamisch aus den geladenen
// Positionen erzeugt. Portiert aus `FacetButton` in design/claude-design/lv-main.jsx.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../common/Chip';
import { Status } from '../common/Status';
import { useOutsideClose } from '../common/useOutsideClose';
import { facetOptionLabel, type Facet } from '../../lib/facets';
import { formatCount } from '../../lib/format';
import type { PositionSummary } from '../../types/lvNode';

interface FacetButtonProps {
  facet: Facet;
  positions: readonly PositionSummary[];
  active: Set<string>;
  onChange: (values: Set<string>) => void;
}

export function FacetButton({ facet, positions, active, onChange }: FacetButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, open, useCallback(() => setOpen(false), []));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const position of positions) {
      for (const value of facet.get(position)) map.set(value, (map.get(value) ?? 0) + 1);
    }
    return map;
  }, [positions, facet]);

  const values = useMemo(() => {
    const keys = [...counts.keys()];
    return facet.sortValues === undefined
      ? keys.sort((a, b) => a.localeCompare(b, 'de'))
      : facet.sortValues(keys);
  }, [counts, facet]);

  const toggle = (value: string): void => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <Chip on={active.size > 0} count={active.size} onClick={() => setOpen((o) => !o)}>
        {facet.label} <span className="-ml-[2px] text-mute">▾</span>
      </Chip>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 max-w-[320px] min-w-[244px] border border-line2 bg-white font-mono text-[10px] shadow-[0_8px_24px_rgba(26,37,51,0.10)]">
          <div className="flex items-center justify-between border-b border-line px-[10px] py-[8px] text-[9px] uppercase tracking-[0.5px] text-mute">
            <span>{facet.label}</span>
            {active.size > 0 && (
              <span className="cursor-pointer text-blue" onClick={() => onChange(new Set())}>
                zurücksetzen
              </span>
            )}
          </div>
          <div className="max-h-[260px] overflow-auto">
            {values.length === 0 && <div className="px-[12px] py-[10px] text-mute">Keine Werte</div>}
            {values.map((value) => {
              const on = active.has(value);
              const label = facetOptionLabel(facet, value);
              return (
                <div
                  key={value}
                  onClick={() => toggle(value)}
                  className="flex cursor-pointer items-center gap-[8px] px-[10px] py-[6px]"
                  style={{
                    background: on ? 'var(--blueS)' : 'transparent',
                    color: on ? 'var(--blueD)' : 'var(--ink)',
                  }}
                >
                  <span
                    className="inline-flex h-[12px] w-[12px] items-center justify-center text-[9px] leading-none text-white"
                    style={{
                      border: `1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`,
                      background: on ? 'var(--blue)' : 'var(--white)',
                    }}
                  >
                    {on ? '✓' : ''}
                  </span>
                  {facet.id === 'status' && <Status value={value} dotOnly />}
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
                    {label}
                  </span>
                  <span className="shrink-0 text-mute">{formatCount(counts.get(value) ?? 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
