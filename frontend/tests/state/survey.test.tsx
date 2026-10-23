// Kurzumfrage (Issue #157, Entscheidung 0071): wann sie erscheint, was der Browser sich
// merkt und was als Ereignis rausgeht.

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SurveyCard } from '../../src/components/survey/SurveyCard';
import { clearLastLv, readSurveyDone, saveSurveyDone } from '../../src/lib/persist/lastLv';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import {
  feedbackMailto,
  MAX_FEEDBACK_TEXT,
  SURVEY_DELAY_MS,
  surveyEvents,
} from '../../src/lib/survey';
import { USAGE_EVENTS } from '../../src/lib/usage/count';
import { SurveyProvider, useSurvey } from '../../src/state/survey';
import { useViewerDispatch } from '../../src/state/viewer';
import { ViewerProvider } from '../../src/state/ViewerProvider';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const lv = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Harness() {
  const dispatch = useViewerDispatch();
  const survey = useSurvey();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'tour', step: 0 })}>
        Tour
      </button>
      <button type="button" onClick={() => dispatch({ type: 'tour', step: null })}>
        Tour beenden
      </button>
      <button type="button" onClick={survey.show}>
        Feedback geben
      </button>
      <SurveyCard />
    </>
  );
}

function renderSurvey() {
  return render(
    <ViewerProvider>
      <SurveyProvider>
        <Harness />
      </SurveyProvider>
    </ViewerProvider>,
  );
}

/** Aktive Zeit vergehen lassen; IndexedDB läuft ohne gefälschte Uhr weiter. */
function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Den Merker aus IndexedDB fertig lesen lassen (echte Uhr, nur `setInterval` ist gefälscht). */
async function readStored(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const card = () => screen.queryByRole('region', { name: 'Kurzumfrage' });

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Kurzumfrage', () => {
  it('erscheint erst nach der Wartezeit mit geöffneter Datei', async () => {
    renderSurvey();
    await readStored();
    // Ohne Datei zählt die Zeit nicht.
    wait(SURVEY_DELAY_MS);
    expect(card()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    wait(SURVEY_DELAY_MS - 10_000);
    expect(card()).toBeNull();
    wait(10_000);
    expect(card()).not.toBeNull();
  });

  it('wartet, solange die Tour läuft', async () => {
    renderSurvey();
    await readStored();
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tour' }));
    wait(2 * SURVEY_DELAY_MS);
    expect(card()).toBeNull();
    // Nach der Tour holt sie nach.
    fireEvent.click(screen.getByRole('button', { name: 'Tour beenden' }));
    wait(10_000);
    expect(card()).not.toBeNull();
  });

  it('kommt nach „Nicht mehr fragen" auch in der nächsten Sitzung nicht', async () => {
    const first = renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nicht mehr fragen' }));
    expect(card()).toBeNull();
    await waitFor(async () => expect(await readSurveyDone()).toBe('abgelehnt'));
    first.unmount();

    renderSurvey();
    await readStored();
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    wait(2 * SURVEY_DELAY_MS);
    expect(card()).toBeNull();
  });

  it('merkt sich die Antwort und schließt', async () => {
    renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    const senden = screen.getByRole('button', { name: 'Senden' });
    expect(senden).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'bis 10 €/Monat' }));
    fireEvent.click(senden);
    expect(card()).toBeNull();
    await waitFor(async () => expect(await readSurveyDone()).toBe('beantwortet'));
  });

  it('dankt nach Freitext und legt ihn in die Zwischenablage', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Mehr Filter ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    expect(writeText).toHaveBeenCalledWith('Mehr Filter');
    expect(card()).toHaveTextContent('Danke!');
    await waitFor(async () => expect(await readSurveyDone()).toBe('beantwortet'));
  });

  it('begrenzt den Freitext, damit der Mail-Link nicht zu lang wird', () => {
    renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', String(MAX_FEEDBACK_TEXT));
    // Üblicher Text: ein Fünftel Leerzeichen, ab und zu ein Umlaut.
    const satz = 'Für die Kalkulation fehlt mir ein Export der Mengen je Abschnitt. ';
    const text = satz.repeat(20).slice(0, MAX_FEEDBACK_TEXT);
    expect(feedbackMailto(text).length).toBeLessThan(1800);
  });

  it('beginnt beim erneuten Öffnen leer', () => {
    renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Senden' })).toBeDisabled();
  });

  it('lässt sich über das Logo-Menü jederzeit öffnen, auch ohne Wartezeit', () => {
    renderSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback geben' }));
    expect(card()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Umfrage schließen' }));
    expect(card()).toBeNull();
  });
});

describe('Antworten', () => {
  it('werden zu festen Ereignisnamen, die die Zählung kennt', () => {
    const events = surveyEvents({ rating: 4, pay: 'bis-10' });
    expect(events).toEqual(['umfrage-beantwortet', 'umfrage-note-4', 'umfrage-zahlen-bis-10']);
    for (const event of events) expect(USAGE_EVENTS).toContain(event);
  });

  it('lassen fehlende Antworten weg', () => {
    expect(surveyEvents({ rating: null, pay: 'nein' })).toEqual([
      'umfrage-beantwortet',
      'umfrage-zahlen-nein',
    ]);
  });

  it('Freitext geht nur in den Mail-Link, mit Leerzeichen statt Plus', () => {
    const url = feedbackMailto('  Mehr Filter bitte ');
    expect(url.startsWith('mailto:')).toBe(true);
    expect(url).toContain('Mehr%20Filter%20bitte');
    expect(url).not.toContain('+');
  });
});

describe('Merker im Browser', () => {
  it('überlebt „Letzte Datei löschen"', async () => {
    vi.useRealTimers();
    expect(await readSurveyDone()).toBeNull();
    expect(await saveSurveyDone('beantwortet')).toBe(true);
    await clearLastLv();
    expect(await readSurveyDone()).toBe('beantwortet');
  });
});
