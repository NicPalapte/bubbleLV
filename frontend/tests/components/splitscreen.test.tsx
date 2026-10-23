// Splitscreen (Entscheidungen 0064, 0070, 0073): Graph, Tabelle, Positionskarte, Überblick und Prüfung als
// Bereiche nebeneinander, Umschalter zur Fenster-Anordnung in der Kopfleiste.
// jsdom kennt kein matchMedia — der Test spielt einen breiten Bildschirm vor. Ebenso
// keine Maße: die Arbeitsfläche ist hier 1000 × 600 px groß.

import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Workspace } from '../../src/components/shell/Workspace';
import { WorkspaceBar } from '../../src/components/shell/WorkspaceBar';
import { WorkspaceProvider } from '../../src/components/shell/WorkspaceProvider';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft, PositionDraft } from '@core';

function position(oz: string): PositionDraft {
  return {
    oz,
    shortText: `Wand ${oz}`,
    longText: '',
    unit: 'm2',
    quantity: 10,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
}

const DRAFT: LVDraft = {
  projectName: 'Split',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los 1',
      sections: [
        {
          number: '01.01',
          label: 'Wände',
          sections: [],
          positions: [position('01.01.0010'), position('01.01.0020')],
        },
      ],
    },
  ],
};

const LV = classifyAndBuild(DRAFT, 'split.x83');

function Bühne() {
  const { tree } = useViewer();
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
      <WorkspaceBar />
      {tree !== null && (
        <main className="relative">
          <Workspace root={tree} />
        </main>
      )}
    </>
  );
}

function setup(): void {
  render(
    <ViewerProvider>
      <WorkspaceProvider>
        <Bühne />
      </WorkspaceProvider>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
}

const region = (name: string): HTMLElement =>
  screen.getByRole('region', { name: `${name} — Bereich` });

let original: typeof window.matchMedia | undefined;

beforeEach(() => {
  original = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  if (original === undefined) {
    // @ts-expect-error -- jsdom hatte keins; zurück in den Ausgangszustand.
    delete window.matchMedia;
  } else {
    window.matchMedia = original;
  }
});

describe('Splitscreen', () => {
  it('zeigt Graph, Tabelle und Position als Bereiche nebeneinander', () => {
    setup();
    expect(region('Graph')).toBeInTheDocument();
    expect(within(region('Tabelle')).getByText('Wand 01.01.0010')).toBeInTheDocument();
    expect(within(region('Position')).getByText('Keine Auswahl')).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Breite der Bereiche' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Höhe der Bereiche' })).toBeInTheDocument();
  });

  it('schließt einen Bereich und holt ihn über die Kopfleiste zurück', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle schließen' }));
    expect(screen.queryByRole('region', { name: 'Tabelle — Bereich' })).toBeNull();
    // Ohne zweiten linken Bereich gibt es keine waagerechte Trennlinie mehr.
    expect(screen.queryByRole('separator', { name: 'Höhe der Bereiche' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Tabelle' }));
    expect(region('Tabelle')).toBeInTheDocument();
  });

  const ziehe = async (pane: string): Promise<{ dataTransfer: object }> => {
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    const kopf = document.querySelector<HTMLElement>(`[data-tab="${pane}"]`)!;
    fireEvent.dragStart(kopf, { dataTransfer });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return { dataTransfer };
  };
  const fläche = (): void => {
    const grid = document.querySelector<HTMLElement>('[data-split-grid]')!;
    grid.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600 }) as DOMRect;
  };
  /** Loslassen an der Stelle (x, y) der Arbeitsfläche. */
  const lasse = (dataTransfer: object, clientX: number, clientY: number): void => {
    const ablage = document.querySelector<HTMLElement>('[data-drop="split"]')!;
    // jsdom kennt kein DragEvent — die Lage muss von Hand ans Ereignis.
    for (const make of [createEvent.dragOver, createEvent.drop]) {
      const event = make(ablage, { dataTransfer });
      Object.defineProperties(event, { clientX: { value: clientX }, clientY: { value: clientY } });
      fireEvent(ablage, event);
    }
  };

  it('tauscht Plätze per Ziehen in die Mitte', async () => {
    setup();
    fläche();
    const { dataTransfer } = await ziehe('table');
    // Mitte des Graphen (Spalte bis 641 px, Zeile bis 336 px)
    lasse(dataTransfer, 320, 170);
    expect(region('Tabelle').style.top).toBe('calc(0% + 32px)');
    expect(region('Graph').style.top).not.toBe('calc(0% + 32px)');
  });

  it('stapelt per Ziehen auf die Kopfzeile und löst den Reiter an einem Rand wieder', async () => {
    setup();
    fläche();
    fireEvent.click(screen.getByRole('button', { name: '+ Prüfung' }));
    expect(region('Prüfung')).toBeInTheDocument();
    let { dataTransfer } = await ziehe('check');
    // Kopfzeile der Position (rechte Spalte ab 720 px)
    lasse(dataTransfer, 860, 10);
    const reiter = screen.getByRole('tablist', { name: 'Gestapelte Bereiche' });
    expect(within(reiter).getByRole('tab', { name: /Prüfung/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(within(reiter).getByRole('tab', { name: /Position/ }));
    expect(region('Position')).not.toHaveAttribute('aria-hidden');
    expect(document.querySelector('[data-pane="check"]')).toHaveAttribute('aria-hidden', 'true');

    ({ dataTransfer } = await ziehe('check'));
    // unterer Rand des eigenen Stapels ⇒ eigener Platz unter der Position
    lasse(dataTransfer, 860, 560);
    expect(screen.queryByRole('tablist', { name: 'Gestapelte Bereiche' })).toBeNull();
    expect(region('Prüfung').style.left).toBe(region('Position').style.left);
    expect(region('Prüfung').style.top).not.toBe('calc(0% + 32px)');
  });

  it('am rechten Außenrand läuft die Tabelle über die volle Höhe; ↺ setzt zurück', async () => {
    setup();
    fläche();
    expect(screen.queryByRole('button', { name: 'Anordnung zurücksetzen' })).toBeNull();
    const { dataTransfer } = await ziehe('table');
    lasse(dataTransfer, 995, 300);
    expect(region('Tabelle').style.top).toBe('calc(0% + 32px)');
    const breite = Number(/calc\(([\d.]+)%/.exec(region('Tabelle').style.width)?.[1]);
    expect(breite).toBeGreaterThan(25);
    expect(breite).toBeLessThan(35);
    expect(region('Tabelle').style.left).not.toBe('0%');
    fireEvent.click(screen.getByRole('button', { name: 'Anordnung zurücksetzen' }));
    expect(region('Tabelle').style.top).not.toBe('calc(0% + 32px)');
  });

  it('setzt die Breite per Pfeiltaste, ohne die Grenzen zu verlassen', () => {
    setup();
    const linie = screen.getByRole('separator', { name: 'Breite der Bereiche' });
    expect(linie).toHaveAttribute('aria-valuenow', '64');
    fireEvent.keyDown(linie, { key: 'ArrowRight' });
    expect(linie).toHaveAttribute('aria-valuenow', '66');
    for (let i = 0; i < 20; i++) fireEvent.keyDown(linie, { key: 'ArrowRight' });
    expect(linie).toHaveAttribute('aria-valuenow', '88');
  });

  it('wechselt auf Fenster: der Graph füllt die Fläche, die Bereiche verschwinden', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: /Fenster/ }));
    expect(screen.queryByRole('region', { name: /— Bereich$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Tabelle/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Split/ }));
    expect(region('Graph')).toBeInTheDocument();
  });

  describe('Tabelle im eigenen Fenster', () => {
    let frame: HTMLIFrameElement;
    let popup: Window;

    beforeEach(() => {
      frame = document.createElement('iframe');
      document.body.append(frame);
      popup = frame.contentWindow as Window;
      popup.close = vi.fn<() => void>();
      popup.focus = vi.fn<() => void>();
      vi.spyOn(window, 'open').mockReturnValue(popup);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      frame.remove();
    });

    const fern = (): HTMLElement =>
      within(popup.document.body).getByRole('region', { name: 'Tabelle — eigenes Fenster' });

    it('bleibt ausgelagert, wenn man auf Fenster wechselt', () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Tabelle in eigenem Fenster öffnen' }));
      expect(screen.queryByRole('region', { name: 'Tabelle — Bereich' })).toBeNull();
      expect(fern()).toBeInTheDocument();
      fireEvent.click(screen.getByRole('radio', { name: /Fenster/ }));
      expect(fern()).toBeInTheDocument();
    });

    it('kehrt in ihren Bereich zurück, wenn das zweite Fenster von Hand zugeht', async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Tabelle in eigenem Fenster öffnen' }));
      Object.defineProperty(popup, 'closed', { configurable: true, get: () => true });
      popup.dispatchEvent(new Event('pagehide'));
      await vi.waitFor(() => expect(region('Tabelle')).toBeInTheDocument());
    });
  });
});
