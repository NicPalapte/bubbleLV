// Material-Filter in der Kopfleiste (Issue #99): ohne Materialliste gibt es keinen
// Knopf mit leerem Dropdown, die übrigen Filter bleiben.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function setzeFragment(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

beforeEach(() => setzeFragment(''));
afterEach(() => setzeFragment(''));

async function ladeApp(name = 'gaeb-xml-beispiel.x83'): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
}

describe('Filterleiste ohne Materialliste', () => {
  it('zeigt keinen Material-Knopf', async () => {
    await ladeApp();
    expect(screen.getByRole('button', { name: /^Gewerk/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Material/ })).toBeNull();
  });

  it('lässt andere leere Filter stehen', async () => {
    await ladeApp();
    // Dieses LV nennt keine Exposition — der Knopf bleibt trotzdem.
    expect(screen.getByRole('button', { name: /^Exposition/ })).toBeInTheDocument();
  });
});

describe('Aktiver Material-Filter aus einem Teilen-Link', () => {
  it('bleibt sichtbar, damit man ihn zurücksetzen kann', async () => {
    setzeFragment('#f.material=Beton');
    await ladeApp();
    // Der Link wird erst nach dem ersten Zeichnen angewendet.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Material/ })).toBeInTheDocument(),
    );
  });
});
