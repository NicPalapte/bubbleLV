// Eigenes Anstreichen im Langtext (Entscheidung 0063): Text auswählen, Farbe
// wählen, Liste unter dem Langtext, Entfernen, Speichern zur letzten Datei.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { readLastLv, readLastLvMeta, readPaintNames } from '../../src/lib/persist/lastLv';

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
    const leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.click(within(leiste).getByRole('button', { name: 'Gelb markieren' }));

    expect(screen.queryByRole('toolbar', { name: 'Textmarkierung' })).toBeNull();
    const liste = screen.getByRole('list', { name: 'Meine Textmarkierungen' });
    expect(within(liste).getByText(`„${wort}“`)).toBeInTheDocument();
    const abschnitt = screen.getByRole('region', { name: 'Meine Textmarkierungen' });
    expect(within(abschnitt).getByText('1')).toBeInTheDocument();

    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ painted: 1 }));
    const gespeichert = await readLastLv();
    const [liste0] = [...(gespeichert?.annotations.highlights.values() ?? [])];
    expect(liste0?.map((mark) => [mark.paint, mark.text])).toEqual([['gelb', wort]]);

    fireEvent.click(within(liste).getByRole('button', { name: 'Textmarkierung entfernen' }));
    expect(screen.queryByRole('list', { name: 'Meine Textmarkierungen' })).toBeNull();
    await waitFor(async () => expect(await readLastLvMeta()).toMatchObject({ painted: 0 }));
  });

  it('schließt die Leiste mit Escape, ohne anzustreichen', async () => {
    await ladeDatei();
    waehleWort(langtext());
    await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('toolbar', { name: 'Textmarkierung' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Meine Textmarkierungen' })).toBeNull();
  });

  it('liest die Auswahl nur bei Shift + Auswahltaste neu, nicht bei Shift allein', async () => {
    await ladeDatei();
    const text = langtext();
    waehleWort(text);
    await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    window.getSelection()?.removeAllRanges();
    fireEvent.keyUp(text, { key: 'Shift', shiftKey: true });
    expect(screen.getByRole('toolbar', { name: 'Textmarkierung' })).toBeInTheDocument();
    fireEvent.keyUp(text, { key: 'ArrowLeft', shiftKey: true });
    expect(screen.queryByRole('toolbar', { name: 'Textmarkierung' })).toBeNull();
  });

  it('blendet die eigenen Farben über das Label aus und zeigt keinen Status mehr', async () => {
    await ladeDatei();
    waehleWort(langtext());
    const leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.click(within(leiste).getByRole('button', { name: 'Grün markieren' }));
    const label = screen.getByRole('button', { name: /^Meine Textmarkierungen/ });
    expect(label).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(label);
    expect(label).toHaveAttribute('aria-pressed', 'false');
    // Die Liste bleibt, nur die Farbe im Text ist aus.
    expect(screen.getByRole('list', { name: 'Meine Textmarkierungen' })).toBeInTheDocument();
    const eigenschaften = screen.getByRole('region', { name: 'Eigenschaften' });
    expect(within(eigenschaften).queryByText('Status')).toBeNull();
  });

  it('benennt Farben, zeigt den Namen in Leiste und Tabelle und speichert ihn', async () => {
    await ladeDatei();
    const text = langtext();
    waehleWort(text);
    let leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.click(within(leiste).getByRole('button', { name: 'Farben benennen…' }));
    const dialog = screen.getByRole('dialog', { name: 'Farben benennen' });
    fireEvent.change(within(dialog).getByLabelText('Name für Gelb'), {
      target: { value: 'wichtig' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Übernehmen' }));
    expect(screen.queryByRole('dialog', { name: 'Farben benennen' })).toBeNull();

    waehleWort(text);
    leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.click(within(leiste).getByRole('button', { name: 'Gelb (wichtig) markieren' }));
    const liste = screen.getByRole('list', { name: 'Meine Textmarkierungen' });
    expect(within(liste).getByText('wichtig')).toBeInTheDocument();
    await waitFor(async () => expect(await readPaintNames()).toEqual({ gelb: 'wichtig' }));
  });
});
