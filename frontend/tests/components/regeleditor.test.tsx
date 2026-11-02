// Regeleditor in den Admin-Werkzeugen (Entscheidungen 0081, 0089): Regel aus einer Markierung
// im Langtext, Bausteine ändern, Treffer-Vorschau, Schalter an/aus, Speichern im Browser.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { readGrundstockOff, readOwnRules } from '../../src/lib/persist/lastLv';
import { GRUNDSTOCK } from '../../src/lib/rules/rules';
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

describe('Regeleditor', () => {
  it('ist ohne Admin nicht erreichbar: keine „Als Regel…“ in der Leiste', async () => {
    await ladeDatei();
    markiereWort(await langtextBlock());
    const leiste = await screen.findByRole('toolbar', { name: 'Textmarkierung' });
    expect(within(leiste).queryByRole('button', { name: 'Als Regel…' })).toBeNull();
  });

  it('macht aus einer Markierung eine Regel, zeigt Treffer und färbt nach dem Anschalten', async () => {
    await ladeDatei();
    await oeffneAdmin(PASSWORT);
    await screen.findByRole('button', { name: 'Admin' });
    const wort = markiereWort(await langtextBlock());
    fireEvent.click(await screen.findByRole('button', { name: 'Als Regel…' }));

    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    expect(within(dialog).getByRole('textbox', { name: 'Name der Regel' })).toHaveValue(wort);
    expect(within(dialog).getByRole('textbox', { name: 'Begriff' })).toHaveValue(wort);
    expect(within(dialog).getByText(/^Wenn im Langtext/)).toHaveTextContent(`„${wort}“`);
    // Die markierte Stelle selbst trifft mindestens eine Position.
    expect(within(dialog).getByText(/von \d+ Positionen/).textContent).not.toMatch(/^0 /);
    await waitFor(async () =>
      expect((await readOwnRules())?.map((rule) => rule.status)).toEqual(['aus']),
    );
    // Neue Regeln starten aus; „Entwurf“ gibt es nicht mehr (Entscheidung 0089).
    expect(within(dialog).queryByRole('radio', { name: 'Entwurf' })).toBeNull();
    expect(within(dialog).getAllByText('eigene')).toHaveLength(2);

    fireEvent.click(within(dialog).getAllByRole('switch', { name: `${wort} an` })[0]);
    await waitFor(async () =>
      expect((await readOwnRules())?.map((rule) => rule.status)).toEqual(['freigegeben']),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Admin-Werkzeuge schließen' }));
    await waitFor(() =>
      expect(document.querySelectorAll(`[data-span-key="wichtig"]`).length).toBeGreaterThan(0),
    );
  });

  it('Grundstock lässt sich nur schalten und als eigene Regel kopieren', async () => {
    render(<App />);
    await oeffneAdmin(PASSWORT);
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Regeln' }));
    expect(await within(dialog).findByText(/Grundstock-Regel/)).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Name der Regel' })).toBeDisabled();
    expect(within(dialog).getByText(/Erst ein LV öffnen/)).toBeInTheDocument();
    const [base] = GRUNDSTOCK;
    const [schalter] = within(dialog).getAllByRole('switch', { name: `${base.name} an` });
    expect(schalter).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(schalter);
    await waitFor(async () => expect(await readGrundstockOff()).toEqual([base.id]));
    fireEvent.click(schalter);
    await waitFor(async () => expect(await readGrundstockOff()).toEqual([]));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Als eigene kopieren' }));
    expect(within(dialog).getByRole('textbox', { name: 'Name der Regel' })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Norm' }));
    await waitFor(async () => {
      const [own] = (await readOwnRules()) ?? [];
      expect(own.geltung).toBe('unternehmen');
      expect(own.status).toBe('freigegeben');
      expect(JSON.stringify(own.bedingung)).toContain('"norm":{}');
      // Urteile hängen an id@version: die erste inhaltliche Änderung ist eine neue Version.
      expect(own.version).toBe(2);
    });
    // Die Kopie ersetzt das Original: es ist jetzt aus.
    expect(await readGrundstockOff()).toEqual([base.id]);
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Norm' }));
    await waitFor(async () => {
      const [own] = (await readOwnRules()) ?? [];
      expect(JSON.stringify(own.bedingung).match(/"norm"/g)).toHaveLength(2);
      expect(own.version).toBe(2);
    });
  });

  it('Laden einer regeln.json überschreibt keine eigene Regel', async () => {
    render(<App />);
    await oeffneAdmin(PASSWORT);
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Regeln' }));
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Als eigene kopieren' }));
    const [own] = await waitFor(async () => {
      const rules = (await readOwnRules()) ?? [];
      expect(rules).toHaveLength(1);
      return rules;
    });

    const grundstock = JSON.parse(
      readFileSync(resolve(process.cwd(), '../docs/domain/reference/regeln.json'), 'utf8'),
    ) as { regeln: unknown[] };
    const file = {
      schema: 'bubble-rule-v1',
      regeln: [{ ...own, name: 'Von Kollegin' }, grundstock.regeln[0], { kaputt: true }],
    };
    fireEvent.change(within(dialog).getByLabelText('Regeln importieren'), {
      target: { files: [new File([JSON.stringify(file)], 'regeln.json')] },
    });
    expect(
      await within(dialog).findByText(
        '1 Regel übernommen, 2 übersprungen (Grundstock oder unlesbar).',
      ),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const rules = (await readOwnRules()) ?? [];
      expect(rules.map((rule) => rule.name).sort()).toEqual([own.name, 'Von Kollegin'].sort());
      expect(new Set(rules.map((rule) => rule.id)).size).toBe(2);
    });
  });

  it('bearbeitet Regeln mit neuen Bausteinen, Treffer mit Kurztext', async () => {
    await ladeDatei();
    await oeffneAdmin(PASSWORT);
    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin-Werkzeuge' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Regeln' }));
    const file = {
      schema: 'bubble-rule-v1',
      regeln: [
        {
          schema: 'bubble-rule-v1',
          id: 'normale-positionen',
          version: 1,
          name: 'Normale Positionen',
          bedingung: {
            alle: [{ feld: 'art', ist: ['normal'] }],
            bereich: 'feld',
            wo: ['langtext'],
          },
          wirkung: { hervorheben: 'wichtig' },
          geltung: 'unternehmen',
          status: 'entwurf',
        },
      ],
    };
    fireEvent.change(within(dialog).getByLabelText('Regeln importieren'), {
      target: { files: [new File([JSON.stringify(file)], 'regeln.json')] },
    });
    fireEvent.click(await within(dialog).findByRole('button', { name: /Normale Positionen/ }));
    expect(within(dialog).getByLabelText('Name der Regel')).toBeEnabled();
    expect(within(dialog).getByRole('combobox', { name: 'Angabe' })).toHaveValue('art');
    expect(within(dialog).getByRole('combobox', { name: 'Wert der Angabe' })).toHaveValue('normal');
    expect(within(dialog).getByText(/von \d+ Positionen/).textContent).not.toMatch(/^0 von/);

    // Neue Bausteine und Wirkung „Prüfhinweis“ (Entscheidung 0089).
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Wortliste' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Prüfhinweis' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Text des Prüfhinweises' }), {
      target: { value: 'Bitte prüfen.' },
    });
    await waitFor(async () => {
      const [own] = (await readOwnRules()) ?? [];
      expect(JSON.stringify(own.bedingung)).toContain('"liste"');
      expect(own.wirkung).toEqual({
        pruefhinweis: { kategorie: 'risiko', schwere: 'hinweis', text: 'Bitte prüfen.' },
      });
    });
    expect(within(dialog).getByText('So erscheint es in „Prüfung“')).toBeInTheDocument();
  });
});
