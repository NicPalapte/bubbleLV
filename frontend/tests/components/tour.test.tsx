// Geführte Tour (components/tour/): Angebot nach dem ersten LV, Schritte mit
// Spotlight auf echten Zielen, wartende Schritte und Überspringen fehlender Ziele.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tour } from '../../src/components/tour/Tour';
import { TOUR_STEPS } from '../../src/components/tour/tourSteps';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft } from '../../src/types/lvDraft';

const DRAFT: LVDraft = {
  projectName: 'Tour',
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
          positions: [
            {
              oz: '01.01.0010',
              shortText: 'Wand',
              longText: 'Wand aus Beton',
              unit: 'm2',
              quantity: 10,
              unitPrice: null,
              positionType: 'NORMAL',
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};
const LV = classifyAndBuild(DRAFT, 'tour.x83');

/** Stellt die Ziele der Tour als einfache Elemente bereit — ohne Graph und Kopfleiste. */
function Harness({ without = [] }: { without?: readonly string[] }) {
  const dispatch = useViewerDispatch();
  const { selection, view } = useViewer();
  const has = (name: string): boolean => !without.includes(name);
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
      <button
        type="button"
        data-slot="0"
        onClick={() => dispatch({ type: 'selectPosition', nodeId: null, positionId: 'p' })}
      >
        punkt
      </button>
      {selection.positionId !== null && <div data-selection-card="">karte</div>}
      <div data-tour="search">suche</div>
      <button
        type="button"
        data-tour="filter"
        onClick={() => dispatch({ type: 'sidePanel', panel: 'filter' })}
      >
        + Filter
      </button>
      {view.side === 'filter' && <div data-tour="layout">gliederung</div>}
      <div data-tour="kpis">kennzahlen</div>
      {has('hints') && <div data-tour="hints">hinweise</div>}
      <div data-tour="table">tabelle</div>
      <div data-tour="menu">menü</div>
      <Tour />
    </>
  );
}

function setup(without?: readonly string[]) {
  render(
    <ViewerProvider>
      <Harness without={without} />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByText('laden'));
}

/** Alle Frames der Tour einmal laufen lassen. */
async function frames(ms = 50): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const tourTitle = (index: number): string => `Tour: ${TOUR_STEPS[index].title}`;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom rechnet kein Layout; ohne Fläche gälte jedes Ziel als unsichtbar.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(100, 100, 40, 20),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Tour', () => {
  it('bietet sich nach dem ersten LV an und startet beim Punkt', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kurze Tour' }));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(0) })).toBeTruthy();
    expect(screen.getByText(/Klick auf den markierten Punkt/)).toBeTruthy();
  });

  it('geht weiter, sobald man den verlangten Klick selbst macht', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kurze Tour' }));
    await frames();
    fireEvent.click(screen.getByText('punkt'));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(1) })).toBeTruthy();
  });

  it('läuft mit Weiter und Überspringen bis zum Ende durch', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kurze Tour' }));
    for (let index = 0; index < TOUR_STEPS.length; index++) {
      await frames();
      expect(screen.getByRole('dialog', { name: tourTitle(index) })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Weiter|Überspringen|Fertig/ }));
    }
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('überspringt einen Schritt, dessen Ziel fehlt', async () => {
    setup(['hints']);
    const hints = TOUR_STEPS.findIndex((step) => step.target === '[data-tour="hints"]');
    fireEvent.click(screen.getByRole('button', { name: 'Kurze Tour' }));
    for (let index = 0; index < hints; index++) {
      await frames();
      fireEvent.click(screen.getByRole('button', { name: /Weiter|Überspringen/ }));
    }
    await frames(1000);
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(hints + 1) })).toBeTruthy();
  });

  it('Escape beendet die Tour, das Angebot kommt nicht wieder', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Kurze Tour' }));
    await frames();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('laden'));
    await frames();
    expect(screen.queryByRole('button', { name: 'Kurze Tour' })).toBeNull();
  });

  it('✕ am Angebot blendet es für die Sitzung aus', async () => {
    setup();
    expect(screen.getByRole('group', { name: 'Tour anbieten' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tour nicht anzeigen' }));
    await frames();
    expect(screen.queryByRole('group', { name: 'Tour anbieten' })).toBeNull();
  });
});
