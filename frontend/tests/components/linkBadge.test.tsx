// Marke an einer verknüpften PDF-Stelle: mehrere Positionen klappen auf Klick auf.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinkBadge } from '../../src/components/docs/LinkBadge';

const OZ: Record<string, string> = { a: '01.0010', b: '01.0020', c: '02.0010' };
const ozOf = (id: string): string => OZ[id] ?? '?';

describe('LinkBadge', () => {
  it('springt bei einer Position direkt', () => {
    const onPick = vi.fn();
    render(<LinkBadge links={['a']} ozOf={ozOf} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: '01.0010' }));
    expect(onPick).toHaveBeenCalledWith('a');
  });

  it('klappt mehrere Positionen auf und springt zur gewählten', () => {
    const onPick = vi.fn();
    render(<LinkBadge links={['a', 'b', 'c']} ozOf={ozOf} onPick={onPick} />);
    const marke = screen.getByRole('button', { name: '01.0010 +2' });
    expect(screen.queryByRole('list', { name: 'Verknüpfte Positionen' })).toBeNull();

    fireEvent.click(marke);
    expect(marke).toHaveAttribute('aria-expanded', 'true');
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '02.0010' }));
    expect(onPick).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('list', { name: 'Verknüpfte Positionen' })).toBeNull();
  });

  it('klappt mit Escape wieder zu', () => {
    render(<LinkBadge links={['a', 'b']} ozOf={ozOf} onPick={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '01.0010 +1' }));
    expect(screen.getByRole('list', { name: 'Verknüpfte Positionen' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('list', { name: 'Verknüpfte Positionen' })).toBeNull();
  });
});
