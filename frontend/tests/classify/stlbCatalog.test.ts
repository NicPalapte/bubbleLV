import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getStlbCatalog, parseStlbCsv } from '../../src/lib/classify/stlbCatalog';

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

  it('liest die Katalogversion, leer wird zu null', () => {
    const csv = [
      'lb_nummer,lb_bezeichnung,quelle_version',
      '091,Stundenlohnarbeiten,2023',
      '013,Betonarbeiten,',
    ].join('\n');
    const [mit, ohne] = parseStlbCsv(csv);
    expect(mit.quelleVersion).toBe('2023');
    expect(ohne.quelleVersion).toBeNull();
  });

  it('überspringt Zeilen ohne Nummer oder Bezeichnung', () => {
    const csv = ['lb_nummer,lb_bezeichnung,quelle_version', ',Ohne Nummer,', '013,,'].join('\n');
    expect(parseStlbCsv(csv)).toEqual([]);
  });
});
