// „Demo starten" auf der Startseite verlinkt `doc/?demo=muster` (Entscheidung 0092):
// Der Viewer öffnet die Demo ohne Preise direkt und nimmt den Parameter aus der Adresse.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

function demoBytes(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(process.cwd(), 'src/assets/demo', fileName));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('Demo aus der Adresse', { timeout: 30_000 }, () => {
  it('?demo=muster öffnet die Demo ohne Preise', async () => {
    const bytes = demoBytes('bvbs-gaeb-musterdatei.x83');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes })),
    );
    window.history.replaceState(null, '', '/doc/?demo=muster');
    render(<App />);
    await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 10_000 });
    expect(screen.getAllByText('BVBS GAEB Musterdatei 3.3').length).toBeGreaterThan(0);
    expect(window.location.search).toBe('');
  });
});
