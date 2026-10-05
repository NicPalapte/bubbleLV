// Material-Filter im Reiter „Filter" (Issue #99): ohne Materialliste gibt es
// keinen leeren Abschnitt „Material", die übrigen Filter bleiben.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  // Die Facetten stehen im Seitenfenster, Reiter „Filter".
  fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
}

function facette(label: string): HTMLElement | null {
  return screen.queryByRole('region', { name: label });
}

describe('Filter ohne Materialliste', () => {
  it('zeigt keinen Abschnitt „Material"', async () => {
    await ladeApp();
    expect(facette('Gewerk')).toBeInTheDocument();
    expect(facette('Material')).toBeNull();
  });

  it('lässt andere leere Filter stehen', async () => {
    await ladeApp();
    // Dieses LV nennt keine Exposition — der Abschnitt bleibt trotzdem.
    expect(facette('Exposition')).toBeInTheDocument();
  });
});

describe('Aktiver Material-Filter aus einem Teilen-Link', () => {
  it('bleibt sichtbar, damit man ihn zurücksetzen kann', async () => {
    setzeFragment('#f.material=Beton');
    await ladeApp();
    // Der Link wird erst nach dem ersten Zeichnen angewendet.
    await waitFor(() => expect(facette('Material')).toBeInTheDocument());
    const material = within(facette('Material') as HTMLElement);
    expect(material.getByRole('button', { name: 'zurücksetzen' })).toBeInTheDocument();
    // Als Chip steht er auch in der Suche der Kopfleiste.
    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Beton entfernen' }),
    ).toBeInTheDocument();
  });
});
