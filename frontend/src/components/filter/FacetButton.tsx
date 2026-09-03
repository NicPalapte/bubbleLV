// Facetten-Dropdown mit Werten + Trefferzahlen, dynamisch aus den geladenen
// Positionen erzeugt. Portiert aus `FacetButton` in design/claude-design/lv-main.jsx;
// die Dropdown-Fläche ist der Design-System-Baustein `Popover`.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead, PopoverRow } from '../ui/Popover';
import { StatusPill } from '../ui/StatusPill';
import { useDismiss } from '../common/useDismiss';
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
  useDismiss(
    ref,
    open,
    useCallback(() => setOpen(false), []),
  );

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
      <Popover open={open} width={244}>
        <PopoverHead onReset={active.size > 0 ? () => onChange(new Set()) : undefined}>
          {facet.label}
        </PopoverHead>
        <div style={{ maxHeight: 260, overflow: 'auto' }}>
          {values.length === 0 && (
            <div style={{ padding: '10px 12px', color: 'var(--mute)' }}>Keine Werte</div>
          )}
          {values.map((value) => {
            const label = facetOptionLabel(facet, value);
            return (
              <PopoverRow
                key={value}
                on={active.has(value)}
                onClick={() => toggle(value)}
                checkbox
                title={label}
                leading={facet.id === 'status' ? <StatusPill status={value} dotOnly /> : undefined}
                trailing={formatCount(counts.get(value) ?? 0)}
              >
                {label}
              </PopoverRow>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
