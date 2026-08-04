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
    const catalog = getStlbCatalog();
    expect(catalog.find((lb) => lb.lbNummer === '013')?.keywords).toEqual(['betonarbeiten']);
    // Kein Kompositum auf -arbeiten/-anlagen → kein abgeleitetes Stichwort.
    expect(catalog.find((lb) => lb.lbNummer === '069')?.keywords).toEqual([]);
  });

  it('nimmt explizite Stichworte aus der CSV, pipe-getrennt', () => {
    const csv = [
      'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
      '091,Stundenlohnarbeiten,personal,stundenlohn|regiestunde,2023',
    ].join('\n');
    const [entry] = parseStlbCsv(csv);
    expect(entry.keywords).toEqual(['stundenlohn', 'regiestunde']);
    expect(entry.positionsartDefault).toBe('personal');
    expect(entry.quelleVersion).toBe('2023');
  });

  it('ignoriert eine unbekannte Positionsart statt sie zu übernehmen', () => {
    const csv = [
      'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
      '999,Phantasiearbeiten,quatsch,,',
    ].join('\n');
    expect(parseStlbCsv(csv)[0].positionsartDefault).toBeNull();
  });

  it('liefert bei leerer Referenz keinen Treffer', () => {
    expect(matchStlb('betonwand herstellen', [])).toBeNull();
  });

  it('bevorzugt das längste passende Stichwort', () => {
    const catalog = parseStlbCsv(
      [
        'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
        '013,Betonarbeiten,,betonarbeiten,',
        '017,Stahlbauarbeiten,,stahlbetonarbeiten,',
      ].join('\n'),
    );
    expect(matchStlb('stahlbetonarbeiten wand', catalog)?.lb.lbNummer).toBe('017');
  });
});
