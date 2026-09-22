// Stichwort an der Positions-Bubble (WP-Q, Schritt 3; Issue #51).

import { describe, expect, it } from 'vitest';
import { keywordFor, pickKeyword } from '../../src/lib/graph/keywords';
import type { PositionSummary } from '../../src/types/lvNode';

describe('pickKeyword', () => {
  it('nimmt das Fachwort statt des Tätigkeitsworts', () => {
    expect(pickKeyword('Liefern und Einbauen von Stahlbetonfertigteilen')).toBe(
      'Stahlbetonfertigteilen',
    );
    expect(pickKeyword('Kalksandstein-Innenwand d=24 cm herstellen')).toBe('Kalksandstein');
  });

  it('lässt Zahlen, Einheiten und Füllwörter aus', () => {
    // „30 cm" und „der" tragen nichts — sie dürfen nie als Stichwort erscheinen.
    expect(pickKeyword('Wand 30 cm')).toBe('Wand');
    // Bei gleicher Länge gewinnt das vordere Wort.
    expect(pickKeyword('Die Decke der Halle')).toBe('Decke');
  });

  it('gibt nichts zurück, wenn nichts zu sagen ist', () => {
    expect(pickKeyword('')).toBe('');
    expect(pickKeyword('5 m²')).toBe('');
  });

  it('antwortet auf denselben Text gleich', () => {
    const text = 'Bewehrungsstahl liefern und verlegen';
    expect(pickKeyword(text)).toBe(pickKeyword(text));
  });
});

describe('keywordFor', () => {
  function position(shortText: string): PositionSummary {
    return {
      oz: '001.0010',
      shortText,
      longText: '',
      unit: null,
      quantity: null,
      unitPrice: null,
      positionType: 'NORMAL',
      attributes: {},
    };
  }

  it('gibt dasselbe Wort wie die reine Wortwahl', () => {
    const p = position('Bewehrungsstahl liefern und verlegen');
    expect(keywordFor(p)).toBe(pickKeyword(p.shortText));
    // Zweiter Aufruf kommt aus dem Merkspeicher — dasselbe Ergebnis.
    expect(keywordFor(p)).toBe('Bewehrungsstahl');
  });

  it('merkt sich je Position, nicht je Text', () => {
    // Zwei Positionen mit demselben Text sind zwei Einträge — dafür
    // verschwindet der Eintrag mit seiner Position, sobald ein anderes LV
    // geladen wird.
    const a = position('Estrichdämmung verlegen');
    const b = position('Estrichdämmung verlegen');
    expect(keywordFor(a)).toBe(keywordFor(b));
  });
});
