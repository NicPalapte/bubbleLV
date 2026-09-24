// Startseite vor dem ersten Laden (Issue #72) und der sichtbare Bau-Stand
// (Issue #71). Beides gehört zur Public Beta: wer die Seite zum ersten Mal
// öffnet, soll wissen, wo seine Datei bleibt — und wer meldet, welchen Stand
// er gerade benutzt hat.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Einstiegstext', () => {
  it('beantwortet die drei Fragen des ersten Besuchs', () => {
    render(<App />);
    expect(screen.getByText(/Bubble macht ein Leistungsverzeichnis lesbar/)).toBeInTheDocument();
    expect(screen.getByText('Was Bubble tut')).toBeInTheDocument();
    expect(screen.getByText('Wo die Datei bleibt')).toBeInTheDocument();
    expect(screen.getByText('Was es nicht ist')).toBeInTheDocument();
    // Die Zusage im Klartext, nicht nur in der Datenschutzerklärung.
    expect(screen.getByText(/Kein Server, kein Upload, kein Konto/)).toBeInTheDocument();
    // Und die Grenze, damit niemand Rechtsrat erwartet.
    expect(screen.getByText(/keine Rechtsberatung/)).toBeInTheDocument();
  });

  it('tritt zurück, sobald eine Datei geladen ist, und kommt beim Schließen wieder', async () => {
    render(<App />);
    ladeDatei();
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    expect(screen.queryByText('Was Bubble tut')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    expect(screen.getByText('Was Bubble tut')).toBeInTheDocument();
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
