// Download als Blob (WP-P, Schritt 3). Die Abnahme aus dem Plan lautet: „Im
// Netzwerk-Tab ist bei Export und Druck kein Request zu sehen." Hier wird das
// so nachgestellt, wie es sich in einem Test prüfen lässt — `fetch`,
// `XMLHttpRequest` und `navigator.sendBeacon` werden ersetzt und müssten
// anschlagen, wenn irgendetwas doch hinausginge.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText, exportFileName } from '../../src/lib/export/download';

describe('downloadText', () => {
  const aufrufe: string[] = [];

  beforeEach(() => {
    aufrufe.length = 0;
    vi.stubGlobal('fetch', (...args: unknown[]) => {
      aufrufe.push(`fetch ${String(args[0])}`);
      return Promise.reject(new Error('kein Request erlaubt'));
    });
    vi.stubGlobal(
      'XMLHttpRequest',
      class {
        open(_method: string, url: string): void {
          aufrufe.push(`xhr ${url}`);
        }
        send(): void {}
      },
    );
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (url: string) => {
        aufrufe.push(`beacon ${url}`);
        return true;
      },
    });
    // jsdom kennt keine Objekt-URLs.
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('erzeugt eine lokale Datei, ohne irgendetwas zu senden', () => {
    const klicks: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
      klicks.push(`${this.download} → ${this.href}`);
    };

    downloadText('test.csv', 'OZ;Menge\r\n001;1\r\n', 'csv');

    HTMLAnchorElement.prototype.click = original;
    expect(klicks).toEqual(['test.csv → blob:test']);
    expect(aufrufe).toEqual([]);
    // Und die Objekt-URL wird wieder freigegeben — sonst bliebe der ganze
    // Text bis zum Reload im Speicher.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('lässt nach dem Download kein Element im Dokument zurück', () => {
    HTMLAnchorElement.prototype.click = function click(): void {};
    downloadText('test.md', '# Hinweise\n', 'markdown');
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });
});

describe('exportFileName', () => {
  it('nimmt den Namen der Datei und hängt Teil und Datum an', () => {
    const name = exportFileName('angebot.x83', 'positionen', 'csv');
    expect(name).toMatch(/^angebot-positionen-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('entfernt, was in Dateinamen Ärger macht', () => {
    // Der Name landet im Dateisystem des Nutzers — Schrägstriche und
    // Doppelpunkte haben dort nichts zu suchen.
    expect(exportFileName('a/b:c*d.x83', 'hinweise', 'md')).toMatch(/^a-b-c-d-hinweise-/);
  });

  it('erfindet einen Namen, wenn nichts übrig bleibt', () => {
    expect(exportFileName('***.x83', 'positionen', 'csv')).toMatch(/^lv-positionen-/);
  });
});
