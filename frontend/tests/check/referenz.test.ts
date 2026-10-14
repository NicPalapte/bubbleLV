// Referenzdateien der Prüfregeln. Die App liest sie direkt aus
// docs/domain/reference/ — es gibt keine zweite Kopie, die abweichen könnte.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHECK_RULES } from '../../src/lib/check';
import { regelEintrag, risikoFormulierungen } from '../../src/lib/check/referenz';
import { parseCsv, splitList } from '../../src/lib/csv';

describe('Referenzdateien der Prüfregeln', () => {
  it('führt jede angemeldete Regel in pruefregeln.csv', () => {
    for (const rule of CHECK_RULES) {
      expect(regelEintrag(rule.id), `Regel ${rule.id} fehlt in pruefregeln.csv`).toBeDefined();
    }
  });

  it('nennt zu jeder Risiko-Formulierung ihre Quelle', () => {
    const rows = parseCsv(
      readFileSync(
        resolve(process.cwd(), '../docs/domain/reference/risiko-formulierungen.csv'),
        'utf-8',
      ),
    );
    for (const row of rows) {
      expect(row.get('quelle_version'), `"${row.get('formulierung')}" ohne Quelle`).not.toBe('');
    }
    expect(risikoFormulierungen().length).toBeGreaterThan(0);
  });
});

describe('parseCsv', () => {
  it('liefert für eine Datei mit nur der Kopfzeile eine leere Liste', () => {
    expect(parseCsv('name,gewerk\n')).toEqual([]);
  });

  it('liest Felder mit Komma in Anführungszeichen', () => {
    const [row] = parseCsv('a,b\n"eins, zwei",drei');
    expect(row.get('a')).toBe('eins, zwei');
    expect(row.get('b')).toBe('drei');
  });

  it('liefert für eine unbekannte Spalte einen leeren Wert statt eines Fehlers', () => {
    const [row] = parseCsv('a\nwert');
    expect(row.get('gibtsnicht')).toBe('');
  });

  it('zerlegt pipe-getrennte Listen kleingeschrieben und ohne Leereinträge', () => {
    expect(splitList('Stk| STCK ||stück')).toEqual(['stk', 'stck', 'stück']);
    expect(splitList('')).toEqual([]);
  });
});
