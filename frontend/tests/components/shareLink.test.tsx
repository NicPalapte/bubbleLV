// Geteilter Link in der App (WP-P, Schritt 2). Die Abnahme aus dem Plan:
// „Ein geteilter Link stellt Ansicht und Filter wieder her, sobald dieselbe
// Datei geladen ist — ohne Fachdaten im Link außer der OZ der Auswahl."
// Seit Entscheidung 0055 steht statt der OZ ein Inhalts-Hash im Link.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { ANDERE_DATEI } from '../../src/components/common/useShareLink';
import { collectPositions } from '../../src/lib/tree/buildTree';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

/** Das Fragment, das die App gerade geschrieben hat. */
function fragment(): string {
  return window.location.hash;
}

function setzeFragment(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

beforeEach(() => {
  setzeFragment('');
});

afterEach(() => {
  setzeFragment('');
});

async function ladeDatei(name: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

async function ladeApp(name = 'gaeb-xml-beispiel.x83'): Promise<void> {
  render(<App />);
  await ladeDatei(name);
}

/** Suche setzen und warten, bis sie (entprellt) in der Adresszeile steht. */
async function sucheBeton(): Promise<void> {
  fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
  await waitFor(() => expect(fragment()).toContain('q=Beton'));
}

/** Die Tabelle als Bereich im Splitscreen. */
function tabellenfenster(): HTMLElement | null {
  return screen.queryByRole('region', { name: 'Tabelle — Bereich' });
}

describe('Geteilter Link · schreiben', () => {
  it('hält die Adresszeile leer, solange nichts eingestellt ist', async () => {
    await ladeApp();
    await new Promise((fertig) => setTimeout(fertig, 400));
    expect(fragment()).toBe('');
  });

  it('schreibt die Suche in die Adresszeile — die Ansicht bleibt draußen', async () => {
    // Der Graph ist der Hauptscreen; ein offener Bereich ist keine Ansicht.
    await ladeApp();
    await sucheBeton();
    expect(fragment()).not.toContain('v=');
  });

  it('schreibt den Pfad nicht weg', async () => {
    // Die App liegt unter einem Pfad (GitHub Pages, PR-Vorschau) — ein nacktes
    // „#…" würde ihn verwerfen.
    window.history.replaceState(null, '', '/pr-preview/pr-65/');
    await ladeApp();
    await sucheBeton();
    expect(window.location.pathname).toBe('/pr-preview/pr-65/');
  });
});

describe('Geteilter Link · lesen', () => {
  it('stellt Ansicht, Suche und Facette wieder her, sobald die Datei geladen ist', async () => {
    setzeFragment('#v=table~q=Beton~f.einheit=m3');
    await ladeApp();

    // Ein alter Link auf die Tabelle öffnet den Graphen mit der Tabelle.
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    // Die Facette steht als gesetzter Filter in der Filterleiste.
    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Einheit, 1 gewählt' }));
    const einheit = within(screen.getByRole('group', { name: 'Einheit' }));
    expect(einheit.getByRole('checkbox', { name: /^m³/ })).toBeChecked();
  });

  it('öffnet einen Link auf den Überblick als Bereich im Splitscreen', async () => {
    setzeFragment('#v=overview');
    await ladeApp();

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Überblick — Bereich' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
  });

  it('wählt die Position aus der OZ des Links', async () => {
    setzeFragment('#v=table~p=001.004.0030');
    await ladeApp();

    // Die Eigenschaften zeigen genau diese Position.
    await waitFor(() => expect(screen.getAllByText('001.004.0030').length).toBeGreaterThan(0));
  });

  it('übergeht eine OZ, die es in dieser Datei nicht gibt — der Rest des Links gilt', async () => {
    setzeFragment('#v=table~p=999.999.9999.gibt-es-nicht');
    await ladeApp();

    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
  });

  it('macht aus einem kaputten Link keinen kaputten Zustand', async () => {
    setzeFragment('#v=raumschiff~f.erfunden=xyz~m=viel,mehr');
    await ladeApp();

    // Der Graph ist die Eingangsansicht, Überblick zu — der Link hat nichts geändert.
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Überblick — Bereich' })).toBeNull();
    expect(screen.getByLabelText('Suche')).toHaveValue('');
  });
});

describe('Was im Link steht', () => {
  it('trägt weder Dateinamen noch Projektnamen — und keine Position ohne Auswahl', async () => {
    await ladeApp();
    expect(tabellenfenster()).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(fragment()).toContain('q=Beton'));

    const hash = decodeURIComponent(fragment());
    // Weder Dateiname noch Projektname stehen im Link.
    expect(hash).not.toContain('gaeb-xml-beispiel');
    expect(hash).not.toContain('BVBS');
    // Und keine Position, solange keine gewählt ist.
    expect(hash).not.toContain('p=');
  });
});

describe('Geteilter Link · Positions-Hash', () => {
  const NAME = 'gaeb-xml-beispiel.x83';
  const OZ = '001.004.0030';

  /** Hash und Datei-ID so, wie die App sie für die Fixture berechnet. */
  function erwartet(): { pos: string; lv: string } {
    const bytes = readFileSync(resolve(FIXTURE_DIR, NAME));
    const loaded = runPipeline(new Uint8Array(bytes).buffer, NAME);
    const node = collectPositions(loaded.tree).find((n) => n.position?.oz === OZ);
    if (node?.position == null || loaded.fileId === null) throw new Error('Fixture ohne OZ');
    return { pos: node.position.hashes.id, lv: loaded.fileId };
  }

  it('wählt die Position aus dem Hash des Links', async () => {
    setzeFragment(`#v=table~pos=${erwartet().pos}`);
    await ladeApp(NAME);
    await waitFor(() => expect(screen.getAllByText(OZ).length).toBeGreaterThan(0));
  });

  it('schreibt die Auswahl als Datei-ID und Hash, nicht als OZ', async () => {
    // Ein älterer Link mit OZ wählt die Position; die App schreibt ihn neu.
    setzeFragment(`#p=${OZ}`);
    await ladeApp(NAME);
    const { pos, lv } = erwartet();
    await waitFor(() => expect(fragment()).toBe(`#lv=${lv}~pos=${pos}`));
  });

  it('sagt, wenn der Link aus einer anderen Datei stammt', async () => {
    setzeFragment(`#lv=000000000000~pos=${erwartet().pos}`);
    await ladeApp(NAME);
    await waitFor(() => expect(screen.getByText(ANDERE_DATEI)).toBeInTheDocument());
    expect(screen.getAllByText(OZ).length).toBeGreaterThan(0);
  });
});

describe('Geteilter Link · zweite Datei', () => {
  it('lässt den Link der vorigen Datei nicht auf die nächste übergreifen', async () => {
    // Ein Re-Import ersetzt den kompletten Session-Zustand
    // (docs/architecture/data-model.md#re-import-in-derselben-session). Das
    // Fragment der ersten Datei dürfte sonst still weiterwirken: seine
    // Filter gehören zu einer Datei, die gar nicht mehr offen ist.
    setzeFragment('#v=table~q=Beton');
    await ladeApp();
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    await waitFor(() => expect(screen.getByLabelText('GAEB-Datei auswählen')).toBeVisible());
    await ladeDatei('sample.X83');

    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
    expect(screen.getByLabelText('Suche')).toHaveValue('');
    // Die Adresszeile wird leer — je nach Weg sofort beim Import oder nach der
    // Entprellung des Schreibens.
    await waitFor(() => expect(fragment()).toBe(''));
  });

  it('räumt die Adresszeile, wenn das LV geschlossen wird', async () => {
    await ladeApp();
    await sucheBeton();

    fireEvent.click(screen.getByRole('button', { name: /LV schließen/ }));
    await waitFor(() => expect(fragment()).toBe(''));
  });
});

describe('Geteilter Link · Wettlauf mit dem Dateidialog', () => {
  it('überlebt, wenn die Datei erst nach einer Weile ausgewählt wird', async () => {
    // Wer einen Link öffnet, sucht die Datei erst im Dateidialog — das dauert
    // länger als die Entprällung von 300 ms. Bis dahin darf nichts das
    // Fragment wegräumen, sonst ist der Link weg, bevor er gelesen wird.
    setzeFragment('#v=table~q=Beton');
    render(<App />);
    await new Promise((fertig) => setTimeout(fertig, 500));
    expect(fragment()).toBe('#v=table~q=Beton');

    await ladeDatei('gaeb-xml-beispiel.x83');
    await waitFor(() => expect(tabellenfenster()).toBeInTheDocument());
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });
});
