// Dateiendungen von GAEB DA XML: GAEB-Wissen, deshalb in lib/gaeb/ (Review auf PR 114).

import { describe, expect, it } from 'vitest';
import { fileExtension, GAEB_ENDUNGEN, isGaebExtension } from '../../src/lib/gaeb';

describe('fileExtension', () => {
  it('liefert die Endung klein geschrieben, ohne Punkt', () => {
    expect(fileExtension('LV.X83')).toBe('x83');
    expect(fileExtension('a.b.xml')).toBe('xml');
  });

  it('liefert null ohne Endung', () => {
    expect(fileExtension('ohne-endung')).toBeNull();
    expect(fileExtension('endet-auf-punkt.')).toBeNull();
  });

  it('nimmt keinen Ordnernamen für die Endung', () => {
    expect(fileExtension('ordner.x83/datei')).toBeNull();
    expect(fileExtension('ordner.x83\\datei')).toBeNull();
  });
});

describe('isGaebExtension', () => {
  it('kennt X81 bis X86 und xml', () => {
    for (const endung of GAEB_ENDUNGEN) expect(isGaebExtension(endung)).toBe(true);
    expect(GAEB_ENDUNGEN).toEqual(['x81', 'x82', 'x83', 'x84', 'x85', 'x86', 'xml']);
  });

  it('lehnt alles andere ab', () => {
    for (const endung of ['pdf', 'png', 'x80', 'x87', 'txt', '']) {
      expect(isGaebExtension(endung)).toBe(false);
    }
    expect(isGaebExtension(null)).toBe(false);
  });
});
