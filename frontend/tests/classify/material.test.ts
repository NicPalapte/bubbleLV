// Materialwissen aus Tabellen (Entscheidung 0045): Stichwort-Schreibweise,
// Lesen der CSV, Erkennung samt Merkmalen und Fundstellen. Die ausgelieferten
// Tabellen müssen deckungsgleich mit docs/domain/reference/material/ sein.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractMaterial } from '../../src/lib/classify/extractors/material';
import { materialKatalog, parseMaterialCsv } from '../../src/lib/classify/material/katalog';
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
    expect(leer.erkennung).toBeNull();
    expect(extractMaterial({ shortText: 'Holz', longText: '' }, [leer])).toEqual({
      attributes: {},
      spans: [],
    });
  });
});

describe('Material erkennen', () => {
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

describe('Ausgelieferte Materialtabellen', () => {
  const shippedDir = resolve(process.cwd(), 'src/lib/classify/material/data');
  const canonicalDir = resolve(process.cwd(), '../docs/domain/reference/material');

  it('sind deckungsgleich mit docs/domain/reference/material/', () => {
    const shipped = readdirSync(shippedDir).sort();
    expect(shipped).toEqual(readdirSync(canonicalDir).sort());
    for (const datei of shipped) {
      expect(readFileSync(resolve(shippedDir, datei), 'utf-8'), datei).toBe(
        readFileSync(resolve(canonicalDir, datei), 'utf-8'),
      );
    }
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
