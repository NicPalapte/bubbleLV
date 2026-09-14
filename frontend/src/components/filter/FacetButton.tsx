// Facetten-Dropdown mit Werten + Trefferzahlen, dynamisch aus den geladenen
// Positionen erzeugt. Portiert aus `FacetButton` in design/claude-design/lv-main.jsx;
// die Dropdown-Fläche ist der Design-System-Baustein `Popover`.
//
// Die Zähler kommen fertig aus dem Aggregat des geladenen LV
// (lib/index/summary.ts) — seit WP-I zählt kein Knopf mehr selbst über alle
// Positionen, und zwar auch dann nicht, wenn er nie geöffnet wird.

import { useCallback, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead, PopoverRow } from '../ui/Popover';
import { StatusPill } from '../ui/StatusPill';
import { useDismiss } from '../common/useDismiss';
import { facetOptionLabel, type Facet } from '../../lib/facets';
import { formatCount } from '../../lib/format';

interface FacetButtonProps {
  facet: Facet;
  /** Wert → Anzahl Positionen, bereits in Anzeigereihenfolge. */
  counts: ReadonlyMap<string, number>;
  active: Set<string>;
  onChange: (values: Set<string>) => void;
}

export function FacetButton({ facet, counts, active, onChange }: FacetButtonProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  const toggle = (value: string): void => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div ref={anchorRef}>
      <Chip on={active.size > 0} count={active.size} onClick={() => setOpen((o) => !o)}>
        {facet.label} <span className="-ml-[2px] text-mute">▾</span>
      </Chip>
      <Popover ref={popoverRef} open={open} width={244} anchorRef={anchorRef}>
        <PopoverHead onReset={active.size > 0 ? () => onChange(new Set()) : undefined}>
          {facet.label}
        </PopoverHead>
        <div style={{ maxHeight: 260, overflow: 'auto' }}>
          {counts.size === 0 && (
            <div style={{ padding: '10px 12px', color: 'var(--mute)' }}>Keine Werte</div>
          )}
          {[...counts].map(([value, count]) => {
            const label = facetOptionLabel(facet, value);
            return (
              <PopoverRow
                key={value}
                on={active.has(value)}
                onClick={() => toggle(value)}
                checkbox
                title={label}
                leading={facet.id === 'status' ? <StatusPill status={value} dotOnly /> : undefined}
                trailing={formatCount(count)}
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
