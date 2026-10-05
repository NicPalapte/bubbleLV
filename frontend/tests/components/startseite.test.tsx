// Startseite vor dem ersten Laden (Issue #72) und der sichtbare Bau-Stand
// (Issue #71). Beides gehört zur Public Beta: wer die Seite zum ersten Mal
// öffnet, soll wissen, wo seine Datei bleibt — und wer meldet, welchen Stand
// er gerade benutzt hat.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { issueBody } from '../../src/lib/export/issueLink';
import { APP_VERSION, BUILD_ID, buildDate } from '../../src/lib/version';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function ladeDatei(): void {
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
}

describe('Startseite', () => {
  it('bietet die zwei Wege ins LV und sagt, wo die Datei bleibt', () => {
    render(<App />);
    expect(screen.getByText('Erlebe dein Leistungsverzeichnis wie nie zuvor.')).toBeInTheDocument();
    expect(screen.getByText('Eigenes LV öffnen')).toBeInTheDocument();
    expect(screen.getByText('Demo-LV ansehen')).toBeInTheDocument();
    // Die Zusage im Klartext, nicht nur in der Datenschutzerklärung (Issue #72).
    expect(screen.getByText('Die Datei bleibt im Browser')).toBeInTheDocument();
  });

  it('zeigt vor dem Laden weder Suche noch Befehle', async () => {
    render(<App />);
    expect(screen.queryByLabelText('Suche')).toBeNull();
    // Die Palette hängt am geladenen LV (TopBar: `loaded &&`).
    await act(async () => {});
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog', { name: 'Kommandopalette' })).toBeNull();
  });

  it('tritt zurück, sobald eine Datei geladen ist, und kommt beim Schließen wieder', async () => {
    render(<App />);
    ladeDatei();
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    expect(screen.queryByText('Eigenes LV öffnen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    expect(screen.getByText('Eigenes LV öffnen')).toBeInTheDocument();
  });
});

describe('Über diese App', () => {
  function oeffnePanel(): HTMLElement {
    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Über diese App' }),
    );
    const fenster = [...document.body.children].filter(
      (element) => (element as HTMLElement).style.position === 'fixed',
    );
    return fenster[fenster.length - 1] as HTMLElement;
  }

  it('sitzt hinter dem Logo und nennt Version und Stand', () => {
    render(<App />);
    const panel = within(oeffnePanel());
    expect(panel.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
    expect(panel.getByText(new RegExp(BUILD_ID))).toBeInTheDocument();
    expect(panel.getByRole('button', { name: /Was ist neu/ })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Fehler melden' })).toBeInTheDocument();
    expect(panel.getByRole('radiogroup', { name: 'Design' })).toBeInTheDocument();
    // Ehrlicher Hinweis statt Link ins Leere, solange die Texte fehlen.
    expect(panel.getByText('Impressum')).toBeInTheDocument();
    expect(panel.getAllByText('folgt')).toHaveLength(2);
  });

  it('öffnet auch ohne geladene Datei — dann meldet vielleicht gerade jemand das Laden', () => {
    render(<App />);
    expect(screen.queryByText('FILTER')).not.toBeInTheDocument();
    const panel = within(oeffnePanel());
    expect(panel.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });

  it('nennt denselben Stand, den die Meldung mitschickt', () => {
    render(<App />);
    const panel = within(oeffnePanel());
    // Eine Quelle für beide (lib/version.ts): der Nutzer liest genau den Wert,
    // der später in seiner Meldung steht — Stand und Datum.
    expect(panel.getByText(new RegExp(BUILD_ID))).toBeInTheDocument();
    const text = issueBody({ view: 'table', loaded: false });
    expect(text).toContain(`Bubble-Stand: v${APP_VERSION} (${BUILD_ID}`);
    const datum = buildDate();
    if (datum !== '') {
      expect(panel.getByText(new RegExp(datum.replace(/\./g, '\\.')))).toBeInTheDocument();
      expect(text).toContain(datum);
    }
  });

  it('gibt der Kopfleiste den Platz zurück — kein Stand-Schild mehr daneben', async () => {
    render(<App />);
    ladeDatei();
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    // Der Stand steht im Panel, nicht in der Leiste (Issue #80: kein Platz).
    expect(within(screen.getByRole('banner')).queryByText('BETA')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Über diese App' }),
    ).toBeInTheDocument();
  });
});

describe('Design hinter dem Logo', () => {
  it('schaltet zwischen Hell und Dunkel, ohne etwas zu speichern', () => {
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Über diese App' }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dunkel' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Hell' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.length).toBe(0);
  });

  it('bietet „Anderes LV öffnen" erst mit geladenem LV', async () => {
    render(<App />);
    const banner = within(screen.getByRole('banner'));
    fireEvent.click(banner.getByRole('button', { name: 'Über diese App' }));
    expect(screen.queryByRole('button', { name: 'Anderes LV öffnen' })).toBeNull();
    fireEvent.click(banner.getByRole('button', { name: 'Über diese App' }));

    ladeDatei();
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    fireEvent.click(banner.getByRole('button', { name: 'Über diese App' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anderes LV öffnen' }));
    expect(screen.getByText('Eigenes LV öffnen')).toBeInTheDocument();
  });
});
