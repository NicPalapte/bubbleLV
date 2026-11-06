import { describe, expect, it } from 'vitest';
import { guessDocKind, largerThanA3, titleOfPage, type FirstPage } from '../../src/docs/docKind';

const A4: FirstPage = { width: 595, height: 842, title: '' };
const A1 = { width: 2384, height: 1684 };

describe('guessDocKind', () => {
  // Gleiche Fälle wie bauonto tests/test_inventar.py (nur Dateiname, ohne Ordner).
  it.each([
    ['Baubeschreibung_Musterstrasse.pdf', 'baubeschreibung'],
    ['Vorbemerkungen zur Baubeschreibung.pdf', 'vorbemerkungen'],
    ['Baugrund-Gutachten_v2.pdf', 'gutachten'],
    ['Bauzeitenplan.pdf', 'terminplan'],
    ['AIA_Musterstrasse.pdf', 'aia'],
    ['BAP Entwurf.pdf', 'bap'],
    ['Anhang 3 Technische Vorschriften.pdf', 'anhang-baubeschreibung'],
    ['Anhang 5 BE.pdf', 'plan'],
    ['ZVB.pdf', 'vertrag'],
    ['Formblatt 221.pdf', 'formblatt'],
    ['Lageplan_M500.pdf', 'plan'],
  ])('%s ⇒ %s', (name, kind) => {
    const guess = guessDocKind(name, null);
    expect(guess.kind).toBe(kind);
    expect(guess.rule).toBe('name');
  });

  it('nennt das gefundene Wort', () => {
    expect(guessDocKind('Baugrund_Teil1.pdf', null).hit).toBe('baugrund');
  });

  it('Wortgrenze gilt auch nach Umlauten', () => {
    // „übe“ enthält „be“, ist aber kein BE-Plan.
    expect(guessDocKind('Protokoll übe.pdf', A4).kind).toBeNull();
  });

  it('ohne Treffer: nicht erkannt', () => {
    expect(guessDocKind('Anschreiben.pdf', A4)).toEqual({ kind: null, rule: null, hit: null });
  });

  it('Name schlägt großes Format', () => {
    expect(guessDocKind('Anhang 4 Vermessung.pdf', { ...A1, title: '' }).kind).toBe(
      'anhang-baubeschreibung',
    );
  });

  it('erste Seite größer als A3 ⇒ Plan', () => {
    expect(guessDocKind('123-BW-04.pdf', { ...A1, title: 'Gutachten' })).toEqual({
      kind: 'plan',
      rule: 'format',
      hit: null,
    });
  });

  it('sonst Titel der ersten Seite', () => {
    const guess = guessDocKind('Dok_0815.pdf', { ...A4, title: 'Geotechnischer Bericht' });
    expect(guess).toEqual({ kind: 'gutachten', rule: 'titel', hit: 'geotechnischer' });
  });

  it('„Bild“ im Titel ist kein Foto', () => {
    expect(
      guessDocKind('Dok.pdf', { ...A4, title: 'Fortbildung der Mitarbeiter' }).kind,
    ).toBeNull();
  });
});

describe('largerThanA3', () => {
  it('A3 quer und hoch nicht, A2 schon', () => {
    expect(largerThanA3(1191, 842)).toBe(false);
    expect(largerThanA3(842, 1191)).toBe(false);
    expect(largerThanA3(1684, 1191)).toBe(true);
  });
});

describe('titleOfPage', () => {
  it('nimmt die größte Schrift', () => {
    const items = [
      { str: 'Baugrundgutachten', height: 24 },
      { str: 'Neubau einer Brücke', height: 23 },
      { str: 'Auftraggeber: Muster GmbH, Musterweg 1', height: 10 },
    ];
    expect(titleOfPage(items)).toBe('Baugrundgutachten Neubau einer Brücke');
  });

  it('ein großes Zeichen allein ist kein Titel', () => {
    const items = [
      { str: 'A', height: 60 },
      { str: 'Baubeschreibung', height: 20 },
      { str: 'Text der Seite in kleiner Schrift', height: 10 },
    ];
    expect(titleOfPage(items)).toBe('A Baubeschreibung');
  });

  it('ohne Text leer', () => {
    expect(titleOfPage([{ str: '3', height: 10 }])).toBe('');
  });
});
