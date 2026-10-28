// Marke an verknüpften PDF-Stellen: mehrere Positionen oder Stellen klappen auf Klick auf.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinkBadge } from '../../src/components/docs/LinkBadge';

const OZ: Record<string, string> = { a: '01.0010', b: '01.0020', c: '02.0010' };
const ozOf = (id: string): string => OZ[id] ?? '?';
const titleOf = (id: string): string => `Kurztext ${id}`;
const LISTE = { name: 'Verknüpfte Positionen' };

describe('LinkBadge', () => {
  it('springt bei einer Position direkt', () => {
    const onPick = vi.fn();
    render(
      <LinkBadge
        spots={[{ text: 'Beton', links: ['a'] }]}
        ozOf={ozOf}
        titleOf={titleOf}
        onPick={onPick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '01.0010' }));
    expect(onPick).toHaveBeenCalledWith('a');
  });

  it('springt direkt, wenn mehrere Stellen dieselbe Position tragen', () => {
    const onPick = vi.fn();
    const spots = [
      { text: 'Beton', links: ['a'] },
      { text: 'C30/37', links: ['a'] },
    ];
    render(<LinkBadge spots={spots} ozOf={ozOf} titleOf={titleOf} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: '01.0010' }));
    expect(onPick).toHaveBeenCalledWith('a');
  });

  it('klappt mehrere Positionen auf und springt zur gewählten', () => {
    const onPick = vi.fn();
    render(
      <LinkBadge
        spots={[{ text: 'Beton', links: ['a', 'b', 'c'] }]}
        ozOf={ozOf}
        titleOf={titleOf}
        onPick={onPick}
      />,
    );
    const marke = screen.getByRole('button', { name: '01.0010 +2' });
    expect(screen.queryByRole('region', LISTE)).toBeNull();

    fireEvent.click(marke);
    expect(marke).toHaveAttribute('aria-expanded', 'true');
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /02\.0010/ }));
    expect(onPick).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('region', LISTE)).toBeNull();
  });

  it('bündelt Stellen: zählt Positionen ohne Doppelte und listet je Stelle', () => {
    const spots = [
      { text: 'Sauberkeitsschicht', links: ['a'] },
      { text: 'Bodenplatte C30/37', links: ['b', 'a'] },
      { text: 'Fundamentbalken', links: ['c'] },
    ];
    render(<LinkBadge spots={spots} ozOf={ozOf} titleOf={titleOf} onPick={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '01.0010 +2' }));
    const liste = screen.getByRole('region', LISTE);
    expect(liste).toHaveTextContent('3 Stellen · 3 Positionen');
    expect(liste).toHaveTextContent('Bodenplatte C30/37');
    expect(liste).toHaveTextContent('Kurztext c');
    expect(screen.getAllByRole('button', { name: /01\.0010/ })).toHaveLength(3);
  });

  it('klappt mit Escape wieder zu', () => {
    render(
      <LinkBadge
        spots={[{ text: 'Beton', links: ['a', 'b'] }]}
        ozOf={ozOf}
        titleOf={titleOf}
        onPick={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '01.0010 +1' }));
    expect(screen.getByRole('region', LISTE)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', LISTE)).toBeNull();
  });

  it('klappt zu, wenn das PDF scrollt', () => {
    render(
      <LinkBadge
        spots={[{ text: 'Beton', links: ['a', 'b'] }]}
        ozOf={ozOf}
        titleOf={titleOf}
        onPick={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '01.0010 +1' }));
    fireEvent.scroll(screen.getByRole('region', LISTE));
    expect(screen.getByRole('region', LISTE)).toBeInTheDocument();
    fireEvent.scroll(document);
    expect(screen.queryByRole('region', LISTE)).toBeNull();
  });
});
