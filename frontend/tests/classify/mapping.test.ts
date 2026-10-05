import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DIMENSIONEN,
  getMapping,
  MappingIndex,
  parseMappingCsv,
  type MappingRow,
  type MatchText,
} from '../../src/lib/classify/mapping';
import { getStlbCatalog } from '../../src/lib/classify/stlbCatalog';
import { POSITIONSARTEN } from '../../src/lib/classify/types';

const HEADER = 'dimension,code,stichwort,wo,gewicht,quelle,status,hinweis';
const SHIPPED = resolve(process.cwd(), 'src/lib/classify/data/zuordnung.csv');
const CANONICAL = resolve(process.cwd(), '../docs/domain/reference/zuordnung.csv');

function index(...lines: string[]): MappingIndex {
  return new MappingIndex(parseMappingCsv([HEADER, ...lines].join('\n')));
}

function text(alle: string, kurztext = alle): MatchText {
  return { kurztext, alle };
}

describe('parseMappingCsv', () => {
  it('liest alle Spalten', () => {
    const [row] = parseMappingCsv(
      [HEADER, 'leistungsbereich,013,Betonarbeiten,alle,100,katalog,bestaetigt,Ein Hinweis'].join(
        '\n',
      ),
    );
    expect(row).toEqual({
      dimension: 'leistungsbereich',
      code: '013',
      stichwort: 'betonarbeiten',
      wo: 'alle',
      gewicht: 100,
      quelle: 'katalog',
      status: 'bestaetigt',
      hinweis: 'Ein Hinweis',
    });
  });

  it('übersetzt _ am Rand in ein Leerzeichen', () => {
    const rows = parseMappingCsv(
      [
        HEADER,
        'steinart,KS,_ks-,alle,1,code,uebernommen,',
        'steinart,KS,mauer_,alle,1,code,uebernommen,',
      ].join('\n'),
    );
    expect(rows.map((row) => row.stichwort)).toEqual([' ks-', 'mauer ']);
  });

  it('lässt unbekannte Dimensionen und leere Stichworte weg, ohne Fehler', () => {
    const rows = parseMappingCsv(
      [
        HEADER,
        'quatsch,1,x,alle,1,code,bestaetigt,',
        'bauteiltyp,Wand,,alle,1,code,bestaetigt,',
      ].join('\n'),
    );
    expect(rows).toEqual([]);
  });

  it('wertet einen unbekannten oder leeren Status als Entwurf', () => {
    const rows = parseMappingCsv(
      [
        HEADER,
        'bauteiltyp,Wand,wand,alle,1,code,,',
        'bauteiltyp,Wand,mauer,alle,1,code,jein,',
      ].join('\n'),
    );
    expect(rows.map((row) => row.status)).toEqual(['entwurf', 'entwurf']);
  });

  it('kennt die Dimension kostengruppe schon als Format', () => {
    expect(DIMENSIONEN).toContain('kostengruppe');
    const [row] = parseMappingCsv(
      [HEADER, 'kostengruppe,331,aussenwand,alle,1,owner,entwurf,'].join('\n'),
    );
    expect(row.dimension).toBe('kostengruppe');
  });

  it('liefert bei nur einer Kopfzeile keine Zeilen', () => {
    expect(parseMappingCsv(HEADER)).toEqual([]);
  });
});

describe('MappingIndex.match', () => {
  it('liefert ohne Treffer null — auch ohne Zeilen für die Dimension', () => {
    expect(index().match('leistungsbereich', [text('betonwand')])).toBeNull();
    expect(
      index('leistungsbereich,013,betonarbeiten,alle,100,owner,bestaetigt,').match(
        'leistungsbereich',
        [text('erdarbeiten')],
      ),
    ).toBeNull();
  });

  it('bevorzugt bei gleichem Gewicht das längste Stichwort', () => {
    const mapping = index(
      'leistungsbereich,013,betonarbeiten,alle,100,owner,bestaetigt,',
      'leistungsbereich,017,stahlbetonarbeiten,alle,100,owner,bestaetigt,',
    );
    const hit = mapping.match('leistungsbereich', [text('stahlbetonarbeiten wand')]);
    expect(hit?.code).toBe('017');
    expect(hit?.stichwort).toBe('stahlbetonarbeiten');
    expect(hit?.alternativen.map((a) => a.code)).toEqual(['013']);
    expect(hit?.mehrdeutig).toBe(false);
  });

  it('lässt das Gewicht vor der Wortlänge entscheiden', () => {
    const mapping = index(
      'positionsart,personal,stundenlohnarbeiten,kurztext,100,owner,bestaetigt,',
      'positionsart,planung,plan,kurztext,200,owner,bestaetigt,',
    );
    expect(mapping.match('positionsart', [text('stundenlohnarbeiten plan')])?.code).toBe('planung');
  });

  it('meldet Gleichstand als mehrdeutig und nimmt den ersten in der Tabelle als Hauptwert', () => {
    const mapping = index(
      'leistungsbereich,003,landschaftsbauarbeiten,alle,100,katalog,uebernommen,',
      'leistungsbereich,004,landschaftsbauarbeiten,alle,100,katalog,uebernommen,',
    );
    const hit = mapping.match('leistungsbereich', [text('landschaftsbauarbeiten')]);
    expect(hit?.code).toBe('003');
    expect(hit?.mehrdeutig).toBe(true);
    expect(hit?.alternativen.map((a) => a.code)).toEqual(['004']);
  });

  it('zählt mehrere Stichworte desselben Codes nicht als Alternative', () => {
    const mapping = index(
      'bauteiltyp,Wand,wand,kurztext,100,owner,bestaetigt,',
      'bauteiltyp,Wand,mauerwerk,kurztext,100,owner,bestaetigt,',
    );
    const hit = mapping.match('bauteiltyp', [text('mauerwerkswand')]);
    expect(hit?.code).toBe('Wand');
    expect(hit?.alternativen).toEqual([]);
    expect(hit?.mehrdeutig).toBe(false);
  });

  it('prüft `kurztext` und `alle` gegen die jeweilige Sicht', () => {
    const mapping = index(
      'bauteiltyp,Wand,wand,kurztext,100,owner,bestaetigt,',
      'steinart,Ziegel,ziegel,alle,100,owner,bestaetigt,',
    );
    const item = text('position wand im langtext, ziegel', 'position');
    expect(mapping.match('bauteiltyp', [item])).toBeNull();
    expect(mapping.match('steinart', [item])?.code).toBe('Ziegel');
  });

  it('nimmt den ersten Text mit Treffer: Position vor Überschriften, nächste zuerst', () => {
    const mapping = index(
      'leistungsbereich,002,erdarbeiten,alle,100,owner,bestaetigt,',
      'leistungsbereich,013,betonarbeiten,alle,100,owner,bestaetigt,',
    );
    const ohneTreffer = text('position ohne bezug');
    const innen = text('titel betonarbeiten');
    const aussen = text('los erdarbeiten');

    const ausUeberschrift = mapping.match('leistungsbereich', [ohneTreffer, innen, aussen]);
    expect(ausUeberschrift?.code).toBe('013');
    expect(ausUeberschrift?.fundstelle).toBe(1);

    const ausPosition = mapping.match('leistungsbereich', [text('erdarbeiten'), innen]);
    expect(ausPosition?.code).toBe('002');
    expect(ausPosition?.fundstelle).toBe(0);
  });

  it('lässt Lernregeln vor allen anderen Quellen gelten', () => {
    const mapping = index(
      'leistungsbereich,013,betonarbeiten,alle,500,owner,bestaetigt,',
      'leistungsbereich,012,beton,alle,1,lernregel,bestaetigt,',
    );
    const hit = mapping.match('leistungsbereich', [text('betonarbeiten')]);
    expect(hit?.code).toBe('012');
    expect(hit?.alternativen.map((a) => a.code)).toEqual(['013']);
  });

  it('ignoriert Entwürfe, wendet aber „übernommen" an', () => {
    const mapping = index(
      'bauteiltyp,Wand,wand,kurztext,100,owner,entwurf,',
      'bauteiltyp,Decke,decke,kurztext,100,code,uebernommen,',
    );
    expect(mapping.match('bauteiltyp', [text('wand')])).toBeNull();
    expect(mapping.match('bauteiltyp', [text('decke')])?.code).toBe('Decke');
  });

  it('trifft ein Stichwort mit führendem Leerzeichen nur am Wortanfang', () => {
    const mapping = index('steinart,Kalksandstein,_ks-,alle,100,code,uebernommen,');
    expect(mapping.match('steinart', [text('wand ks-plan')])?.code).toBe('Kalksandstein');
    expect(mapping.match('steinart', [text('ks-plan wand')])).toBeNull();
    expect(mapping.match('steinart', [text('stahlks-plan')])).toBeNull();
  });
});

describe('MappingIndex.vocabulary', () => {
  it('liefert die Stichworte einer Dimension, dedupliziert, längste zuerst', () => {
    const mapping = index(
      'material,Beton,beton,alle,100,owner,bestaetigt,',
      'material,Stahlbeton,stahlbeton,alle,100,owner,bestaetigt,',
      'material,Beton,beton,alle,100,owner,bestaetigt,',
      'bauteiltyp,Wand,wand,kurztext,100,owner,bestaetigt,',
    );
    expect(mapping.vocabulary('material')).toEqual(['stahlbeton', 'beton']);
    expect(mapping.vocabulary('steinart')).toEqual([]);
  });
});

describe('mitgelieferte Mappingtabelle', () => {
  it('ist deckungsgleich mit der gepflegten Datei unter docs/domain/reference/', () => {
    expect(readFileSync(SHIPPED, 'utf-8')).toBe(readFileSync(CANONICAL, 'utf-8'));
  });

  const rows: MappingRow[] = parseMappingCsv(readFileSync(SHIPPED, 'utf-8'));

  it('hat keine Zeile mit unbekannter Dimension (sie fiele still weg)', () => {
    const lines = readFileSync(SHIPPED, 'utf-8')
      .split('\n')
      .filter((l) => l.trim() !== '');
    expect(rows).toHaveLength(lines.length - 1);
  });

  it('verweist nur auf LB-Nummern, die im Katalog stehen', () => {
    const nummern = new Set(getStlbCatalog().map((lb) => lb.lbNummer));
    const unbekannt = rows
      .filter((row) => row.dimension === 'leistungsbereich')
      .filter((row) => !nummern.has(row.code));
    expect(unbekannt).toEqual([]);
  });

  it('nutzt für die Positionsart nur bekannte Werte', () => {
    const unbekannt = rows
      .filter((row) => row.dimension === 'positionsart')
      .filter((row) => !(POSITIONSARTEN as readonly string[]).includes(row.code));
    expect(unbekannt).toEqual([]);
  });

  it('führt keine Zeile doppelt', () => {
    const keys = rows.map((row) => `${row.dimension}|${row.code}|${row.stichwort}|${row.wo}`);
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
  });

  it('wirkt als Index: eine Betonwand ist ein Bauteil, Stundenlohn ist Personal', () => {
    const mapping = getMapping();
    expect(mapping.match('bauteiltyp', [text('stahlbetonwand')])?.code).toBe('Wand');
    expect(mapping.match('positionsart', [text('stundenlohn polier')])?.code).toBe('personal');
  });
});
