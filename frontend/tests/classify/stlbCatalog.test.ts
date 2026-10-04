import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getStlbCatalog, matchStlb, parseStlbCsv } from '../../src/lib/classify/stlbCatalog';

const SHIPPED = resolve(process.cwd(), 'src/lib/classify/data/stlb-bau-leistungsbereiche.csv');
const CANONICAL = resolve(process.cwd(), '../docs/domain/reference/stlb-bau-leistungsbereiche.csv');

describe('STLB-Bau-Referenzkatalog', () => {
  it('ist deckungsgleich mit der gepflegten Datei unter docs/domain/reference/', () => {
    expect(readFileSync(SHIPPED, 'utf-8')).toBe(readFileSync(CANONICAL, 'utf-8'));
  });

  it('liest LB-Nummer und Bezeichnung inklusive Feldern mit Komma', () => {
    const catalog = getStlbCatalog();
    const mauer = catalog.find((lb) => lb.lbNummer === '012');
    const baustelle = catalog.find((lb) => lb.lbNummer === '000');
    expect(mauer?.lbBezeichnung).toBe('Mauerarbeiten');
    expect(baustelle?.lbBezeichnung).toBe('Baustelleneinrichtungen, Sicherheitseinrichtungen');
  });

  it('leitet Stichworte aus der Bezeichnung ab, solange die Spalte leer ist', () => {
    const catalog = parseStlbCsv(
      [
        'lb_nummer,lb_bezeichnung,keywords,quelle_version',
        '013,Betonarbeiten,,',
        // Kein Kompositum auf -arbeiten/-anlagen → kein abgeleitetes Stichwort.
        '069,Aufzüge,,',
      ].join('\n'),
    );
    expect(catalog[0].keywords).toEqual(['betonarbeiten']);
    expect(catalog[1].keywords).toEqual([]);
  });

  it('nimmt explizite Stichworte aus der CSV, pipe-getrennt', () => {
    const csv = [
      'lb_nummer,lb_bezeichnung,keywords,quelle_version',
      '091,Stundenlohnarbeiten,stundenlohn|regiestunde,2023',
    ].join('\n');
    const [entry] = parseStlbCsv(csv);
    expect(entry.keywords).toEqual(['stundenlohn', 'regiestunde']);
    expect(entry.quelleVersion).toBe('2023');
  });

  it('liefert bei leerer Referenz keinen Treffer', () => {
    expect(matchStlb('betonwand herstellen', [])).toBeNull();
  });

  it('bevorzugt das längste passende Stichwort', () => {
    const catalog = parseStlbCsv(
      [
        'lb_nummer,lb_bezeichnung,keywords,quelle_version',
        '013,Betonarbeiten,betonarbeiten,',
        '017,Stahlbauarbeiten,stahlbetonarbeiten,',
      ].join('\n'),
    );
    expect(matchStlb('stahlbetonarbeiten wand', catalog)?.lb.lbNummer).toBe('017');
  });
});
