// Ansicht „Matrix" (WP-O) in der App. Geprüft werden die beiden Zusagen aus
// dem Plan: Achsen und Zellwert lassen sich umschalten, ohne den Filter zu
// verlieren, und ein Klick auf eine Zelle führt zur passenden gefilterten
// Menge in der Tabelle.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import { MatrixView } from '../../src/components/matrix/MatrixView';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { LoadedLV } from '../../src/lib/pipeline/runPipeline';
import type { LVDraft } from '../../src/types/lvDraft';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

async function ladeMatrix(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Matrix' }));
}

function raster(): HTMLElement {
  return screen.getByRole('table', { name: 'Matrix' });
}

/**
 * Die Ansicht selbst. Nötig, weil die Filterleiste darüber dieselben
 * Facettennamen trägt — „Bauteiltyp ▾" gibt es dort wie hier.
 */
function ansicht() {
  return within(screen.getByRole('main', { name: 'Matrix' }));
}

/**
 * Das offene Popover. Es hängt per Portal direkt an <body> und ist die einzige
 * fest positionierte Fläche dort — über den Text zu suchen ginge daneben, weil
 * Achsenwahl, Filterleiste und Eigenschaften dieselben Facettennamen tragen.
 */
function popover() {
  const flaechen = [...document.body.children].filter(
    (element) => (element as HTMLElement).style.position === 'fixed',
  );
  return within(flaechen[flaechen.length - 1] as HTMLElement);
}

/** Die Filterleiste der Kopfzeile — dort stehen die gesetzten Facetten. */
function filterleiste() {
  return within(screen.getByRole('banner'));
}

/** Zellen mit Inhalt — die leeren sind keine Schaltflächen. */
function gefuellteZellen(): HTMLElement[] {
  return within(raster()).getAllByRole('button');
}

/** Die Kopfzeile der Ansicht als Text. */
function kopfzeile(): string {
  return screen.getByText(/Zellwert:/).textContent ?? '';
}

describe('Matrix', () => {
  it('spannt das Raster über die Standardachsen auf', async () => {
    await ladeMatrix();
    expect(raster()).toBeInTheDocument();
    expect(kopfzeile()).toContain('Gewerk × Bauteiltyp');
    expect(kopfzeile()).toContain('Zellwert: Anzahl Positionen');
    expect(gefuellteZellen().length).toBeGreaterThan(0);
  });

  it('lässt leere Zellen stehen, statt Zeilen zusammenzuschieben', async () => {
    await ladeMatrix();
    // Die erste Zeile ist der Spaltenkopf — sie trägt keine Zellen.
    const zeilen = within(raster()).getAllByRole('row').slice(1);
    // Jede Zeile hat gleich viele Zellen — auch die, in denen wenig steht.
    const breiten = new Set(zeilen.map((zeile) => within(zeile).getAllByRole('cell').length));
    expect(breiten.size).toBeLessThanOrEqual(1);
    // Und es gibt tatsächlich leere Zellen: sie tragen den Hinweis statt einer Zahl.
    expect(screen.getAllByTitle(/kommt nicht vor/).length).toBeGreaterThan(0);
  });

  it('wechselt die Achse, ohne Suche oder Zellwert zu verlieren', async () => {
    await ladeMatrix();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(screen.getByLabelText('Suche')).toHaveValue('Beton'));

    fireEvent.click(ansicht().getByRole('button', { name: /Bauteiltyp ▾/ }));
    fireEvent.click(popover().getByRole('button', { name: 'Einheit' }));

    expect(kopfzeile()).toContain('Gewerk × Einheit');
    expect(screen.getByLabelText('Suche')).toHaveValue('Beton');
  });

  it('nennt die Bezugsgröße, sobald gefiltert wird — bei jeder Art Filter', async () => {
    await ladeMatrix();
    expect(kopfzeile()).not.toContain('im aktuellen Filter');

    // Eine Suche ist ein Filter wie jeder andere: die Zahlen im Raster sind
    // danach keine Aussage mehr über das ganze LV.
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(kopfzeile()).toContain('im aktuellen Filter, von 28'));
  });

  it('tauscht die Achsen, wenn man die Facette der anderen wählt', async () => {
    await ladeMatrix();
    fireEvent.click(ansicht().getByRole('button', { name: /Gewerk ▾/ }));
    fireEvent.click(popover().getByRole('button', { name: 'Bauteiltyp' }));
    expect(kopfzeile()).toContain('Bauteiltyp × Gewerk');
  });

  it('filtert auf die Zelle und zeigt die Menge in der Tabelle', async () => {
    await ladeMatrix();
    // Eine Zelle, deren beide Werte echte Facettenwerte sind: „Ohne Angabe"
    // und „Weitere" lassen sich nicht als Filter ausdrücken.
    const zelle = gefuellteZellen().find(
      (kandidat) => !/Ohne Angabe|Weitere/.test(kandidat.getAttribute('aria-label') ?? ''),
    ) as HTMLElement;
    expect(zelle).toBeDefined();
    const beschriftung = zelle.getAttribute('aria-label') ?? '';
    const [gewerk, bauteiltyp] = beschriftung.split(',')[0].split(' × ');
    fireEvent.click(zelle);

    // Die Tabelle steht vorn …
    expect(screen.getByRole('radio', { name: 'Tabelle' })).toHaveAttribute('aria-checked', 'true');
    // … und beide Facetten stehen als Filter, mit genau dem Wert der Zelle.
    fireEvent.click(filterleiste().getByRole('button', { name: /Gewerk ▾/ }));
    expect(popover().getByTitle(gewerk)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.click(filterleiste().getByRole('button', { name: /Bauteiltyp ▾/ }));
    expect(popover().getByTitle(bauteiltyp)).toHaveAttribute('aria-pressed', 'true');
  });

  it('macht aus „Ohne Angabe" keinen Einstieg, den es nicht gibt', async () => {
    await ladeMatrix();
    // Die Zelle steht mit ihrer Zahl da — nur klicken lässt sie sich nicht:
    // es gibt keinen Facettenwert „ohne Wert", der genau sie trifft.
    const nichtFilterbar = screen.getAllByTitle(/nicht filterbar/);
    expect(nichtFilterbar.length).toBeGreaterThan(0);
    for (const zelle of nichtFilterbar) expect(zelle.tagName).toBe('TD');
    expect(
      gefuellteZellen().every(
        (zelle) => !/Ohne Angabe|Weitere/.test(zelle.getAttribute('aria-label') ?? ''),
      ),
    ).toBe(true);
  });

  it('sperrt den Zellwert „Menge", solange der Filter Einheiten mischt', async () => {
    await ladeMatrix();
    const menge = ansicht().getByRole('radio', { name: 'Menge' });
    // Die Musterdatei mischt Einheiten — m³ und Stück ergäben zusammen nichts.
    expect(menge).toBeDisabled();

    // Auf eine Einheit gefiltert steht die Menge zur Wahl …
    fireEvent.click(filterleiste().getByRole('button', { name: /Einheit ▾/ }));
    fireEvent.click(popover().getByTitle('m³'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(ansicht().getByRole('radio', { name: 'Menge' })).toBeEnabled());

    fireEvent.click(ansicht().getByRole('radio', { name: 'Menge' }));
    expect(kopfzeile()).toContain('Zellwert: Menge in m³');
  });
});

// ── Zelle mit Wert 0 ─────────────────────────────────────────────────────────
//
// Eine Zelle, die es gibt, deren Positionen aber keine Menge führen, hat den
// Wert 0. Ohne Zahl sähe sie aus wie eine Lücke — und eine Lücke heißt in
// dieser Ansicht „diese Kombination kommt nicht vor".

/** Zwei Positionen mit Einheit, aber ohne Menge. */
const OHNE_MENGEN: LVDraft = {
  projectName: 'Nullwert-Test',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los',
      sections: [
        {
          number: '01.001',
          label: 'Abschnitt',
          sections: [],
          positions: [1, 2].map((i) => ({
            oz: `01.001.00${i}0`,
            shortText: 'Innenwand herstellen',
            longText: 'Herstellen einer tragenden Innenwand aus Beton.',
            unit: 'm3',
            quantity: null,
            unitPrice: null,
            positionType: 'NORMAL' as const,
            attributes: {},
          })),
        },
      ],
    },
  ],
};

function WithLv({ datei }: { datei: LoadedLV }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: datei })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'matrixMeasure', value: 'menge' })}>
        mengen
      </button>
      <button type="button" onClick={() => dispatch({ type: 'matrixMeasure', value: 'summe' })}>
        summen
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'setFacet', facetId: 'einheit', values: new Set(['m2']) })}
      >
        nur m2
      </button>
      <MatrixView />
    </>
  );
}

describe('Matrix · Zelle ohne Menge', () => {
  it('schreibt die 0 aus, statt wie eine Lücke auszusehen', () => {
    render(
      <ViewerProvider>
        <WithLv datei={classifyAndBuild(OHNE_MENGEN, 'null.x83')} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'mengen' }));

    // Die Zelle gibt es — sie trägt zwei Positionen, nur eben keine Menge.
    const zelle = screen.getByTitle(/× .* · 2 Positionen/);
    expect(zelle.textContent).toBe('0');
    // …und sie ist nicht die Lücke: die trüge den Hinweis „kommt nicht vor".
    expect(zelle.getAttribute('title')).not.toContain('kommt nicht vor');
  });
});

// ── Rückfall auf „Anzahl" und negative Summen ────────────────────────────────

/** Eine Position mit Preis, eine ohne — oder eine mit Abzug. */
function preisPosition(oz: string, unit: string, unitPrice: number | null) {
  return {
    oz,
    shortText: 'Innenwand herstellen',
    longText: 'Herstellen einer tragenden Innenwand aus Beton.',
    unit,
    quantity: 10,
    unitPrice,
    positionType: 'NORMAL' as const,
    attributes: {},
  };
}

function lvMit(positionen: ReturnType<typeof preisPosition>[]): LVDraft {
  return {
    projectName: 'Rückfall-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [{ number: '01.001', label: 'Abschnitt', sections: [], positions: positionen }],
      },
    ],
  };
}

function zeige(draft: LVDraft): void {
  render(
    <ViewerProvider>
      <WithLv datei={classifyAndBuild(draft, 'rueckfall.x83')} />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
}

describe('Matrix · stiller Rückfall und Abzüge', () => {
  it('sagt auch beim Zellwert „Summe", warum plötzlich Anzahl dasteht', () => {
    zeige(
      lvMit([preisPosition('01.001.0010', 'm3', 100), preisPosition('01.001.0020', 'm2', null)]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'summen' }));
    expect(screen.getByText(/Zellwert: Summe/)).toBeInTheDocument();

    // Der Filter lässt nur Positionen ohne Preis übrig — die Ansicht rechnet
    // dann Anzahl und muss sagen, warum.
    fireEvent.click(screen.getByRole('button', { name: 'nur m2' }));
    expect(screen.getByText(/KEINE PREISE IM AKTUELLEN FILTER/)).toBeInTheDocument();
    expect(screen.getByText(/Zellwert: Anzahl/)).toBeInTheDocument();
  });

  it('begründet nichts, wo der Filter nichts übrig lässt', () => {
    zeige(lvMit([preisPosition('01.001.0010', 'm3', 100)]));
    fireEvent.click(screen.getByRole('button', { name: 'summen' }));
    // Der Filter trifft keine Position — dann ist weder „keine Preise" noch
    // „mischt Einheiten" der Grund, sondern schlicht: da ist nichts.
    fireEvent.click(screen.getByRole('button', { name: 'nur m2' }));
    expect(screen.getByText('Keine Position im aktuellen Filter')).toBeInTheDocument();
    expect(screen.queryByText(/KEINE PREISE IM AKTUELLEN FILTER/)).not.toBeInTheDocument();
  });

  it('kennzeichnet eine negative Summe, statt sie wie eine Lücke aussehen zu lassen', () => {
    zeige(lvMit([preisPosition('01.001.0010', 'm3', -50)]));
    fireEvent.click(screen.getByRole('button', { name: 'summen' }));

    const zelle = screen.getByTitle(/× .* · 1 Position ·/);
    expect(zelle.textContent).toContain('-500');
    // Abzugsposition: eigener Ton statt der weißen Fläche einer Lücke.
    expect(zelle.style.background).toBe('var(--redS)');
  });
});
