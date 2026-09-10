// Regression: Filter im Overflow-Menü „Weitere Filter" müssen sich setzen
// lassen. Vorher hing das Facetten-Popover per Portal an <body> — also neben
// dem Overflow-Popover statt darin — und dessen Außerhalb-Klick-Wächter schloss
// beim mousedown das ganze Menü, bevor der click den Wert umschalten konnte.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FacetButton } from '../../src/components/filter/FacetButton';
import { FilterOverflowRow } from '../../src/components/filter/FilterOverflowRow';
import { FACETS } from '../../src/lib/facets';
import type { PositionSummary } from '../../src/types/lvNode';

/** Breiten, die jsdom nicht kennt: Chip (100) passt nicht in die Reihe (150). */
const ITEM_WIDTH = 100;
const ROW_WIDTH = 150;

function position(gewerk: string): PositionSummary {
  return {
    oz: '01.001',
    shortText: 'Position',
    longText: '',
    unit: 'm3',
    quantity: 1,
    unitPrice: 1,
    positionType: 'NORMAL',
    attributes: { gewerk },
  };
}

/** Echter Mausklick: erst mousedown (schließt Popover), dann click. */
function click(element: HTMLElement): void {
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

/** Wurzel des Popovers, in dessen Kopfzeile `heading` steht. */
function popoverOf(heading: string): HTMLElement {
  const head = screen.getByText(heading, { selector: 'span' });
  return head.parentElement?.parentElement as HTMLElement;
}

describe('FilterOverflowRow', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(ROW_WIDTH);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(ITEM_WIDTH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('setzt eine Facette, die im Menü „Weitere Filter" liegt', () => {
    const positions = [position('Beton'), position('Mauerwerk')];
    const onChange = vi.fn();
    // Zwei Items: erst ab dem zweiten muss Platz für den Auslöser reserviert
    // werden — dadurch wandern beide ins Overflow-Menü.
    const items = FACETS.filter((entry) => entry.id === 'gewerk' || entry.id === 'positionsart');
    expect(items).toHaveLength(2);

    render(
      <FilterOverflowRow
        items={items.map((facet) => ({
          key: facet.id,
          node: (
            <FacetButton
              facet={facet}
              positions={positions}
              active={new Set()}
              onChange={facet.id === 'gewerk' ? onChange : () => {}}
            />
          ),
        }))}
      />,
    );

    click(screen.getByRole('button', { name: /Weitere Filter/ }));
    const menu = popoverOf('Weitere Filter');

    click(within(menu).getByRole('button', { name: /Gewerk/ }));
    const facetPopover = popoverOf('Gewerk');
    // Das Facetten-Popover muss im Overflow-Popover hängen, sonst gilt jeder
    // Klick darin als „außerhalb".
    expect(menu.contains(facetPopover)).toBe(true);

    click(within(facetPopover).getByRole('button', { name: /Beton/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect([...(onChange.mock.calls[0][0] as Set<string>)]).toEqual(['Beton']);
  });
});
