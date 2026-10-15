/**
 * @vitest-environment-options {"url": "https://nicpalapte.github.io/bubbleLV/"}
 */
// Nutzungszählung auf der Live-Seite (Entscheidung 0051): wann gesendet wird und wann nicht.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CountModule = typeof import('../../src/lib/usage/count');

const beacon = vi.fn((url: string) => url.length > 0);

async function loadFresh(): Promise<CountModule> {
  // Frisches Modul je Test: die Einmal-Regel merkt sich gezählte Ereignisse.
  vi.resetModules();
  return import('../../src/lib/usage/count');
}

function sentPaths(): (string | null)[] {
  return beacon.mock.calls.map(([url]) => new URL(url).searchParams.get('p'));
}

describe('Zählen auf der Live-Seite', () => {
  beforeEach(() => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_USAGE_COUNT', '1');
    beacon.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
    window.history.replaceState(null, '', '/bubbleLV/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sendet den Seitenaufruf', async () => {
    const { countPageview } = await loadFresh();
    countPageview();
    expect(sentPaths()).toEqual(['/']);
  });

  it('zählt eine Funktion einmal je Seitenaufruf, geöffnete Dateien jedes Mal', async () => {
    const { countEvent } = await loadFresh();
    countEvent('tabelle');
    countEvent('tabelle');
    countEvent('datei-geoeffnet');
    countEvent('datei-geoeffnet');
    expect(sentPaths()).toEqual(['tabelle', 'datei-geoeffnet', 'datei-geoeffnet']);
  });

  it('zählt nicht in PR-Vorschauen', async () => {
    window.history.replaceState(null, '', '/bubbleLV/pr-preview/pr-1/');
    const { countEvent, countPageview } = await loadFresh();
    countPageview();
    countEvent('datei-geoeffnet');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('zählt nicht, solange der Hauptschalter aus ist', async () => {
    vi.stubEnv('VITE_USAGE_COUNT', '');
    const { countEvent, countPageview } = await loadFresh();
    countPageview();
    countEvent('datei-geoeffnet');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('erkennt „Do Not Track“ auch als „yes“', async () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: 'yes', configurable: true });
    const { countEvent } = await loadFresh();
    countEvent('datei-geoeffnet');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('zählt nicht bei „Do Not Track“', async () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    const { countEvent, countPageview } = await loadFresh();
    countPageview();
    countEvent('datei-geoeffnet');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('weicht auf fetch aus, wenn sendBeacon ablehnt', async () => {
    beacon.mockReturnValueOnce(false);
    const fetchSpy = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchSpy);
    const { countEvent } = await loadFresh();
    countEvent('datei-geoeffnet');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('lässt einen Fehler beim Senden nie nach außen', async () => {
    beacon.mockImplementationOnce(() => {
      throw new Error('blockiert');
    });
    const { countEvent } = await loadFresh();
    expect(() => countEvent('datei-geoeffnet')).not.toThrow();
  });
});
