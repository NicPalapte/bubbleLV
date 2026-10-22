// Splitscreen (Entscheidung 0064): Graph, Tabelle und Positionskarte als
// Bereiche nebeneinander, Umschalter zur Fenster-Anordnung in der Kopfleiste.
// jsdom kennt kein matchMedia — der Test spielt einen breiten Bildschirm vor.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

  it('tauscht Plätze per Ziehen am Kopf', async () => {
    setup();
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    const kopf = within(region('Tabelle')).getByTitle('Ziehen, um den Platz zu tauschen');
    fireEvent.dragStart(kopf, { dataTransfer });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.dragOver(region('Graph'), { dataTransfer });
    fireEvent.drop(region('Graph'), { dataTransfer });
    expect(region('Tabelle').style.gridRow).toBe('1');
    expect(region('Graph').style.gridRow).toBe('2');
  });

  it('setzt die Breite per Pfeiltaste, ohne die Grenzen zu verlassen', () => {
    setup();
    const linie = screen.getByRole('separator', { name: 'Breite der Bereiche' });
    expect(linie).toHaveAttribute('aria-valuenow', '64');
    fireEvent.keyDown(linie, { key: 'ArrowRight' });
    expect(linie).toHaveAttribute('aria-valuenow', '66');
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
