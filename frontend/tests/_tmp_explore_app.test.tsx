import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
const log = (...a: unknown[]) => appendFileSync('/tmp/claude-0/-home-user-bubbleLV/4b4fc201-4e00-56f6-8fa3-fa2f3578015b/scratchpad/explore.log', a.join(' ') + '\n');
import App from '../src/App';
it('explore', async () => {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve('tests/fixtures', name))], name)] },
  });
  await waitFor(() => screen.getByRole('button', { name: '+ Filter' }));
  const g = document.querySelector('[aria-label^="Bubble-Graph"] svg');
  log('SVG', g?.textContent);
  log('BTN', screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent).join(' | '));
  fireEvent.click(screen.getByText('PROJEKT'));
  log('SVG2', document.querySelector('[aria-label^="Bubble-Graph"] svg')?.textContent);
  fireEvent.click(screen.getByRole('button', { name: /^▴ Tabelle/ }));
  const t = screen.getByRole('region', { name: 'Tabelle — Fenster über dem Graphen' });
  log('TAB', t.textContent?.slice(0, 1500));
});
