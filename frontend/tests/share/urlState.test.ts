// Zustand im URL-Fragment (WP-P, Schritt 2). Zwei Zusagen stehen hier auf dem
// Prüfstand: der Hin- und Rückweg verliert nichts, und ein Link von irgendwoher
// bringt die App nicht in einen Zustand, den ihre Oberfläche nicht kennt.

import { describe, expect, it } from 'vitest';
import {
  decodeShared,
  encodeShared,
  EMPTY_SHARED,
  sharedHash,
  type SharedState,
} from '../../src/lib/share/urlState';

function zustand(overrides: Partial<SharedState> = {}): SharedState {
  return { ...EMPTY_SHARED, facets: {}, ...overrides };
}

describe('encodeShared / decodeShared', () => {
  it('lässt den Standard leer — die Adresszeile bleibt sauber', () => {
    expect(encodeShared(EMPTY_SHARED)).toBe('');
    expect(sharedHash(EMPTY_SHARED)).toBe('');
  });

  it('bringt Ansicht, Suche, Facetten, Menge und Auswahl unverändert zurück', () => {
    const vorher = zustand({
      view: 'matrix',
      search: 'Beton C30/37',
      facets: { gewerk: ['Betonarbeiten', 'Erdarbeiten'], einheit: ['m3'] },
      menge: [10, 500],
      hideMode: 'hide',
      oz: '001.004.0030',
    });
    expect(decodeShared(encodeShared(vorher))).toEqual(vorher);
  });

  it('übersteht Zeichen, die in URLs etwas bedeuten', () => {
    // Facettenwerte kommen aus der Datei: „C30/37", „m³", „DIN EN 1992-1-1".
    const vorher = zustand({
      search: 'a=b~c,d #e',
      facets: { beton: ['C30/37', 'C35/45'], normen: ['DIN EN 1992-1-1'] },
      oz: '01.002~0010',
    });
    expect(decodeShared(encodeShared(vorher))).toEqual(vorher);
  });

  it('nimmt das Fragment mit und ohne führendes #', () => {
    const fragment = encodeShared(zustand({ view: 'graph' }));
    expect(decodeShared(`#${fragment}`)).toEqual(decodeShared(fragment));
  });
});

describe('decodeShared · fremde Links', () => {
  it('ergibt bei leerem Fragment den Standard', () => {
    expect(decodeShared('')).toEqual(EMPTY_SHARED);
    expect(decodeShared('#')).toEqual(EMPTY_SHARED);
  });

  it('wirft eine unbekannte Ansicht weg, statt sie zu übernehmen', () => {
    expect(decodeShared('v=raumschiff').view).toBe('overview');
  });

  it('wirft eine Facette weg, die es nicht gibt', () => {
    // Ein Link aus einer anderen Fassung der App — der Rest gilt trotzdem.
    const state = decodeShared('f.erfunden=xyz~v=table');
    expect(state.facets).toEqual({});
    expect(state.view).toBe('table');
  });

  it('nimmt einen Mengenbereich nur, wenn er einer ist', () => {
    expect(decodeShared('m=10,500').menge).toEqual([10, 500]);
    expect(decodeShared('m=viel,mehr').menge).toBeNull();
    // Verdreht ist kein Bereich, sondern ein Fehler.
    expect(decodeShared('m=500,10').menge).toBeNull();
  });

  it('übersteht Bruchstücke, ohne etwas zu erfinden', () => {
    for (const kaputt of ['v', '=', '~~~', 'f.=', 'q', 'p=']) {
      expect(() => decodeShared(kaputt)).not.toThrow();
    }
    expect(decodeShared('p=').oz).toBeNull();
  });

  it('übersteht eine defekte Prozent-Kodierung', () => {
    // `decodeURIComponent('%')` wirft. Ein Link, der beim Kopieren in einen
    // Chat abgeschnitten wurde, darf die App nicht mitreißen.
    for (const kaputt of ['q=%', 'p=%E4%', 'f.gewerk=%3', 'q=%zz']) {
      expect(() => decodeShared(kaputt)).not.toThrow();
    }
    expect(decodeShared('q=%').search).toBe('');
    expect(decodeShared('p=%E4%').oz).toBeNull();
    expect(decodeShared('f.gewerk=%3').facets).toEqual({});
    // Und was daneben steht, gilt weiter.
    expect(decodeShared('q=%~v=graph').view).toBe('graph');
  });
});

describe('Was im Link steht', () => {
  it('trägt aus der Datei nur die OZ', () => {
    // Kein Dateiname, kein Projektname, kein Text, keine Menge, kein Preis:
    // ein Link ohne dieselbe Datei ist nutzlos — genau so ist es gewollt.
    const fragment = encodeShared(
      zustand({ view: 'table', facets: { gewerk: ['Betonarbeiten'] }, oz: '001.004.0030' }),
    );
    const schluessel = fragment.split('~').map((teil) => teil.split('=')[0]);
    expect(new Set(schluessel)).toEqual(new Set(['v', 'f.gewerk', 'p']));
  });
});
