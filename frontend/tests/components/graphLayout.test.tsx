// Gliederung des Graphen (docs/decisions/0035-graph-gliederung.md): „nach LV"
// und „Matrix" mit der Größe in der aufklappbaren „Darstellung" an der Steuerung
// unten rechts (Issue #154), dazu die Hinweise — ohne dass Filter, Suche oder
// Auswahl davon etwas mitbekommen. Am Ende das Rechtsklick-Menü (Issue #155).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import App from '../../src/App';

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

// jsdom misst jedes Element mit 0×0 — dann läge der ganze Graph außerhalb des
// Ausschnitts und es würde keine einzige Bubble gezeichnet.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function rect(): DOMRect {
    return {
      width: 1200,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

async function loadAndShowGraph(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
}

function oeffneFilter(): void {
  fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
}

/** Größe und Gliederung an der Steuerung aufklappen. */
function oeffneDarstellung(): void {
  fireEvent.click(screen.getByTitle('Darstellung: Größe und Gliederung'));
}

/** Suchbegriff setzen und warten, bis die entprellte Suche greift. */
async function search(value: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Suche'), { target: { value } });
  await screen.findByRole('radiogroup', { name: 'Nicht-Treffer' });
}

function graph(): HTMLElement {
  return screen.getByRole('group', { name: /Bubble-Graph/ });
}

/** Beschriftungen im Canvas — Kopfleiste und Fenster zählen nicht mit. */
function graphText(): string {
  return [...graph().querySelectorAll('svg')].map((svg) => svg.textContent ?? '').join(' ');
}

describe('Gliederung im Graphen', () => {
  it('beginnt „nach LV" mit einem Kreis je Abschnitt', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    expect(screen.getByRole('radio', { name: 'nach LV' })).toBeChecked();
    expect(graph().querySelectorAll('[data-group]').length).toBeGreaterThan(1);
    expect(graph().querySelectorAll('[data-tier="position"]').length).toBeGreaterThan(0);
    // Ohne „Matrix" gibt es keine Zeilen und Spalten zu wählen.
    expect(screen.queryByRole('radiogroup', { name: 'Zeilen' })).not.toBeInTheDocument();
  });

  it('ordnet „Matrix" nach Merkmalen und macht einen neuen Filter zur Spalte', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
    expect(screen.getByRole('radiogroup', { name: 'Zeilen' })).toBeInTheDocument();
    // Zeilen nach Einheit: die Gruppen tragen die Einheit als Titel.
    expect(graphText()).toContain('m³');
    expect(graphText()).not.toContain('→');

    oeffneFilter();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Filterleiste' })).getByRole('button', {
        name: 'Positionsart',
      }),
    );
    const art = within(screen.getByRole('group', { name: 'Positionsart' }));
    fireEvent.click(art.getAllByRole('checkbox')[0]);

    const spalten = within(screen.getByRole('radiogroup', { name: 'Spalten' }));
    await waitFor(() => expect(spalten.getByRole('radio', { name: 'Positionsart' })).toBeChecked());
    // Die Matrix beschriftet ihre Achsen.
    expect(graphText()).toContain('Positionsart →');
    expect(graphText()).toContain('Einheit ↓');
  });

  it('lässt Suche und Auswahl beim Umschalten unangetastet', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    await search('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'nach LV' }));
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('sagt es, wenn ein Filter gar nichts trifft', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    await search('zzz-kein-treffer-zzz');
    expect(screen.getByText(/^Keine Treffer$/)).toBeInTheDocument();
  });

  it('lässt Nicht-Treffer beim Ausblenden aus dem Graphen fallen', async () => {
    await loadAndShowGraph();
    oeffneFilter();
    const vorher = graph().querySelectorAll('[data-tier="position"]').length;
    expect(screen.queryByRole('radiogroup', { name: 'Nicht-Treffer' })).not.toBeInTheDocument();
    await search('Beton');
    fireEvent.click(screen.getByRole('radio', { name: 'ausblenden' }));
    const nachher = graph().querySelectorAll('[data-tier="position"]').length;
    expect(nachher).toBeGreaterThan(0);
    expect(nachher).toBeLessThan(vorher);
  });
});

describe('Steuerung am Graphen', () => {
  it('sperrt „Preis" bei einer Datei ohne Preise', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    const groesse = within(screen.getByRole('radiogroup', { name: 'Größe der Positionen' }));
    expect(groesse.getByRole('radio', { name: 'Preis' })).toBeDisabled();
    expect(groesse.getByRole('radio', { name: 'Menge' })).toBeChecked();
  });

  it('blendet Ringe und Schilder mit „⚠ Hinweise" aus und wieder ein', async () => {
    await loadAndShowGraph();
    const schalter = screen.getByRole('button', { name: '⚠ Hinweise' });
    expect(schalter).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(schalter);
    expect(schalter).toHaveAttribute('aria-pressed', 'false');
    expect(graph().querySelectorAll('[data-hint]').length).toBe(0);
    expect(graph().querySelectorAll('[data-pin]').length).toBe(0);
  });

  it('wandert mit den Pfeiltasten durch die Positionen und öffnet mit Enter die Karte', async () => {
    await loadAndShowGraph();
    const canvas = graph();
    const ansage = canvas.querySelector('.sr-only') as HTMLElement;
    fireEvent.focus(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    const erste = ansage.textContent ?? '';
    expect(erste).not.toBe('');
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(ansage.textContent).not.toBe(erste);
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(
      await screen.findByRole('button', { name: 'In der Tabelle zeigen' }),
    ).toBeInTheDocument();
  });
});

describe('Sprung in die Tabelle', () => {
  it('führt vom Abschnitt über die Karte in die Tabelle', async () => {
    await loadAndShowGraph();
    // Ein Klick auf einen Kreis öffnet die Karte des Abschnitts …
    fireEvent.click(graph().querySelector('[data-group] circle') as SVGCircleElement);
    const knopf = await screen.findByRole('button', { name: 'In der Tabelle zeigen' });

    // … und von dort führt der Knopf in die Tabelle — den Bereich neben dem Graphen.
    fireEvent.click(knopf);
    const fenster = within(screen.getByRole('region', { name: 'Tabelle — Bereich' }));
    expect(fenster.getByRole('grid', { name: 'Positionen' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Bubble-Graph' })).toBeInTheDocument();
  });
});

describe('Wechsel der Gliederung (Entscheidung 0059)', () => {
  function canvas(): SVGSVGElement {
    const svg = graph().querySelector('svg');
    if (svg === null) throw new Error('Graph ohne SVG');
    return svg;
  }

  it('lässt die Punkte gleiten, solange gewechselt wird', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    expect(canvas()).not.toHaveClass('graph-morph');
    fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
    expect(canvas()).toHaveClass('graph-morph');
    await waitFor(() => expect(canvas()).not.toHaveClass('graph-morph'), { timeout: 3000 });
  });

  it('springt bei „Bewegung reduzieren" ohne Gleiten', async () => {
    const before = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      await loadAndShowGraph();
      oeffneDarstellung();
      fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
      expect(canvas()).not.toHaveClass('graph-morph');
    } finally {
      window.matchMedia = before;
    }
  });

  it('zeichnet Kacheln nach Anzahl und hebt die unter der Maus samt Achsen hervor', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Zeilen' })).getByRole('radio', {
        name: 'Abschnitt',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Spalten' })).getByRole('radio', {
        name: 'Einheit',
      }),
    );
    const tiles = [...graph().querySelectorAll('rect.graph-tile:not(.is-empty)')];
    expect(tiles.length).toBeGreaterThan(0);
    expect(
      tiles.every((tile) => /^var\(--heat-[1-5]\)$/.test(tile.getAttribute('fill') ?? '')),
    ).toBe(true);
    expect(graph().querySelector('.is-hot')).toBeNull();
    fireEvent.mouseOver(tiles[0]);
    expect(tiles[0]).toHaveClass('is-hot');
    // Eine Zeilen- und eine Spaltenbeschriftung leuchten mit.
    expect(graph().querySelectorAll('.graph-axis.is-on')).toHaveLength(2);
  });

  it('bietet Abschnitt nur als Zeile an, nicht als Spalte', async () => {
    await loadAndShowGraph();
    oeffneDarstellung();
    fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
    const zeilen = within(screen.getByRole('radiogroup', { name: 'Zeilen' }));
    const spalten = within(screen.getByRole('radiogroup', { name: 'Spalten' }));
    expect(zeilen.getByRole('radio', { name: 'Abschnitt' })).toBeInTheDocument();
    expect(spalten.queryByRole('radio', { name: 'Abschnitt' })).not.toBeInTheDocument();
  });
});

describe('Rechtsklick im Graphen (Issue #155)', () => {
  it('setzt Fortschritt und „Wichtig" an einem Punkt, ohne ihn auszuwählen', async () => {
    await loadAndShowGraph();
    const punkt = graph().querySelector('[data-slot]') as SVGElement;
    expect(fireEvent.contextMenu(punkt)).toBe(false);
    let menue = within(screen.getByRole('menu', { name: /^Position / }));
    // Offen ist gesetzt, Wichtig nicht.
    expect(menue.getByRole('menuitemradio', { name: 'Offen' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(menue.getByRole('menuitemradio', { name: 'Erledigt' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-note="fertig"]')).toHaveLength(1);
    // Keine Karte: der Rechtsklick wählt nichts aus.
    expect(screen.queryByRole('button', { name: 'Fortschritt' })).not.toBeInTheDocument();

    fireEvent.contextMenu(punkt);
    menue = within(screen.getByRole('menu', { name: /^Position / }));
    fireEvent.click(menue.getByRole('menuitemcheckbox', { name: /Wichtig/ }));
    expect(document.querySelectorAll('[data-note="wichtig"]')).toHaveLength(1);
  });

  it('nimmt eine Position in den Vergleich und schließt mit Escape', async () => {
    await loadAndShowGraph();
    const punkt = graph().querySelector('[data-slot]') as SVGElement;
    fireEvent.contextMenu(punkt);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Zum Vergleich hinzufügen' }));
    const fenster = within(screen.getByRole('region', { name: /Positionsvergleich/ }));
    expect(fenster.getAllByRole('columnheader')).toHaveLength(2);
    fireEvent.contextMenu(punkt);
    expect(screen.getByRole('menuitem', { name: 'Aus dem Vergleich nehmen' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sperrt „Zum Vergleich hinzufügen", wenn der Vergleich voll ist', async () => {
    await loadAndShowGraph();
    const punkte = [...graph().querySelectorAll('[data-slot]')];
    for (const punkt of punkte.slice(0, 4)) {
      fireEvent.contextMenu(punkt);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Zum Vergleich hinzufügen' }));
    }
    fireEvent.contextMenu(punkte[4]);
    expect(screen.getByRole('menuitem', { name: 'Zum Vergleich hinzufügen' })).toBeDisabled();
  });

  it('bietet am Abschnitt nur den Sprung in die Tabelle', async () => {
    await loadAndShowGraph();
    fireEvent.contextMenu(graph().querySelector('[data-group] circle') as SVGCircleElement);
    const menue = within(screen.getByRole('menu', { name: 'Abschnitt' }));
    expect(menue.getAllByRole('menuitem').map((eintrag) => eintrag.textContent)).toEqual([
      'In der Tabelle zeigen',
    ]);
    fireEvent.click(menue.getByRole('menuitem', { name: 'In der Tabelle zeigen' }));
    expect(screen.getByRole('region', { name: 'Tabelle — Bereich' })).toBeInTheDocument();
  });

  it('kopiert den Link zur Position und meldet, wenn das nicht geht', async () => {
    const kopiert: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (wert: string) => (kopiert.push(wert), Promise.resolve()) },
    });
    await loadAndShowGraph();
    const punkt = graph().querySelector('[data-slot]') as SVGElement;
    fireEvent.contextMenu(punkt);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Link zur Position kopieren' }));
    expect(await screen.findByText('Link zur Position kopiert.')).toBeInTheDocument();
    expect(kopiert).toHaveLength(1);
    expect(kopiert[0]).toContain('#');
    expect(kopiert[0]).toContain('pos=');

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    fireEvent.contextMenu(punkt);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Link zur Position kopieren' }));
    expect(await screen.findByText('Link konnte nicht kopiert werden.')).toBeInTheDocument();
  });

  it('öffnet dasselbe Menü auf einer Zeile der Tabelle', async () => {
    await loadAndShowGraph();
    fireEvent.contextMenu(graph().querySelector('[data-group] circle') as SVGCircleElement);
    fireEvent.click(screen.getByRole('menuitem', { name: 'In der Tabelle zeigen' }));
    const tabelle = within(screen.getByRole('region', { name: 'Tabelle — Bereich' }));
    const [zeile] = tabelle.getAllByRole('row').filter((row) => row.id !== '');
    expect(fireEvent.contextMenu(zeile)).toBe(false);
    const menue = within(screen.getByRole('menu', { name: /^Position / }));
    fireEvent.click(menue.getByRole('menuitemradio', { name: 'In Bearbeitung' }));
    expect(document.querySelectorAll('[data-note="bearbeitung"]').length).toBeGreaterThan(0);

    // Aus der Tabelle geht es in den Graphen, nicht noch einmal in die Tabelle.
    fireEvent.contextMenu(zeile);
    const zweites = within(screen.getByRole('menu', { name: /^Position / }));
    expect(zweites.queryByRole('menuitem', { name: 'In der Tabelle zeigen' })).toBeNull();
    fireEvent.click(zweites.getByRole('menuitem', { name: 'Im Graph zeigen' }));
    expect(screen.getByRole('button', { name: 'Fortschritt' })).toBeInTheDocument();
  });
});

describe('Abschnitt hervorheben (Entscheidung 0075)', () => {
  it('hebt per Klick auf eine Insel den Hauptabschnitt hervor, ✕ hebt es auf', async () => {
    await loadAndShowGraph();
    const insel = [...graph().querySelectorAll('[data-hull]')].at(-1) as SVGGElement;
    const titel = insel.querySelector('title')?.textContent ?? '';
    fireEvent.click(insel.querySelector('rect') as SVGRectElement);

    const bar = screen.getByRole('group', { name: 'Hervorhebung' });
    const leiste = within(bar);
    expect(titel).not.toBe('');
    expect(bar.textContent).toContain(titel);
    // Blass: die anderen Gruppen bleiben, mit wenig Deckkraft.
    const blass = (): number =>
      [...graph().querySelectorAll('[data-group]')].filter(
        (g) => Number(g.getAttribute('opacity')) < 0.5,
      ).length;
    const alle = graph().querySelectorAll('[data-group]').length;
    expect(blass()).toBeGreaterThan(0);
    // Die Suche bleibt leer — die Hervorhebung ist kein Filter.
    expect(screen.getByLabelText('Suche')).toHaveValue('');

    fireEvent.click(leiste.getByRole('radio', { name: 'ausblenden' }));
    expect(graph().querySelectorAll('[data-group]').length).toBeLessThan(alle);

    fireEvent.click(leiste.getByRole('button', { name: 'Hervorhebung aufheben' }));
    expect(screen.queryByRole('group', { name: 'Hervorhebung' })).toBeNull();
    expect(blass()).toBe(0);
  });

  it('hebt per Klick auf einen Kreis den Unterabschnitt hervor und wählt ihn', async () => {
    await loadAndShowGraph();
    const kreis = graph().querySelector('[data-group] circle') as SVGCircleElement;
    fireEvent.click(kreis);
    expect(screen.getByRole('group', { name: 'Hervorhebung' })).toBeInTheDocument();
    // Eine Position außerhalb wählen (hier: ein blasser Punkt) beendet die Hervorhebung.
    const draussen = [...graph().querySelectorAll('[data-slot]')].find(
      (el) => Number(el.getAttribute('opacity')) < 0.5,
    );
    expect(draussen).toBeDefined();
    fireEvent.click(draussen as Element);
    expect(screen.queryByRole('group', { name: 'Hervorhebung' })).toBeNull();
    fireEvent.click(kreis);
    expect(screen.getByRole('group', { name: 'Hervorhebung' })).toBeInTheDocument();
    // Klick ins Leere hebt die Hervorhebung auf.
    fireEvent.click(graph().querySelector('svg > rect') as SVGRectElement);
    expect(screen.queryByRole('group', { name: 'Hervorhebung' })).toBeNull();
  });
});
