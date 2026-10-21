// Eigenes Anstreichen im Langtext (Entscheidung 0063): Text auswählen, Farbe
// wählen, Liste unter dem Langtext, Entfernen, Speichern zur letzten Datei.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { readLastLv, readLastLvMeta } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), '../packages/core/tests/fixtures', NAME));

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

async function ladeDatei(): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([FIXTURE], NAME)] },
  });
  await screen.findByRole('button', { name: '+ Filter' });
}

/** Wählt den ersten Punkt mit Langtext und gibt den Langtext selbst zurück. */
function langtext(): HTMLElement {
  for (const punkt of document.querySelectorAll('[data-slot]')) {
    fireEvent.click(punkt);
    const block = screen.queryByRole('region', { name: 'Langtext' });
    const text = block?.querySelector<HTMLElement>('.whitespace-pre-wrap');
    if (text !== null && text !== undefined) return text;
  }
  throw new Error('Keine Position mit Langtext in der Musterdatei');
}

/** Wählt das erste Wort aus Buchstaben aus, wie mit der Maus. */
function waehleWort(text: HTMLElement): string {
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
    fireEvent.mouseUp(node.parentElement ?? text);
    return match[0];
  }
  throw new Error('Kein Wort im Langtext');
}

describe('Anstreichen im Langtext', () => {
  it('streicht eine Auswahl an, listet sie, speichert sie und entfernt sie wieder', async () => {
    await ladeDatei();
    const wort = waehleWort(langtext());
    const leiste = await screen.findByRole('toolbar', { name: 'Anstreichen' });
    fireEvent.click(within(leiste).getByRole('button', { name: 'Gelb anstreichen' }));

    expect(screen.queryByRole('toolbar', { name: 'Anstreichen' })).toBeNull();
    const liste = screen.getByRole('list', { name: 'Meine Anstreichungen' });
    expect(within(liste).getByText(`„${wort}“`)).toBeInTheDocument();
    expect(screen.getByText('Meine Anstreichungen · 1')).toBeInTheDocument();

    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ painted: 1 }));
    const gespeichert = await readLastLv();
    const [liste0] = [...(gespeichert?.annotations.highlights.values() ?? [])];
    expect(liste0?.map((mark) => [mark.paint, mark.text])).toEqual([['gelb', wort]]);

    fireEvent.click(within(liste).getByRole('button', { name: 'Anstreichung entfernen' }));
    expect(screen.queryByRole('list', { name: 'Meine Anstreichungen' })).toBeNull();
    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ painted: 0 }));
  });

  it('schließt die Leiste mit Escape, ohne anzustreichen', async () => {
    await ladeDatei();
    waehleWort(langtext());
    await screen.findByRole('toolbar', { name: 'Anstreichen' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('toolbar', { name: 'Anstreichen' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Meine Anstreichungen' })).toBeNull();
  });
});
