// PDF-Karten am Rand des Graphen (Entscheidung 0097): Kopf hebt das PDF hervor, Stellen
// der gewählten Position stehen in der Karte, eine Stelle wählt ihre Position.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocCards } from '../../src/components/graph/DocCards';
import { docGraphOf } from '../../src/lib/docs/docGraph';
import { EMPTY_DOC_NOTES, linkDocMark, registerDoc } from '../../src/lib/docs/docNotes';
import { EMPTY_POSITION_INDEX, type PositionIndex } from '../../src/lib/index/positionIndex';
import type { PositionSummary } from '../../src/types/lvNode';

const index: PositionIndex = {
  ...EMPTY_POSITION_INDEX,
  size: 2,
  positions: [{ oz: '01.0010' }, { oz: '01.0020' }] as unknown as PositionSummary[],
  slotOf: new Map([
    ['p1', 0],
    ['p2', 1],
  ]),
};

function cards() {
  let notes = registerDoc(EMPTY_DOC_NOTES, 'aaaaaaaaaaa1', { name: 'Baubeschreibung', pages: 40 });
  notes = linkDocMark(
    notes,
    { doc: 'aaaaaaaaaaa1', page: 3, start: 0, text: 'Erdaushub' },
    ['p1'],
    1,
  );
  notes = linkDocMark(
    notes,
    { doc: 'aaaaaaaaaaa1', page: 9, start: 0, text: 'Pflaster' },
    ['p2'],
    1,
  );
  return docGraphOf(notes, (id) => index.slotOf.has(id)).cards;
}

function show(focus: string | null, picked: string | null) {
  const onFocus = vi.fn();
  const onPick = vi.fn();
  render(
    <DocCards
      cards={cards()}
      focus={focus}
      picked={picked}
      index={index}
      width={240}
      onFocus={onFocus}
      onPick={onPick}
      onScroll={() => undefined}
    />,
  );
  return { onFocus, onPick };
}

describe('PDF-Karten im Graphen', () => {
  it('zeigt je PDF eine Karte, zugeklappt ohne Auswahl', () => {
    show(null, null);
    expect(screen.getByText('Baubeschreibung')).toBeTruthy();
    expect(screen.getByText(/nicht geöffnet/)).toBeTruthy();
    expect(screen.queryByText(/Erdaushub/)).toBeNull();
  });

  it('hebt das PDF über den Kopf hervor und wieder auf', () => {
    const { onFocus } = show(null, null);
    fireEvent.click(screen.getByRole('button', { name: /Baubeschreibung im Graphen/ }));
    expect(onFocus).toHaveBeenCalledWith('aaaaaaaaaaa1');
  });

  it('klappt beim hervorgehobenen PDF alle Stellen auf', () => {
    const { onFocus } = show('aaaaaaaaaaa1', null);
    expect(screen.getByText(/Erdaushub/)).toBeTruthy();
    expect(screen.getByText(/Pflaster/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Baubeschreibung im Graphen/ }));
    expect(onFocus).toHaveBeenCalledWith(null);
  });

  it('zeigt die Stellen der gewählten Position; Antippen wählt die Position', () => {
    const { onPick } = show(null, 'p2');
    expect(screen.queryByText(/Erdaushub/)).toBeNull();
    fireEvent.click(screen.getByText(/Pflaster/));
    expect(onPick).toHaveBeenCalledWith('p2');
  });
});
