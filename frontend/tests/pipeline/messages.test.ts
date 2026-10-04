// Fehlermeldungen der Pipeline (Issue #92): Deutsch, ohne Systemtext, mit einem
// nächsten Schritt.

import { describe, expect, it } from 'vitest';
import { GAEBParseError, GAEBValidationError, GAEBVersionError } from '../../src/lib/gaeb';
import { describeFailure, toPipelineError } from '../../src/lib/pipeline/messages';

describe('toPipelineError', () => {
  it('bildet die drei eigenen Fehler auf ihren Code ab', () => {
    expect(toPipelineError(new GAEBParseError('x')).code).toBe('parse');
    expect(toPipelineError(new GAEBValidationError('x')).code).toBe('validation');
    expect(toPipelineError(new GAEBVersionError('x')).code).toBe('version');
  });

  it('zeigt bei unbekannten Fehlern keinen englischen Systemtext', () => {
    const failure = toPipelineError(new RangeError('Maximum call stack size exceeded'));
    expect(failure.code).toBe('unknown');
    expect(failure.message).not.toMatch(/Maximum|stack|exceeded/i);
    expect(failure.message).toMatch(/unerwartet/);
  });

  it('hebt die Ursache unerwarteter Fehler als Text auf (Review auf PR 114)', () => {
    // Die UI zeigt nur den deutschen Satz; die Ursache bleibt für die Fehlersuche
    // erhalten — als Text, damit sie die Worker-Grenze (postMessage) übersteht.
    const failure = toPipelineError(new RangeError('Maximum call stack size exceeded'));
    expect(failure.detail).toBe('RangeError: Maximum call stack size exceeded');
    expect(failure.message).not.toContain('Maximum');
  });

  it('übersteht structuredClone, wie beim Weg aus dem Worker', () => {
    const failure = toPipelineError(new TypeError('x ist nicht definiert'));
    expect(structuredClone(failure)).toEqual(failure);
  });

  it('kommt auch mit Nicht-Fehlern zurecht', () => {
    expect(toPipelineError('irgendwas').detail).toBe('irgendwas');
    expect(toPipelineError('irgendwas').message).toMatch(/unerwartet/);
    expect(toPipelineError(null).code).toBe('unknown');
  });
});

describe('describeFailure', () => {
  it('hängt an Bruchstücke den Hinweis zum Dateityp an', () => {
    const text = describeFailure({ code: 'validation', message: 'Kein GAEB-Dokument' });
    expect(text).toBe('Kein GAEB-Dokument. Erwartet wird eine GAEB-DA-XML-Datei (z. B. .x83).');
  });

  it('lässt eine als vollständig gekennzeichnete Meldung unverändert', () => {
    // Sonst stünde hinter „Die Datei x.x83 ist leer." noch „Die Datei ist beschädigt …".
    const satz = 'Die Datei leer.x83 ist leer.';
    for (const code of ['parse', 'validation', 'version'] as const) {
      expect(describeFailure({ code, message: satz, complete: true })).toBe(satz);
    }
  });

  it('hängt den Hinweis auch an, wenn ein Bruchstück zufällig auf einen Punkt endet', () => {
    // Die Vollständigkeit steht im Fehler, nicht im letzten Zeichen: ein Dateiname
    // wie „LV." darf den Hinweis nicht verschlucken.
    const text = describeFailure({ code: 'validation', message: 'Kein GAEB-Dokument in LV.' });
    expect(text).toContain('Erwartet wird eine GAEB-DA-XML-Datei');
  });

  it('übernimmt die Kennzeichnung aus dem Fehler', () => {
    expect(toPipelineError(new GAEBParseError('x', { complete: true })).complete).toBe(true);
    expect(toPipelineError(new GAEBParseError('x')).complete).toBe(false);
    expect(toPipelineError(new GAEBValidationError('x', { complete: true })).complete).toBe(true);
    expect(toPipelineError(new GAEBVersionError('x', { complete: true })).complete).toBe(true);
  });

  it('lässt die Meldung bei unerwarteten Fehlern ungekürzt', () => {
    const failure = toPipelineError(new Error('kaputt'));
    expect(failure.complete).toBe(true);
    expect(describeFailure(failure)).toBe(failure.message);
  });

  it('gibt unbekannte Fehler unverändert aus', () => {
    const failure = toPipelineError(new Error('kaputt'));
    expect(describeFailure(failure)).toBe(failure.message);
  });
});
