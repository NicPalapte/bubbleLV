// Eigene Markierungen und Kommentare (Entscheidung 0047): Positionskarte,
// Schild am Punkt im Graphen, Filter oben, Speichern zur letzten Datei.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { NoteBlock } from '../../src/components/common/NoteBlock';
import { SAVE_DELAY_MS } from '../../src/components/common/useSaveAnnotations';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import {
  addComment,
  EMPTY_ANNOTATIONS,
  setMarker,
  type Annotations,
} from '../../src/lib/annotations';
import { readLastLvMeta, saveAnnotations, saveLastLv } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), '../packages/core/tests/fixtures', NAME));
const ID = 'test-projekt';

const markiere = (a: Annotations, id: string): Annotations => setMarker(a, id, 'markiert', 1);
const kommentiere = (a: Annotations, id: string, text: string): Annotations =>
  addComment(a, id, text, 1);

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

    fireEvent.click(await screen.findByRole('button', { name: 'Markiert', pressed: false }));
    expect(screen.getByRole('button', { name: 'Markiert', pressed: true })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kommentar zur Position'), {
      target: { value: 'Boden prüfen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    expect(screen.getByLabelText('Kommentar zur Position')).toHaveValue('');
    expect(
      within(screen.getByRole('list', { name: 'Verlauf' })).getByText('Boden prüfen'),
    ).toBeInTheDocument();
    expect(screen.getByText('Marker: Markiert')).toBeInTheDocument();

    expect(document.querySelectorAll('[data-note="markiert"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-note="note"]')).toHaveLength(1);
    // Schilder liegen hinter allen Punkten im SVG, also immer davor im Bild.
    const punkte = document.querySelectorAll('[data-tier="position"]');
    const letzterPunkt = punkte[punkte.length - 1];
    const schild = document.querySelector('[data-note="markiert"]');
    expect(
      schild !== null &&
        letzterPunkt.compareDocumentPosition(schild) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
    const notizen = kommentiere(markiere(EMPTY_ANNOTATIONS, ids[0]), ids[1], 'Boden prüfen');
    await saveAnnotations(ID, notizen);

    render(<App />);
    expect(await screen.findByText('⚑ 1 mit Marker')).toBeInTheDocument();
    expect(screen.getByText('✎ 1 Kommentar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Letzte Datei öffnen: ${NAME}` }));
    await screen.findByRole('button', { name: '+ Filter' });

    expect(document.querySelectorAll('[data-note="markiert"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-note="note"]')).toHaveLength(1);

    const alle = sichtbarePunkte();
    fireEvent.click(screen.getByRole('button', { name: /Markiert/ }));
    await waitFor(() => expect(sichtbarePunkte()).toBe(1));
    expect(alle).toBeGreaterThan(1);
  });

  it('behält Notizen in der Sitzung, wenn die Datei nicht gespeichert werden kann', async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new Error('gesperrt');
      },
    } as unknown as IDBFactory;
    render(<App />);
    fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
      target: { files: [new File([FIXTURE], NAME)] },
    });
    await screen.findByRole('button', { name: '+ Filter' });
    waehlePunkt(0);
    expect(await screen.findByText(/wird nicht gespeichert/)).toBeInTheDocument();
  });

  it('gibt die Notizen ab dem ersten Speichern an die neue Datei', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
      target: { files: [new File([FIXTURE], NAME)] },
    });
    await screen.findByRole('button', { name: '+ Filter' });
    waehlePunkt(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Wichtig', pressed: false }));
    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ marked: 1 }));
    expect(screen.queryByText(/wird nicht gespeichert/)).toBeNull();
  });

  it('schreibt eine ausstehende Notiz beim Schließen sofort zur alten Datei', async () => {
    await saveLastLv(
      { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
      fixtureBytes(),
    );
    await oeffneGespeicherte();
    waehlePunkt(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Erledigt', pressed: false }));
    // Vor Ablauf der Sammelzeit schließen: die Notiz darf nicht verloren gehen.
    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ marked: 1 }));
  });

  it('schreibt beim bloßen Öffnen nichts zurück', async () => {
    await saveLastLv(
      { fileName: NAME, positionCount: 3, savedAt: Date.now(), id: ID },
      fixtureBytes(),
    );
    const ids = positionIds();
    await saveAnnotations(ID, markiere(EMPTY_ANNOTATIONS, ids[0]));
    await oeffneGespeicherte();
    // Ein zweiter Tab schreibt inzwischen; dieser Tab hat nichts geändert.
    await saveAnnotations(ID, kommentiere(EMPTY_ANNOTATIONS, ids[1], 'aus Tab 2'));
    await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS + 200));
    expect(await readLastLvMeta()).toMatchObject({ marked: 0, comments: 1 });
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
    expect(screen.getByText(/wird nicht gespeichert/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kommentar zur Position'), {
      target: { value: 'nur kurz' },
    });
    fireEvent.keyDown(screen.getByLabelText('Kommentar zur Position'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(screen.getByText('nur kurz')).toBeInTheDocument();
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
