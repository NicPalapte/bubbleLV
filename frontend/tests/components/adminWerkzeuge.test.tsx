// Admin-Werkzeuge (Entscheidung 0053): Zugang mit Passwort, Begriff im Langtext
// lernen, Liste mit Löschen. Gespeichert wird in der IndexedDB dieses Browsers.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { readLearnedTerms, readOwnRules, saveLearnedTerms } from '../../src/lib/persist/lastLv';
import { ADMIN_PASSWORD_SHA256 } from '../../src/state/admin';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), '../packages/core/tests/fixtures', NAME));
// Das echte Passwort steht nirgends im Repo (docs/setup/admin-werkzeuge.md). Der
// Test ersetzt den Fingerabdruck: „richtig" ergibt den hinterlegten Wert.
const PASSWORT = 'richtig';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  const echt = crypto.subtle.digest.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
    const text = new TextDecoder().decode(data as Uint8Array);
    if (text !== PASSWORT) return echt(algorithm, data);
    const bytes = ADMIN_PASSWORD_SHA256.match(/../g)?.map((hex) => parseInt(hex, 16)) ?? [];
    return Promise.resolve(new Uint8Array(bytes).buffer);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function ladeDatei(): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([FIXTURE], NAME)] },
  });
  await screen.findByRole('button', { name: '+ Filter' });
}

async function oeffneAdmin(passwort: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Über diese App' }));
  fireEvent.click(screen.getByRole('button', { name: 'Admin-Werkzeuge' }));
  fireEvent.change(await screen.findByLabelText('Admin-Passwort'), {
    target: { value: passwort },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
}

/** Merkt sich die Dateinamen, die `downloadText` dem Browser übergeben hätte. */
function fangeDownloads(): string[] {
  const namen: string[] = [];
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    namen.push(this.download);
  });
  return namen;
}

/** Wählt den ersten Punkt mit Langtext und gibt den Langtext-Block zurück. */
async function langtextBlock(): Promise<HTMLElement> {
  for (const punkt of document.querySelectorAll('[data-slot]')) {
    fireEvent.click(punkt);
    const block = screen.queryByRole('region', { name: 'Langtext' });
    if (block !== null) return block;
  }
  throw new Error('Keine Position mit Langtext in der Musterdatei');
}

/** Markiert das erste Wort aus Buchstaben im Langtext, wie mit der Maus. */
function markiereWort(block: HTMLElement): string {
  // Nur im Text selbst, nicht in den Schaltern darüber.
  const text = block.querySelector('.whitespace-pre-wrap') ?? block;
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const match = /\p{L}{5,}/u.exec(node.textContent ?? '');
    if (match === null) continue;
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.contextMenu(node.parentElement ?? block);
    return match[0];
  }
  throw new Error('Kein Wort im Langtext');
}

describe('Admin-Werkzeuge', () => {
  it('bietet das Treffer-Protokoll erst mit geladenem LV', async () => {
    render(<App />);
    await oeffneAdmin(PASSWORT);
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    expect(within(dialog).getByRole('button', { name: 'Admin beenden' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Treffer-Protokoll (CSV)' })).toBeNull();
  });

  it('bleibt ohne richtiges Passwort zu', async () => {
    await ladeDatei();
    await oeffneAdmin('falsch');
    expect(await screen.findByText('Passwort falsch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin beenden' })).toBeNull();
  });

  it('lernt einen Begriff im Langtext als eigene Regel (0088)', async () => {
    await ladeDatei();
    // Ohne Admin bietet die Leiste nur Farben zum Anstreichen.
    markiereWort(await langtextBlock());
    const leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    expect(within(leiste).queryByRole('button', { name: 'Begriff lernen…' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });

    await oeffneAdmin(PASSWORT);
    // Nach dem Passwort geht das Fenster zu, damit man gleich im Langtext arbeiten kann.
    expect(await screen.findByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Admin-Werkzeuge' })).toBeNull();

    const block = await langtextBlock();
    // Der Graph darunter setzt `select-none`; der Langtext muss markierbar bleiben.
    expect(block.querySelector('.whitespace-pre-wrap')).toHaveClass('select-text');
    const wort = markiereWort(block);
    fireEvent.click(await screen.findByRole('button', { name: 'Begriff lernen…' }));
    const lernen = await screen.findByRole('dialog', { name: 'Begriff lernen' });
    fireEvent.click(within(lernen).getByRole('button', { name: 'Wichtig' }));

    await waitFor(() =>
      expect(document.querySelectorAll('[data-span-key="wichtig"]').length).toBeGreaterThan(0),
    );
    await waitFor(async () =>
      expect(await readOwnRules()).toMatchObject([
        { name: wort, wirkung: { hervorheben: 'wichtig' }, status: 'freigegeben' },
      ]),
    );
    expect(await readLearnedTerms()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    const liste = within(dialog).getByRole('navigation', { name: 'Regeln' });
    fireEvent.click(within(liste).getByText(wort));
    // Das Treffer-Protokoll sitzt hier, nicht mehr im Logo-Menü (Entscheidung 0079).
    const geladen = fangeDownloads();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Treffer-Protokoll (CSV)' }));
    expect(geladen).toEqual([expect.stringMatching(/treffer.*\.csv$/)]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    await waitFor(async () => expect(await readOwnRules()).toEqual([]));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Admin beenden' }));
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
  });

  it('zieht Begriffe älterer Versionen einmal in eigene Regeln um', async () => {
    await saveLearnedTerms([
      { begriff: 'bauseits', kategorie: 'wichtig' },
      { begriff: 'Kies', kategorie: 'material' },
    ]);
    render(<App />);
    await waitFor(async () =>
      expect((await readOwnRules())?.map((rule) => [rule.name, rule.wirkung])).toEqual([
        ['bauseits', { hervorheben: 'wichtig' }],
        ['Kies', { hervorheben: 'material' }],
      ]),
    );
    expect(await readLearnedTerms()).toEqual([]);
  });
});
