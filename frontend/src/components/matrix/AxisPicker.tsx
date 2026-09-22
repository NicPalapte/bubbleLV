// Achsenwahl der Matrix (WP-O, Schritt 1): eine Facette je Achse, Einfachwahl.
//
// Aufbau wie der Facetten-Knopf der Filterleiste (filter/FacetButton.tsx) —
// Chip plus Popover. Gleiche Geste, gleiche Fläche; nur wählt man hier einen
// Wert statt mehrerer, und es wird nichts gefiltert.

import { useCallback, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead, PopoverRow } from '../ui/Popover';
import { useDismiss } from '../common/useDismiss';
import { FACETS } from '../../lib/facets';

export interface AxisPickerProps {
  /** „Zeilen" oder „Spalten" — steht als Kopfzeile im Popover. */
  label: string;
  facetId: string;
  /**
   * Facette der anderen Achse. Sie steht hier mit in der Liste: wer sie wählt,
   * meint „andersherum" — die Ansicht tauscht dann die Achsen, statt eine
   * Diagonale zu zeigen, in der jede Position in ihrer eigenen Zelle stünde.
   */
  otherFacetId: string;
  onChange: (facetId: string) => void;
}

export function AxisPicker({ label, facetId, otherFacetId, onChange }: AxisPickerProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  const current = FACETS.find((facet) => facet.id === facetId);

  return (
    <div ref={anchorRef}>
      <Chip on onClick={() => setOpen((value) => !value)}>
        {current?.label ?? facetId} <span className="-ml-[2px] text-mute">▾</span>
      </Chip>
      <Popover ref={popoverRef} open={open} width={220} anchorRef={anchorRef}>
        <PopoverHead>{label}</PopoverHead>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {FACETS.map((facet) => (
            <PopoverRow
              key={facet.id}
              on={facet.id === facetId}
              onClick={() => {
                onChange(facet.id);
                setOpen(false);
              }}
              title={facet.id === otherFacetId ? 'Achsen tauschen' : facet.label}
            >
              {facet.label}
            </PopoverRow>
          ))}
        </div>
      </Popover>
    </div>
  );
}
