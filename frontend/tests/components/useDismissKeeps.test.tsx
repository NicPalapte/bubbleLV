// Leisten aus einer Karte heraus hängen per Portal an <body> und zählen trotzdem
// als „innerhalb" (`data-keeps-popover`): ein Klick darauf schließt die Karte nicht.

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDismiss } from '../../src/components/common/useDismiss';

function Karte({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose, { ignoreDrag: true });
  return (
    <>
      <div ref={ref}>Karte</div>
      {createPortal(
        <div data-keeps-popover="">
          <button type="button">Leiste</button>
        </div>,
        document.body,
      )}
      {createPortal(<button type="button">Daneben</button>, document.body)}
    </>
  );
}

describe('useDismiss mit data-keeps-popover', () => {
  it('schließt bei Klick auf die Leiste nicht, daneben schon', () => {
    const onClose = vi.fn();
    render(<Karte onClose={onClose} />);
    const leiste = screen.getByRole('button', { name: 'Leiste' });
    fireEvent.mouseDown(leiste);
    fireEvent.mouseUp(leiste);
    expect(onClose).not.toHaveBeenCalled();
    const daneben = screen.getByRole('button', { name: 'Daneben' });
    fireEvent.mouseDown(daneben);
    fireEvent.mouseUp(daneben);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
