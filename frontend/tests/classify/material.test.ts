// Materialwissen aus Tabellen (Entscheidung 0045): Stichwort-Schreibweise,
// Lesen der CSV, Erkennung samt Merkmalen und Fundstellen. Die ausgelieferten
// Tabellen liest die App direkt aus docs/domain/reference/material/.

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractMaterial } from '../../src/lib/classify/extractors/material';
import { materialKatalog, parseMaterialCsv } from '../../src/lib/classify/material/katalog';
import { trefferProtokoll } from '../../src/lib/classify/material/protokoll';
import { compileStichworte } from '../../src/lib/classify/material/stichwort';
import { FACETS_BY_ID } from '../../src/lib/facets';
import { attributeLabel } from '../../src/lib/attributes';

function trifft(stichworte: string[], text: string): string[] {
  const pattern = compileStichworte(stichworte);
  return pattern === null ? [] : [...text.matchAll(pattern)].map((match) => match[0]);
}

describe('Stichwort-Schreibweise', () => {
  it('trifft nur ganze Wörter, ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    expect(trifft(['beton'], 'Beton und Betonstahl')).toEqual(['Beton']);
    expect(trifft(['beton'], 'Stahlbeton')).toEqual([]);
  });

  it('liest * als beliebige Buchstaben und # als Zahl', () => {
    expect(trifft(['beton*'], 'Betonwand, Beton')).toEqual(['Betonwand', 'Beton']);
    expect(trifft(['C#/#'], 'Beton C30/37 und LC25/28')).toEqual(['C30/37']);
    expect(trifft(['XC#'], 'XC4, XD1')).toEqual(['XC4']);
  });

  it('liest ** und ## wie * und #', () => {
    expect(compileStichworte(['beton**'])?.source).toBe(compileStichworte(['beton*'])?.source);
    expect(compileStichworte(['C##'])?.source).toBe(compileStichworte(['C#'])?.source);
    expect(trifft(['beton**'], 'Betonwand')).toEqual(['Betonwand']);
  });

  it('lässt zwischen Wörtern beliebigen Leerraum zu', () => {
    expect(trifft(['einschl. bewehrung'], 'einschl.\n  Bewehrung')).toEqual([
      'einschl.\n  Bewehrung',
    ]);
  });

  it('nimmt Sonderzeichen wörtlich', () => {
    expect(trifft(['wu-beton*'], 'WU-Beton nach Richtlinie')).toEqual(['WU-Beton']);
    expect(trifft(['b+c'], 'bbc b+c')).toEqual(['b+c']);
  });
});

const TABELLE = [
  'merkmal,wert,stichworte,ausser,bemerkung',
  'Erkennung,,beton*|*beton|C#/#,betonstahl*,',
  'Bauweise,Ortbeton,ortbeton*,,',
  'Bauweise,Fertigteil,fertigteil*,,',
  'Festigkeit,,C#/#,,ohne Wert: der Fund ist der Wert',
].join('\n');

const BETON = parseMaterialCsv('beton.csv', TABELLE);

function material(shortText: string, longText = '') {
  return extractMaterial({ shortText, longText }, [BETON]);
}

describe('Materialtabelle lesen', () => {
  it('bildet Name und Merkmals-Keys aus Datei und Spalte', () => {
    expect(BETON.name).toBe('Beton');
    expect(BETON.merkmale.map((merkmal) => merkmal.key)).toEqual([
      'betonBauweise',
      'betonFestigkeit',
    ]);
  });

  it('liest auch eine Datei aus einem deutschen Excel (Semikolon)', () => {
    const excel = parseMaterialCsv('beton.csv', `\uFEFF${TABELLE.replace(/,/g, ';')}`);
    expect(excel.merkmale.map((merkmal) => merkmal.key)).toEqual([
      'betonBauweise',
      'betonFestigkeit',
    ]);
  });

  it('kennt ohne Erkennungszeile kein Material', () => {
    const leer = parseMaterialCsv('holz.csv', 'merkmal,wert,stichworte,ausser,bemerkung\n');
    expect(leer.erkennung).toEqual([]);
    expect(extractMaterial({ shortText: 'Holz', longText: '' }, [leer])).toEqual({
      attributes: {},
      spans: [],
    });
  });
});

describe('Material erkennen', () => {
  it('wendet „ausser" nur auf die eigene Erkennungszeile an', () => {
    const zweiZeilen = parseMaterialCsv(
      'stahl.csv',
      [
        'merkmal,wert,stichworte,ausser,bemerkung',
        'Erkennung,,stahl*,stahlbeton*,',
        'Erkennung,,stahlbeton*,,',
      ].join('\n'),
    );
    expect(
      extractMaterial({ shortText: 'Stahlbetonwand', longText: '' }, [zweiZeilen]).attributes,
    ).toEqual({ material: ['Stahl'] });
  });

  it('erkennt Beton an der Festigkeitsklasse, auch ohne das Wort', () => {
    expect(material('Wand C30/37').attributes).toMatchObject({
      material: ['Beton'],
      betonFestigkeit: ['C30/37'],
    });
  });

  it('zählt Fundstellen aus „ausser" nicht', () => {
    expect(material('Betonstahl B500B').attributes).toEqual({});
  });

  it('sucht Merkmale nur, wenn das Material erkannt ist', () => {
    expect(material('Fertigteiltreppe aus Holz').attributes).toEqual({});
    expect(material('Fertigteiltreppe aus Beton').attributes).toMatchObject({
      betonBauweise: ['Fertigteil'],
    });
  });

  it('führt mehrere Werte eines Merkmals in Fundreihenfolge', () => {
    expect(material('Ortbeton', 'Teile als Fertigteil').attributes.betonBauweise).toEqual([
      'Ortbeton',
      'Fertigteil',
    ]);
  });

  it('markiert Fundstellen im Langtext, das Merkmal vor dem Material', () => {
    const longText = 'Wand aus Ortbeton.';
    const { spans } = material('', longText);
    const ortbeton = spans.filter((span) => longText.slice(span.start, span.end) === 'Ortbeton');
    expect(ortbeton.map((span) => span.label)).toEqual(['Bauweise: Ortbeton', 'Beton']);
    expect(spans.every((span) => span.key === 'material')).toBe(true);
  });
});

describe('Treffer-Protokoll', () => {
  const protokoll = (shortText: string, longText = '') =>
    trefferProtokoll({ shortText, longText }, [BETON]);

  it('nennt Tabelle, Zeile, Stichwort und Ort je Treffer', () => {
    expect(protokoll('', 'Wand aus Ortbeton.')).toEqual([
      expect.objectContaining({
        merkmal: 'Erkennung',
        fundtext: 'Ortbeton',
        stichwort: '*beton',
        tabelle: 'beton.csv',
        zeile: 2,
        ort: 'Langtext',
        status: 'gezählt',
      }),
      expect.objectContaining({ merkmal: 'Bauweise', wert: 'Ortbeton', zeile: 3 }),
    ]);
  });

  it('führt Treffer, die „ausser" verwirft, mit Status', () => {
    expect(protokoll('Betonstahl')).toEqual([
      expect.objectContaining({ fundtext: 'Betonstahl', status: 'verworfen (ausser)' }),
    ]);
  });

  it('meldet ein Merkmal ohne erkanntes Material als nicht gesucht', () => {
    expect(protokoll('Fertigteiltreppe aus Holz')).toEqual([
      expect.objectContaining({ merkmal: 'Bauweise', status: 'nicht gesucht' }),
    ]);
  });

  it('markiert mehrere Werte eines Merkmals und Erkennung nur über Muster', () => {
    const zeilen = protokoll('Fertigteil C30/37', 'teils Ortbeton');
    const bauweise = zeilen.filter((zeile) => zeile.merkmal === 'Bauweise');
    expect(bauweise.map((zeile) => zeile.auffaellig)).toEqual([
      'mehrere Werte: Ortbeton, Fertigteil',
      'mehrere Werte: Ortbeton, Fertigteil',
    ]);
    const nurKlasse = protokoll('Wand C30/37').find((zeile) => zeile.merkmal === 'Erkennung');
    expect(nurKlasse?.auffaellig).toBe('nur über Muster erkannt');
  });

  it('zählt dasselbe wie die Erkennung', () => {
    for (const text of ['Wand aus Ortbeton', 'Betonstahl B500B', 'Fertigteil aus Holz']) {
      const gezaehlt = protokoll(text).filter((zeile) => zeile.status === 'gezählt');
      const attributes = material(text).attributes;
      expect(gezaehlt.some((zeile) => zeile.merkmal === 'Erkennung')).toBe(
        attributes.material !== undefined,
      );
    }
  });
});

describe('Ausgelieferte Materialtabellen', () => {
  it('liest jede Tabelle aus docs/domain/reference/material/', () => {
    const dateien = readdirSync(resolve(process.cwd(), '../docs/domain/reference/material'));
    expect(materialKatalog().map((material) => material.datei)).toEqual(dateien.sort());
  });

  it('bringen Beton mit Art, Bauweise und Bewehrung mit', () => {
    const beton = materialKatalog().find((entry) => entry.id === 'beton');
    expect(beton?.merkmale.map((merkmal) => merkmal.key)).toEqual([
      'betonArt',
      'betonBauweise',
      'betonBewehrung',
    ]);
  });

  it('erzeugen je Merkmal einen Filter und einen Anzeigenamen', () => {
    expect(FACETS_BY_ID.get('material')?.label).toBe('Material');
    expect(FACETS_BY_ID.get('betonBauweise')?.label).toBe('Bauweise (Beton)');
    expect(attributeLabel('betonBewehrung')).toBe('Bewehrung (Beton)');
  });

  it('unterscheiden „unbewehrt" von „bewehrt"', () => {
    const katalog = materialKatalog();
    const lies = (text: string) =>
      extractMaterial({ shortText: 'Bodenplatte C25/30', longText: text }, katalog).attributes
        .betonBewehrung;
    expect(lies('Unbewehrt ausführen.')).toEqual(['unbewehrt']);
    expect(lies('Bewehrt, einschl. Bewehrung.')).toEqual(['enthalten']);
  });
});
