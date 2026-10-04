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

  it('kommt auch mit Nicht-Fehlern zurecht', () => {
    expect(toPipelineError('irgendwas').message).toMatch(/unerwartet/);
    expect(toPipelineError(null).code).toBe('unknown');
  });
});

describe('describeFailure', () => {
  it('hängt an Bruchstücke den Hinweis zum Dateityp an', () => {
    const text = describeFailure({ code: 'validation', message: 'Kein GAEB-Dokument' });
    expect(text).toBe('Kein GAEB-Dokument. Erwartet wird eine GAEB-DA-XML-Datei (z. B. .x83).');
  });

  it('lässt einen fertigen Satz (endet mit Punkt) unverändert', () => {
    // Sonst stünde hinter „Die Datei x.x83 ist leer." noch „Die Datei ist beschädigt …".
    const satz = 'Die Datei leer.x83 ist leer.';
    expect(describeFailure({ code: 'parse', message: satz })).toBe(satz);
    expect(describeFailure({ code: 'validation', message: satz })).toBe(satz);
    expect(describeFailure({ code: 'version', message: satz })).toBe(satz);
  });

  it('gibt unbekannte Fehler unverändert aus', () => {
    const failure = toPipelineError(new Error('kaputt'));
    expect(describeFailure(failure)).toBe(failure.message);
  });
});
