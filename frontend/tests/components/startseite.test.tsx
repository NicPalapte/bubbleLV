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
import { BUILD_ID, buildDate } from '../../src/lib/version';

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

describe('Bau-Stand', () => {
  it('steht in der Kopfleiste, auch ohne geladene Datei', () => {
    render(<App />);
    const leiste = within(screen.getByRole('banner'));
    expect(leiste.getByText('BETA')).toBeInTheDocument();
    expect(leiste.getByText(BUILD_ID)).toBeInTheDocument();
    const datum = buildDate();
    if (datum !== '') expect(leiste.getByText(datum)).toBeInTheDocument();
  });

  it('gibt mit geladener Datei den Platz frei und behält das Datum im Tooltip', async () => {
    render(<App />);
    ladeDatei();
    await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
    const leiste = within(screen.getByRole('banner'));
    expect(leiste.getByText('BETA')).toBeInTheDocument();
    const datum = buildDate();
    if (datum !== '') {
      expect(leiste.queryByText(datum)).not.toBeInTheDocument();
      expect(
        leiste.getByTitle(new RegExp(`vom ${datum.replace(/\./g, '\\.')}`)),
      ).toBeInTheDocument();
    }
  });

  it('nennt denselben Stand, den die Meldung mitschickt', async () => {
    render(<App />);
    const gezeigt = within(screen.getByRole('banner')).getByText(BUILD_ID).textContent ?? '';
    expect(gezeigt).not.toBe('');
    // Eine Quelle für beide (lib/version.ts): der Nutzer liest genau den Wert,
    // der später in seiner Meldung steht — Stand **und** Datum, in derselben
    // Schreibweise.
    const text = issueBody({ view: 'table', loaded: false });
    expect(text).toContain(`Bubble-Stand: ${gezeigt}`);
    const datum = buildDate();
    if (datum !== '') expect(text).toContain(`vom ${datum}`);
  });
});
