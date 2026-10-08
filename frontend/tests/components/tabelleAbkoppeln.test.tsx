// Tabelle in einem eigenen Browserfenster (Entscheidung 0039). Ein iframe
// spielt das zweite Fenster: eigenes Dokument, eigenes `window`.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphDock } from '../../src/components/shell/GraphDock';
import { TableWindow } from '../../src/components/shell/TableWindow';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import { setTheme } from '../../src/lib/theme';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

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
  projectName: 'Abkoppeln',
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

const LV = classifyAndBuild(DRAFT, 'abkoppeln.x83');

function Steuerung() {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'loaded', lv: LV });
          dispatch({ type: 'tableWindow', open: true });
        }}
      >
        vorbereiten
      </button>
      <button type="button" onClick={() => dispatch({ type: 'tableWindow', open: false })}>
        von außen schließen
      </button>
    </>
  );
}

let frame: HTMLIFrameElement;
let popup: Window;
let close: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  frame = document.createElement('iframe');
  document.body.append(frame);
  popup = frame.contentWindow as Window;
  close = vi.fn<() => void>();
  popup.close = close;
  popup.focus = vi.fn<() => void>();
  const style = document.createElement('style');
  style.id = 'haupt-stil';
  style.textContent = '.bg-paper { color: red; }';
  document.head.append(style);
});

afterEach(() => {
  vi.restoreAllMocks();
  frame.remove();
  document.getElementById('haupt-stil')?.remove();
});

function renderTable(open: Window | null) {
  const spy = vi.spyOn(window, 'open').mockReturnValue(open);
  render(
    <ViewerProvider>
      <Steuerung />
      <TableWindow />
      <GraphDock />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'vorbereiten' }));
  return spy;
}

function abkoppeln(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Tabelle in eigenem Fenster öffnen' }));
}

describe('Tabelle abkoppeln', () => {
  it('zeigt die Tabelle im zweiten Fenster statt über dem Graphen', () => {
    const spy = renderTable(popup);
    abkoppeln();

    expect(spy).toHaveBeenCalledWith('', 'bubble-tabelle', expect.stringContaining('popup'));
    expect(screen.queryByRole('region', { name: /Tabelle — Fenster/ })).toBeNull();
    const fern = within(popup.document.body).getByRole('region', {
      name: 'Tabelle — eigenes Fenster',
    });
    expect(within(fern).getByText('Wand 01.01.0010')).toBeInTheDocument();
    // Ohne die Stile des Hauptfensters stünde dort ungestaltetes HTML.
    expect(popup.document.head.querySelector('style')?.textContent).toContain('bg-paper');
    expect(popup.document.title).toBe('Bubble — Tabelle');
  });

  it('gleicht neue Stile ab, ohne die vorhandenen neu anzulegen', async () => {
    renderTable(popup);
    abkoppeln();
    const vorher = popup.document.head.querySelector('style');
    const neu = document.createElement('style');
    neu.id = 'nachgeladen';
    neu.textContent = '.nachgeladen { color: blue; }';
    document.head.append(neu);
    await vi.waitFor(() => expect(popup.document.head.textContent).toContain('.nachgeladen'));
    expect(popup.document.head.querySelector('style')).toBe(vorher);
    neu.remove();
    await vi.waitFor(() => expect(popup.document.head.textContent).not.toContain('.nachgeladen'));
  });

  it('übernimmt Hell/Dunkel aus dem Hauptfenster', () => {
    renderTable(popup);
    abkoppeln();
    act(() => setTheme('dark'));
    expect(popup.document.documentElement.dataset.theme).toBe('dark');
    delete document.documentElement.dataset.theme;
  });

  it('holt die Tabelle mit ↙ zurück und schließt das zweite Fenster', async () => {
    renderTable(popup);
    abkoppeln();
    fireEvent.click(
      within(popup.document.body).getByRole('button', {
        name: 'Tabelle zurück ins Hauptfenster',
      }),
    );
    expect(screen.getByRole('region', { name: /Tabelle — Fenster/ })).toBeInTheDocument();
    await vi.waitFor(() => expect(close).toHaveBeenCalled());
  });

  it('schließt die Tabelle, wenn das zweite Fenster von Hand zugeht', async () => {
    renderTable(popup);
    abkoppeln();
    // `pagehide` ohne geschlossenes Fenster (Browser tauscht `about:blank`) zählt nicht.
    popup.dispatchEvent(new Event('pagehide'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(
      within(popup.document.body).getByRole('region', { name: 'Tabelle — eigenes Fenster' }),
    ).toBeInTheDocument();

    Object.defineProperty(popup, 'closed', { configurable: true, get: () => true });
    popup.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /▴ Tabelle/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: /Tabelle/ })).toBeNull();
  });

  it('schließt das zweite Fenster mit, wenn die Hauptseite geht', () => {
    renderTable(popup);
    abkoppeln();
    window.dispatchEvent(new Event('pagehide'));
    expect(close).toHaveBeenCalled();
  });

  it('schließt das zweite Fenster, wenn die Tabelle von außen zugeht', async () => {
    renderTable(popup);
    abkoppeln();
    fireEvent.click(screen.getByRole('button', { name: 'von außen schließen' }));
    await vi.waitFor(() => expect(close).toHaveBeenCalled());
  });

  it('meldet ein blockiertes Pop-up und lässt die Tabelle, wo sie ist', () => {
    renderTable(null);
    abkoppeln();
    expect(screen.getByRole('status')).toHaveTextContent('Pop-up blockiert');
    expect(screen.getByRole('region', { name: /Tabelle — Fenster/ })).toBeInTheDocument();
  });
});
