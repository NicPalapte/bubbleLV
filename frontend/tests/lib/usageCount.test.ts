// Anonyme Nutzungszählung (Entscheidung 0056): feste Ereignisse, keine Inhalte.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { countEvent, countUrl, USAGE_EVENTS, usageEventOf } from '../../src/lib/usage/count';

describe('usageEventOf', () => {
  it('zählt geöffnete Bereiche und Fenster, aber nicht das Schließen', () => {
    expect(usageEventOf({ type: 'filterBar', open: true })).toBe('filterleiste');
    expect(usageEventOf({ type: 'filterBar', open: false })).toBeNull();
    expect(usageEventOf({ type: 'showPane', pane: 'check' })).toBe('seitenfenster-pruefung');
    expect(usageEventOf({ type: 'paneClosed', pane: 'overview', closed: false })).toBe(
      'seitenfenster-ueberblick',
    );
    expect(usageEventOf({ type: 'paneClosed', pane: 'check', closed: true })).toBeNull();
    expect(usageEventOf({ type: 'paneClosed', pane: 'table', closed: false })).toBe('tabelle');
    expect(usageEventOf({ type: 'paneClosed', pane: 'card', closed: false })).toBeNull();
    expect(usageEventOf({ type: 'compareWindow', open: true })).toBe('vergleich');
  });

  it('zählt Suche und Kommentar, ohne den Text weiterzugeben', () => {
    expect(usageEventOf({ type: 'search', value: 'Beton C30/37' })).toBe('suche');
    expect(usageEventOf({ type: 'search', value: '  ' })).toBeNull();
    expect(usageEventOf({ type: 'addComment', id: 'p1', text: 'prüfen', at: 0 })).toBe('kommentar');
    expect(usageEventOf({ type: 'addComment', id: 'p1', text: ' ', at: 0 })).toBeNull();
    const paint = { type: 'addHighlight', id: 'p1', paint: 'gelb', start: 0, at: 0 } as const;
    expect(usageEventOf({ ...paint, text: 'Beton' })).toBe('anstreichung');
    expect(usageEventOf({ ...paint, text: ' ' })).toBeNull();
  });

  it('zählt das Setzen eines Markers, nicht das Entfernen', () => {
    expect(usageEventOf({ type: 'setImportant', id: 'p1', on: true, at: 0 })).toBe('markierung');
    expect(usageEventOf({ type: 'setImportant', id: 'p1', on: false, at: 0 })).toBeNull();
    expect(usageEventOf({ type: 'setProgress', id: 'p1', progress: 'fertig', at: 0 })).toBe(
      'markierung',
    );
    expect(usageEventOf({ type: 'setProgress', id: 'p1', progress: null, at: 0 })).toBeNull();
  });

  it('zählt die Tour nur beim Start', () => {
    expect(usageEventOf({ type: 'tour', step: 0 })).toBe('tour');
    expect(usageEventOf({ type: 'tour', step: 2 })).toBeNull();
  });

  it('ignoriert Aktionen ohne Bedeutung für die Nutzung', () => {
    expect(usageEventOf({ type: 'resetFilters' })).toBeNull();
    expect(usageEventOf({ type: 'dismissNotices' })).toBeNull();
  });

  it('zählt Begleitdokumente ohne Namen, Text oder Position (Entscheidung 0072)', () => {
    const spot = { doc: 'd', page: 1, start: 0, text: 'geheim' };
    expect(usageEventOf({ type: 'docRegister', doc: 'd', name: 'x.pdf', pages: 2 })).toBe(
      'dokument-geoeffnet',
    );
    expect(usageEventOf({ type: 'docPaint', spot, paint: 'gelb', at: 1 })).toBe(
      'dokument-anstreichung',
    );
    expect(usageEventOf({ type: 'docPaint', spot, paint: null, at: 1 })).toBeNull();
    expect(usageEventOf({ type: 'docLink', spot, ids: ['p1'], at: 1 })).toBe('dokument-verknuepft');
  });

  it('liefert nur Namen aus der festen Liste', () => {
    const names = new Set<string>(USAGE_EVENTS);
    const event = usageEventOf({ type: 'openInTable', id: null });
    expect(event !== null && names.has(event)).toBe(true);
  });
});

describe('countUrl', () => {
  it('schickt ein Ereignis nur mit festem Namen, ohne Adresse oder Fragment', () => {
    window.location.hash = '#q=geheim~p=01.0010';
    const url = new URL(countUrl('export-csv', true));
    expect(url.origin).toBe('https://bubble.goatcounter.com');
    expect(url.searchParams.get('p')).toBe('export-csv');
    expect(url.searchParams.get('e')).toBe('true');
    expect(url.searchParams.has('s')).toBe(false);
    expect(url.toString()).not.toContain('geheim');
    window.location.hash = '';
  });

  it('schickt beim Seitenaufruf nur „/“ und die Bildschirmgröße', () => {
    const url = new URL(countUrl('/', false));
    expect(url.searchParams.get('p')).toBe('/');
    expect(url.searchParams.has('e')).toBe(false);
    expect(url.searchParams.get('s')).toMatch(/^\d+,\d+,[\d.]+$/);
  });
});

describe('countEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendet außerhalb der Live-Seite nichts', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    countEvent('datei-geoeffnet');
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
