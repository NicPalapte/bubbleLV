// Eigene Suche im PDF (Entscheidung 0084, ersetzt 0077): Das Suchfeld im Bereich
// „Dokument“ sucht nur in PDFs, die Suchleiste oben nur im LV.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF mit festem Seitentext,
// und die Seiten selbst werden nicht gezeichnet.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const SEITEN = [
  'Abdichtung der Kellerwände mit Bitumendickbeschichtung.',
  'Bodenplatte aus WU-Beton.',
  'Übergang Bitumendickbeschichtung zu WU-Beton mit Fugenblech.',
];

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({ PdfPage: () => null }));

function scheinPdf(name: string, id = 'abc123def456'): OpenedPdf {
  const pdf = {
    numPages: SEITEN.length,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [{ str: SEITEN[page - 1] }] }),
      }),
  };
  return { id, name, pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  // Die Arbeitsfläche steht erst mit dem Baum, in langsamen Umgebungen etwas später.
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
}

async function oeffnePdf(name: string, id?: string): Promise<void> {
  openPdf.mockResolvedValue(scheinPdf(name, id));
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: [new File(['%PDF'], name, { type: 'application/pdf' })] },
  });
  await screen.findByRole('textbox', { name: 'Im PDF suchen' }, { timeout: 3000 });
}

/** Wählt den ersten Punkt mit Langtext und gibt den Langtext zurück. */
function langtext(): HTMLElement {
  for (const punkt of document.querySelectorAll('[data-slot]')) {
    fireEvent.click(punkt);
    const block = screen.queryByRole('region', { name: 'Langtext' });
    const text = block?.querySelector<HTMLElement>('.whitespace-pre-wrap');
    if (text !== null && text !== undefined) return text;
  }
  throw new Error('Keine Position mit Langtext in der Musterdatei');
}

/** Wählt das erste längere Wort aus und klickt rechts darauf. */
function waehleWort(text: HTMLElement): string {
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const match = /\p{L}{5,}/u.exec(node.textContent ?? '');
    if (match === null) continue;
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    fireEvent.mouseUp(node.parentElement ?? text);
    fireEvent.contextMenu(node.parentElement ?? text);
    return match[0];
  }
  throw new Error('Kein Wort im Langtext');
}

describe('Eigene Suche im PDF', () => {
  it('sucht im PDF, ohne die Suche im LV zu ändern', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');

    fireEvent.change(screen.getByRole('textbox', { name: 'Im PDF suchen' }), {
      target: { value: 'bitumendick' },
    });
    expect(await screen.findByText('1/2')).toBeInTheDocument();
    await new Promise((done) => setTimeout(done, 400));
    expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveValue('');
  });

  it('durchsucht mit der Suchleiste oben nur das LV', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    const suche = screen.getByRole('textbox', { name: 'Suche' });
    fireEvent.focus(suche);
    fireEvent.change(suche, { target: { value: 'bitumendick' } });
    await new Promise((done) => setTimeout(done, 400));
    expect(screen.getByRole('textbox', { name: 'Im PDF suchen' })).toHaveValue('');
    expect(screen.queryByText('1/2')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Treffer je Quelle' })).toBeNull();
  });

  it('zählt Treffer in den anderen offenen PDFs und wechselt per Klick', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    await oeffnePdf('vorbemerkungen.pdf', 'fff000fff000');

    const feld = screen.getByRole('textbox', { name: 'Im PDF suchen' });
    fireEvent.focus(feld);
    fireEvent.change(feld, { target: { value: 'WU-Beton' } });
    const liste = await screen.findByRole('group', { name: 'Treffer in offenen PDFs' });
    await waitFor(() => expect(within(liste).getAllByText('2')).toHaveLength(2));

    fireEvent.click(within(liste).getByRole('button', { name: /baubeschreibung\.pdf/ }));
    expect(screen.getByRole('combobox', { name: 'Dokument wählen' })).toHaveValue('abc123def456');
  });

  it('holt das Suchfeld mit Strg F, wenn zuletzt ins Dokument geklickt wurde', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    const feld = screen.getByRole('textbox', { name: 'Im PDF suchen' });

    // Klick woanders: Strg F bleibt beim Browser.
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true });
    expect(feld).not.toHaveFocus();

    fireEvent.pointerDown(screen.getByTitle('baubeschreibung.pdf'));
    fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true });
    expect(feld).toHaveFocus();

    // Danach per Tab in die Suchleiste oben: Strg F gehört wieder dem Browser.
    const suche = screen.getByRole('textbox', { name: 'Suche' });
    suche.focus();
    fireEvent.keyDown(suche, { key: 'f', ctrlKey: true });
    expect(suche).toHaveFocus();
  });

  it('sucht einen markierten Begriff aus dem Langtext im PDF', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    const wort = waehleWort(langtext());
    const menue = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    fireEvent.click(within(menue).getByRole('button', { name: 'Im PDF suchen' }));
    expect(screen.getByRole('textbox', { name: 'Im PDF suchen' })).toHaveValue(wort);
    await new Promise((done) => setTimeout(done, 400));
    expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveValue('');
  });
});
