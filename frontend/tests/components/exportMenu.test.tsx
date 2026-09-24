// „Mitnehmen"-Menü und Druckansicht in der App (WP-P, Schritte 3, 4 und 6).
//
// Geprüft wird, was sich nur in der ganzen App prüfen lässt: dass der Export
// die gefilterte Menge nimmt, dass der Druck die **vollständige** Liste zeigt
// (nicht nur das virtualisierte Fenster) und dass der Melde-Link nichts aus
// der Datei trägt.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { PrintView } from '../../src/components/print/PrintView';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { LoadedLV } from '../../src/lib/pipeline/runPipeline';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

/** Inhalte, die `downloadText` an den Browser gegeben hätte. */
const dateien: Array<{ name: string; text: string }> = [];

beforeEach(() => {
  dateien.length = 0;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    // Der Blob-Inhalt liegt hier noch im Speicher; ihn synchron zu lesen geht
    // in jsdom nur über den Umweg über den Konstruktor-Aufruf, deshalb merkt
    // sich der Test den Text beim Anlegen.
    void blob;
    return 'blob:test';
  });
  URL.revokeObjectURL = vi.fn();
  // Blob ist in jsdom vorhanden, aber `text()` ist asynchron — für den Test
  // reicht der zuletzt übergebene Rohtext.
  const OriginalBlob = globalThis.Blob;
  vi.stubGlobal(
    'Blob',
    class extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        dateien.push({ name: '', text: parts.map(String).join('') });
      }
    },
  );
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
    const letzte = dateien[dateien.length - 1];
    if (letzte !== undefined) letzte.name = this.download;
  };
  vi.stubGlobal('print', vi.fn());
  vi.stubGlobal('open', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function ladeApp(pfad = resolve(FIXTURE_DIR, 'gaeb-xml-beispiel.x83')): Promise<void> {
  render(<App />);
  const name = pfad.split('/').pop() as string;
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(pfad)], name)] },
  });
  await waitFor(() => expect(screen.getByText('FILTER')).toBeInTheDocument());
}

/** Die Demo-Datei ist die einzige mit Preisen (x84). */
const MIT_PREISEN = resolve(process.cwd(), 'src/assets/demo/bubble-demo-angebot.x84');

function oeffneMenu(): void {
  fireEvent.click(screen.getByRole('button', { name: /Mitnehmen/ }));
}

function menueEintrag(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

describe('Mitnehmen', () => {
  it('lädt die Positionen als CSV — genau die gefilterte Menge', async () => {
    await ladeApp();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    await waitFor(() => expect(screen.getByLabelText('Suche')).toHaveValue('Beton'));

    oeffneMenu();
    // Der Eintrag nennt die Zahl, die im Export landet.
    const eintrag = menueEintrag('Positionen als CSV');
    const angekuendigt = Number(eintrag.textContent?.match(/(\d+)$/)?.[1]);
    fireEvent.click(eintrag);

    expect(dateien).toHaveLength(1);
    const [datei] = dateien;
    expect(datei.name).toMatch(/^gaeb-xml-beispiel-positionen-\d{4}-\d{2}-\d{2}\.csv$/);
    // Kopfzeile plus je eine Zeile pro Treffer; der Langtext enthält Umbrüche,
    // deshalb zählt der Test die Zeilen über die OZ-Spalte am Zeilenanfang.
    const zeilen = datei.text.split('\r\n').filter((zeile) => /^\d/.test(zeile));
    expect(zeilen).toHaveLength(angekuendigt);
    expect(angekuendigt).toBeGreaterThan(0);
  });

  it('lädt die Hinweise als Markdown', async () => {
    await ladeApp();
    oeffneMenu();
    fireEvent.click(menueEintrag('Hinweise als Markdown'));

    expect(dateien).toHaveLength(1);
    expect(dateien[0].name).toMatch(/-hinweise-\d{4}-\d{2}-\d{2}\.md$/);
    expect(dateien[0].text).toContain('Hinweise, keine Urteile');
  });

  it('trägt das Melden nicht mehr — das sitzt jetzt hinter dem Logo', async () => {
    // Eine Meldung ist kein Export (Issue #80). Der Weg selbst ist in
    // tests/components/reportDialog.test.tsx geprüft.
    await ladeApp();
    oeffneMenu();
    expect(screen.queryByRole('button', { name: /^Fehler melden/ })).not.toBeInTheDocument();
  });
});

/** Kleines LV direkt in die Druckansicht — ohne Umweg über eine GAEB-Datei. */
function WithLv({ datei }: { datei: LoadedLV }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: datei })}>
        laden
      </button>
      <PrintView />
    </>
  );
}

function position(oz: string, overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz,
    shortText: 'Innenwand herstellen',
    longText: 'Herstellen einer tragenden Innenwand aus Beton.',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

function lvMit(positionen: readonly PositionDraft[]): LoadedLV {
  const draft: LVDraft = {
    projectName: 'Druck-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [
          { number: '01.001', label: 'Abschnitt', sections: [], positions: [...positionen] },
        ],
      },
    ],
  };
  return classifyAndBuild(draft, 'druck.x83');
}

describe('Drucken', () => {
  it('druckt die ganze gefilterte Liste, nicht nur das sichtbare Fenster', async () => {
    await ladeApp();
    oeffneMenu();
    fireEvent.click(menueEintrag('Drucken'));
    expect(window.print).toHaveBeenCalledTimes(1);

    // Auf dem Bildschirm gibt es die Druckansicht nicht …
    expect(document.querySelector('.nur-druck')).toBeNull();

    // … erst wenn der Browser druckt, wird sie gezeichnet.
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const druck = document.querySelector('.nur-druck') as HTMLElement;
    expect(druck).not.toBeNull();
    const zeilen = within(druck).getAllByRole('row');
    // Kopfzeile plus jede Position der Datei — die Tabelle daneben zeichnet
    // nur das sichtbare Fenster.
    expect(zeilen.length).toBe(29);

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(document.querySelector('.nur-druck')).toBeNull();
  });

  it('lässt die Preisspalten weg, wo die Datei keine Preise führt', async () => {
    await ladeApp();
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const druck = document.querySelector('.nur-druck') as HTMLElement;
    // Zwei leere Spalten aufs Blatt zu drucken wäre eine Zusage, die die
    // Datei nicht hält.
    expect(within(druck).queryByText('GP')).toBeNull();
    expect(druck.textContent).not.toContain('Summe über');
  });

  it('druckt Preise und die Summe über genau die gedruckten Zeilen', async () => {
    await ladeApp(MIT_PREISEN);
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const druck = document.querySelector('.nur-druck') as HTMLElement;
    expect(within(druck).getByText('GP')).toBeInTheDocument();
    // Kopfzeile, Positionen, Summenzeile — und darunter ein Betrag in Euro.
    expect(druck.querySelector('tfoot')?.textContent).toMatch(/Summe über .* €$/);
  });

  it('benennt Zeilen ohne Preis, die nicht in der Summe stecken', async () => {
    // Die Demo-Datei mischt: die meisten Zeilen führen einen Preis, einige
    // nicht. Auf Papier lässt sich das nicht nachträglich prüfen.
    await ladeApp(MIT_PREISEN);
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const druck = document.querySelector('.nur-druck') as HTMLElement;

    // Erwartung aus den gedruckten Zeilen selbst, nicht aus der Fußzeile:
    // gezählt wird die leere GP-Spalte — eine Zeile ohne Gesamtpreis.
    const zeilen = within(druck).getAllByRole('row').slice(1, -1);
    const ohneGesamt = zeilen.filter(
      // Spalten: OZ, Bezeichnung, Einheit, Menge, EP, GP.
      (zeile) => within(zeile).getAllByRole('cell')[5].textContent === '',
    ).length;
    expect(ohneGesamt).toBeGreaterThan(0);

    const fuss = druck.querySelector('tfoot')?.textContent ?? '';
    expect(fuss).toContain(`Summe über ${zeilen.length - ohneGesamt} Positionen`);
    expect(fuss).toContain(`von ${zeilen.length} · ${ohneGesamt} ohne Gesamtpreis`);
  });

  it('nimmt kein offenes Menü mit aufs Blatt', async () => {
    await ladeApp();
    oeffneMenu();
    // Popover hängen per Portal an <body>, also außerhalb der Hülle, die beim
    // Drucken zurücktritt — sie brauchen die Klasse selbst.
    const offen = [...document.body.children].filter(
      (element) => (element as HTMLElement).style.position === 'fixed',
    );
    expect(offen).toHaveLength(1);
    expect(offen[0].className).toContain('nur-bildschirm');

    // Und der Klick auf „Drucken" schließt es, bevor gedruckt wird.
    fireEvent.click(menueEintrag('Drucken'));
    expect(
      [...document.body.children].filter(
        (element) => (element as HTMLElement).style.position === 'fixed',
      ),
    ).toHaveLength(0);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('lässt den Gesamtpreis leer, wenn nur die Menge fehlt', async () => {
    // Preis vorhanden, Menge nicht: `index.totalPrice` steht dann auf 0. Auf
    // dem Blatt wäre das ein Nullpreis — und stünde stillschweigend in der
    // Summe, ohne dass die Fußzeile es nennt.
    render(
      <ViewerProvider>
        <WithLv
          datei={lvMit([
            position('01.001.0010'),
            position('01.001.0020', { quantity: null, unitPrice: 80 }),
          ])}
        />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });

    const druck = document.querySelector('.nur-druck') as HTMLElement;
    const zeilen = within(druck).getAllByRole('row').slice(1, -1);
    expect(within(zeilen[1]).getAllByRole('cell')[4].textContent).toContain('80');
    expect(within(zeilen[1]).getAllByRole('cell')[5].textContent).toBe('');

    const fuss = druck.querySelector('tfoot')?.textContent ?? '';
    expect(fuss).toContain('Summe über 1 Position von 2 · 1 ohne Gesamtpreis');
    // …und die 0 steckt nicht in der Summe: 10 × 100 € und sonst nichts.
    expect(fuss).toContain('1.000,00 €');
  });

  it('druckt nach einer Suche nur die Treffer', async () => {
    await ladeApp();
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Beton' } });
    // Die Suche ist entprellt: erst wenn der Überblick die Bezugsgröße nennt,
    // ist der Filter wirklich aktiv.
    await screen.findByText(/im aktuellen Filter/);

    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const druck = document.querySelector('.nur-druck') as HTMLElement;
    expect(within(druck).getAllByRole('row').length).toBeLessThan(29);
    expect(druck.textContent).toContain('im aktuellen Filter');
  });
});
