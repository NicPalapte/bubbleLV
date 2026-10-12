// Eigene Markierungen und Kommentare (Entscheidung 0047): Positionskarte,
// Schild am Punkt im Graphen, Filter oben, Speichern zur letzten Datei.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { NoteBlock } from '../../src/components/common/NoteBlock';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { EMPTY_ANNOTATIONS, setNote, toggleMark } from '../../src/lib/annotations';
import { readLastLvMeta, saveAnnotations, saveLastLv } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), 'tests/fixtures', NAME));
const ID = 'test-projekt';

function fixtureBytes(): ArrayBuffer {
  return FIXTURE.buffer.slice(
    FIXTURE.byteOffset,
    FIXTURE.byteOffset + FIXTURE.byteLength,
  ) as ArrayBuffer;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

async function oeffneGespeicherte(): Promise<void> {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: `Letzte Datei öffnen: ${NAME}` }));
  await screen.findByRole('button', { name: '+ Filter' });
}

/** Klickt einen Punkt im Graphen. */
function waehlePunkt(slot: number): void {
  const punkt = document.querySelector(`[data-slot="${slot}"]`);
  if (punkt === null) throw new Error(`Punkt ${slot} fehlt im Graphen`);
  fireEvent.click(punkt);
}

describe('Markierungen und Kommentare', () => {
  it('markiert und kommentiert eine Position und speichert beides zur Datei', async () => {
    await saveLastLv(
      { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
      fixtureBytes(),
    );
    await oeffneGespeicherte();
    waehlePunkt(0);

    fireEvent.click(await screen.findByRole('button', { name: /Markieren/ }));
    expect(screen.getByRole('button', { name: /Markiert/, pressed: true })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kommentar zur Position'), {
      target: { value: 'Boden prüfen' },
    });

    expect(document.querySelectorAll('[data-note="mark"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-note="note"]')).toHaveLength(1);
    await waitFor(async () =>
      expect(await readLastLvMeta()).toMatchObject({ marked: 1, comments: 1 }),
    );
  });

  it('bringt die Notizen beim nächsten Öffnen zurück und filtert danach', async () => {
    await saveLastLv(
      { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
      fixtureBytes(),
    );
    const ids = positionIds();
    const notizen = setNote(toggleMark(EMPTY_ANNOTATIONS, ids[0]), ids[1], 'Boden prüfen');
    await saveAnnotations(ID, notizen);

    render(<App />);
    expect(await screen.findByText('⚑ 1 markiert')).toBeInTheDocument();
    expect(screen.getByText('✎ 1 Kommentar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Letzte Datei öffnen: ${NAME}` }));
    await screen.findByRole('button', { name: '+ Filter' });

    expect(document.querySelectorAll('[data-note="mark"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-note="note"]')).toHaveLength(1);

    const alle = sichtbarePunkte();
    fireEvent.click(screen.getByRole('button', { name: /Markiert/ }));
    await waitFor(() => expect(sichtbarePunkte()).toBe(1));
    expect(alle).toBeGreaterThan(1);
  });

  it('zeigt die Filter erst, wenn es etwas zu filtern gibt', async () => {
    await saveLastLv(
      { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
      fixtureBytes(),
    );
    await oeffneGespeicherte();
    expect(screen.queryByRole('button', { name: /Mit Kommentar/ })).toBeNull();
  });

  it('sagt ohne gespeicherte Datei, dass die Notizen nur für diese Sitzung gelten', () => {
    // Ohne `persistId` — so lädt ein Demo-LV.
    render(
      <ViewerProvider>
        <NoteBlock positionId="position:1" />
      </ViewerProvider>,
    );
    expect(screen.getByText(/Demo-LVs werden nicht gespeichert/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kommentar zur Position'), {
      target: { value: 'nur kurz' },
    });
    expect(screen.getByLabelText('Kommentar zur Position')).toHaveValue('nur kurz');
  });
});

/** Positions-IDs der Musterdatei in Graph-Reihenfolge (Slot = Index im Positions-Index). */
function positionIds(): string[] {
  const lv = runPipeline(fixtureBytes(), NAME);
  return buildPositionIndex(lv.tree).nodes.map((node) => node.id);
}

/** Punkte im Graphen, die nicht abgeblendet sind. */
function sichtbarePunkte(): number {
  return document.querySelectorAll('[data-tier="position"][opacity="1"]').length;
}
