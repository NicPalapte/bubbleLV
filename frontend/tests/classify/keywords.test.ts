// Besonderheiten-Stichworte (classify/keywords.ts), Issue #90.

import { describe, expect, it } from 'vitest';
import { extractKeywords } from '../../src/lib/classify/keywords';
import { normalizeItem } from '../../src/lib/classify/text';

function keywordsOf(longText: string, shortText = ''): string[] {
  return extractKeywords(normalizeItem({ shortText, longText, unit: null }));
}

describe('extractKeywords: Bestand', () => {
  it('hält „Bestandteile" nicht für Bestand', () => {
    // „Bestandteil" ist kein Bestandsbau; als Teilstring traf "bestand" trotzdem.
    expect(keywordsOf('Alle Bestandteile der Anlage liefern.')).not.toContain('Bestand');
    expect(keywordsOf('Wesentlicher Bestandteil der Leistung.')).not.toContain('Bestand');
  });

  it('erkennt Bestand weiterhin, auch als Kompositum', () => {
    expect(keywordsOf('Mit dem Bestand vor Ort abgleichen.')).toContain('Bestand');
    expect(keywordsOf('Ergänzung des Bestandes.')).toContain('Bestand');
    expect(keywordsOf('Bestandsbauteil aufnehmen.')).toContain('Bestand');
    expect(keywordsOf('Anschluss an Bestandswand.')).toContain('Bestand');
    expect(keywordsOf('Altbau sanieren.')).toContain('Bestand');
  });

  it('erkennt Bestand neben „Bestandteil" im selben Text', () => {
    expect(keywordsOf('Bestandteile prüfen, Anschluss an den Bestand.')).toContain('Bestand');
  });
});
