// Notizen sichern und laden (Entscheidung 0061): Rückfrage auf der Startseite,
// „Notizen sichern" und „Notizen laden…" im Logo-Menü.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { EMPTY_ANNOTATIONS, setMarker, addComment } from '../../src/lib/annotations';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { notesFileText } from '../../src/lib/notesFile';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { readLastLvMeta, saveAnnotations, saveLastLv } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), '../packages/core/tests/fixtures', NAME));
const ID = 'test-projekt';

/** Texte, die `downloadText` an den Browser gegeben hätte. */
const downloads: Array<{ name: string; text: string }> = [];

function fixtureBytes(): ArrayBuffer {
  return FIXTURE.buffer.slice(
    FIXTURE.byteOffset,
    FIXTURE.byteOffset + FIXTURE.byteLength,
  ) as ArrayBuffer;
}

function positionen() {
  const lv = runPipeline(fixtureBytes(), NAME);
  return buildPositionIndex(lv.tree).nodes;
}

async function speichere(mitNotizen: boolean): Promise<void> {
  await saveLastLv(
    { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
    fixtureBytes(),
  );
  if (!mitNotizen) return;
  const hash = positionen()[0].position?.hashes.id ?? '';
  await saveAnnotations(ID, setMarker(EMPTY_ANNOTATIONS, hash, 'wichtig', 1000));
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  downloads.length = 0;
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  const OriginalBlob = globalThis.Blob;
  vi.stubGlobal(
    'Blob',
    class extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        downloads.push({ name: '', text: parts.map(String).join('') });
      }
    },
  );
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
    const letzter = downloads[downloads.length - 1];
    if (letzter !== undefined) letzter.name = this.download;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function waehleNeueDatei(): void {
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([FIXTURE], 'neu.x83')] },
  });
}

describe('Startseite', () => {
  it('fragt nach, bevor eine neue Datei gespeicherte Notizen ersetzt', async () => {
    await speichere(true);
    render(<App />);
    await screen.findByText('⚑ 1 mit Marker');
    waehleNeueDatei();

    const frage = screen.getByRole('group', { name: 'Gespeicherte Datei ersetzen' });
    expect(within(frage).getByText(`neu.x83 ersetzt ${NAME}`)).toBeInTheDocument();
    fireEvent.click(within(frage).getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('group', { name: 'Gespeicherte Datei ersetzen' })).toBeNull();

    waehleNeueDatei();
    fireEvent.click(screen.getByRole('button', { name: 'Ersetzen' }));
    await screen.findByRole('button', { name: '+ Filter' });
    await waitFor(async () =>
      expect(await readLastLvMeta()).toMatchObject({ fileName: 'neu.x83', marked: 0 }),
    );
  });

  it('öffnet auf Wunsch die gespeicherte Datei samt Notizen', async () => {
    await speichere(true);
    render(<App />);
    await screen.findByText('⚑ 1 mit Marker');
    waehleNeueDatei();
    fireEvent.click(screen.getByRole('button', { name: `↺ ${NAME} öffnen` }));
    await screen.findByRole('button', { name: '+ Filter' });
    expect(document.querySelectorAll('[data-note="wichtig"]')).toHaveLength(1);
  });

  it('öffnet ohne Notizen sofort, ohne zu fragen', async () => {
    await speichere(false);
    render(<App />);
    await screen.findByRole('button', { name: `Letzte Datei öffnen: ${NAME}` });
    waehleNeueDatei();
    await screen.findByRole('button', { name: '+ Filter' });
  });

  it('sichert beim Löschen auf Wunsch die Notizen als Datei', async () => {
    await speichere(true);
    render(<App />);
    await screen.findByText('⚑ 1 mit Marker');
    fireEvent.click(screen.getByRole('button', { name: 'Gespeicherte Datei löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notizen sichern + löschen' }));
    await waitFor(async () => expect(await readLastLvMeta()).toBeNull());
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Gespeichertes Projekt löschen' })).toBeNull(),
    );
    const datei = downloads.find((d) => d.name.endsWith('.json'));
    expect(datei?.name).toMatch(/^gaeb-xml-beispiel-notizen-.*\.json$/);
    expect(datei?.text).toContain('"marker": "wichtig"');
  });
});

describe('Logo-Menü', () => {
  async function oeffneGespeicherte(): Promise<void> {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: `Letzte Datei öffnen: ${NAME}` }));
    await screen.findByRole('button', { name: '+ Filter' });
  }

  it('sichert die Notizen als Datei', async () => {
    await speichere(true);
    await oeffneGespeicherte();
    fireEvent.click(screen.getByRole('button', { name: 'Über diese App' }));
    fireEvent.click(screen.getByRole('button', { name: /Notizen sichern/ }));
    const datei = downloads.find((d) => d.name.endsWith('.json'));
    expect(datei?.text).toContain('"art": "bubble-notizen"');
  });

  it('lädt eine Notiz-Datei und übernimmt sie nach Bestätigung', async () => {
    await speichere(false);
    await oeffneGespeicherte();
    const knoten = positionen();
    const notizen = addComment(
      setMarker(EMPTY_ANNOTATIONS, knoten[0].id, 'erledigt', 1000),
      knoten[1].id,
      'Boden prüfen',
      2000,
    );
    const text = notesFileText(notizen, knoten, { fileName: NAME, fileId: null }, 3000);

    fireEvent.change(screen.getByLabelText('Notiz-Datei auswählen'), {
      target: { files: [new File([text], 'sicherung.json')] },
    });
    const fenster = await screen.findByRole('dialog', { name: 'Notizen laden' });
    expect(within(fenster).getByText('sicherung.json')).toBeInTheDocument();
    fireEvent.click(within(fenster).getByRole('button', { name: '2 übernehmen' }));

    expect(screen.queryByRole('dialog', { name: 'Notizen laden' })).toBeNull();
    expect(document.querySelectorAll('[data-note="erledigt"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-note="note"]')).toHaveLength(1);
    await waitFor(async () =>
      expect(await readLastLvMeta()).toMatchObject({ marked: 1, comments: 1 }),
    );
  });

  it('wählt Treffer nur über die OZ nicht vor, wenn nichts inhaltlich passt', async () => {
    await speichere(false);
    await oeffneGespeicherte();
    const oz = positionen()[0].position?.oz ?? '';
    const fremd = JSON.stringify({
      art: 'bubble-notizen',
      version: 1,
      datei: 'anderes.x83',
      positionen: [{ hash: 'fremd', text: 'fremd', oz, marker: 'wichtig', verlauf: [] }],
    });
    fireEvent.change(screen.getByLabelText('Notiz-Datei auswählen'), {
      target: { files: [new File([fremd], 'anderes.json')] },
    });
    const fenster = await screen.findByRole('dialog', { name: 'Notizen laden' });
    expect(within(fenster).getByRole('note')).toHaveTextContent('anderen LV');
    expect(
      within(fenster).getByRole('checkbox', { name: 'Geänderte übernehmen' }),
    ).not.toBeChecked();
    expect(within(fenster).getByRole('button', { name: '0 übernehmen' })).toBeDisabled();
  });

  it('meldet eine Datei, die keine Notiz-Datei ist', async () => {
    await speichere(false);
    await oeffneGespeicherte();
    fireEvent.change(screen.getByLabelText('Notiz-Datei auswählen'), {
      target: { files: [new File(['{}'], 'falsch.json')] },
    });
    expect(
      await screen.findByText('Die Datei ist keine Notiz-Datei von Bubble.'),
    ).toBeInTheDocument();
  });
});
