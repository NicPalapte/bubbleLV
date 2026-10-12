// Feld „Letzte Datei öffnen" auf der Startseite (Entscheidung 0046).

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { readLastLvMeta, saveLastLv } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), 'tests/fixtures', NAME));

function fixtureBytes(): ArrayBuffer {
  return FIXTURE.buffer.slice(
    FIXTURE.byteOffset,
    FIXTURE.byteOffset + FIXTURE.byteLength,
  ) as ArrayBuffer;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('Letzte Datei öffnen', () => {
  it('fehlt, solange nichts gespeichert ist', async () => {
    render(<App />);
    // Einen Lesezyklus abwarten, sonst wäre „fehlt" nur „noch nicht da".
    await readLastLvMeta();
    expect(screen.queryByRole('button', { name: /Letzte Datei öffnen/ })).toBeNull();
  });

  it('merkt sich eine geöffnete Datei', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
      target: { files: [new File([FIXTURE], NAME)] },
    });
    await waitFor(async () => expect((await readLastLvMeta())?.fileName).toBe(NAME));
  });

  it('öffnet die gespeicherte Datei', async () => {
    await saveLastLv({ fileName: NAME, positionCount: 3, savedAt: Date.now() }, fixtureBytes());
    render(<App />);
    const knopf = await screen.findByRole('button', { name: `Letzte Datei öffnen: ${NAME}` });
    expect(screen.getByText('3 Positionen')).toBeInTheDocument();
    fireEvent.click(knopf);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument(),
    );
  });

  it('löscht erst nach Rückfrage', async () => {
    await saveLastLv({ fileName: NAME, positionCount: 3, savedAt: Date.now() }, fixtureBytes());
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gespeicherte Datei löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(await readLastLvMeta()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Gespeicherte Datei löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    await waitFor(async () => expect(await readLastLvMeta()).toBeNull());
    expect(screen.queryByRole('button', { name: /Letzte Datei öffnen/ })).toBeNull();
  });
});
