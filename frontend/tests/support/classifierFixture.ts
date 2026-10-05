// Test-Klassifizierer aus einer kleinen LB-CSV mit Spalte `keywords`
// (lb_nummer, lb_bezeichnung, keywords, quelle_version). Die Stichworte werden zu
// Zeilen der Dimension `leistungsbereich`; alle anderen Dimensionen (Positionsart,
// Bauteiltyp, …) kommen aus der mitgelieferten Mappingtabelle — so testen die Tests
// den echten Abgleich und nicht einen Nachbau.

import zuordnungCsv from '../../src/lib/classify/data/zuordnung.csv?raw';
import { parseCsv, splitList } from '../../src/lib/csv';
import { getClassifier } from '../../src/lib/classify';
import { MappingIndex, parseMappingCsv, type MappingRow } from '../../src/lib/classify/mapping';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import type { Classifier } from '../../src/lib/classify';

const BUNDLED_OHNE_LB = parseMappingCsv(zuordnungCsv).filter(
  (row) => row.dimension !== 'leistungsbereich' && row.dimension !== 'material',
);

export function lbRows(keywordCsv: string): MappingRow[] {
  return parseCsv(keywordCsv).flatMap((row) =>
    splitList(row.get('keywords')).map((stichwort): MappingRow => ({
      dimension: 'leistungsbereich',
      code: row.get('lb_nummer'),
      stichwort,
      wo: 'alle',
      gewicht: 100,
      quelle: 'owner',
      status: 'bestaetigt',
      hinweis: '',
    })),
  );
}

export function materialRows(words: readonly string[]): MappingRow[] {
  return words.map((stichwort): MappingRow => ({
    dimension: 'material',
    code: stichwort,
    stichwort,
    wo: 'alle',
    gewicht: 100,
    quelle: 'owner',
    status: 'bestaetigt',
    hinweis: '',
  }));
}

export function fixtureMapping(keywordCsv = '', material: readonly string[] = []): MappingIndex {
  return new MappingIndex([...BUNDLED_OHNE_LB, ...lbRows(keywordCsv), ...materialRows(material)]);
}

export function fixtureClassifier(
  keywordCsv: string,
  material: readonly string[] = [],
): Classifier {
  return getClassifier({
    catalog: parseStlbCsv(keywordCsv),
    mapping: fixtureMapping(keywordCsv, material),
  });
}
