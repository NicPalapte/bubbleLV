// „Tastenkürzel" im Logo-Menü: seit es keine Befehlspalette mehr gibt
// (Entscheidung 0038), schlägt man die Tasten hier nach.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

function oeffneMenue(): void {
  fireEvent.click(screen.getByRole('button', { name: /Über diese App/ }));
}

describe('Tastenkürzel', () => {
  it('öffnet sich aus dem Logo-Menü und nennt die Suche', () => {
    render(<App />);
    oeffneMenue();
    fireEvent.click(screen.getByRole('button', { name: 'Tastenkürzel' }));
    const fenster = screen.getByRole('dialog', { name: 'Tastenkürzel' });
    expect(within(fenster).getByText('Suche')).toBeInTheDocument();
    expect(within(fenster).getByRole('region', { name: 'Graph' })).toBeInTheDocument();

    fireEvent.click(within(fenster).getByRole('button', { name: 'Tastenkürzel schließen' }));
    expect(screen.queryByRole('dialog', { name: 'Tastenkürzel' })).toBeNull();
  });

  it('öffnet sich mit „?" und schließt mit Escape', async () => {
    render(<App />);
    await act(async () => {});
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Tastenkürzel' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Tastenkürzel' })).toBeNull();
  });

  it('bleibt zu, wenn „?" in einem Eingabefeld getippt wird', async () => {
    render(<App />);
    await act(async () => {});
    const feld = document.createElement('input');
    document.body.appendChild(feld);
    fireEvent.keyDown(feld, { key: '?' });
    expect(screen.queryByRole('dialog', { name: 'Tastenkürzel' })).toBeNull();
    feld.remove();
  });
});
