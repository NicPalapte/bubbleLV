// Referenzdateien der Prüfregeln. Die App liest sie direkt aus
// docs/domain/reference/ — es gibt keine zweite Kopie, die abweichen könnte.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHECK_RULES } from '../../src/lib/check';
import {
  regelEintrag,
  regelParameter,
  regelStichworte,
  regelZahl,
  risikoFormulierungen,
} from '../../src/lib/check/referenz';
import { findeStichworte } from '../../src/lib/classify/material/stichwort';
import { parseCsv, splitList } from '../../src/lib/csv';

describe('Referenzdateien der Prüfregeln', () => {
  it('führt jede angemeldete Regel in pruefregeln.csv', () => {
    for (const rule of CHECK_RULES) {
      expect(regelEintrag(rule.id), `Regel ${rule.id} fehlt in pruefregeln.csv`).toBeDefined();
    }
  });

  it('gibt jeder Regel Name, Hinweis, Kategorie und Schwere aus der Tabelle', () => {
    for (const rule of CHECK_RULES) {
      const eintrag = regelEintrag(rule.id);
      expect(eintrag?.name, `${rule.id} ohne Name`).not.toBe('');
      expect(eintrag?.hinweis, `${rule.id} ohne Hinweis`).not.toBe('');
      expect(eintrag?.kategorie, `${rule.id} ohne gültige Kategorie`).not.toBeNull();
      expect(eintrag?.schwere, `${rule.id} ohne gültige Schwere`).not.toBeNull();
    }
  });

  it('liest Parameter, auch mit deutschem Komma', () => {
    expect(regelZahl('G4', 'zaunbreite')).toBe(1.5);
    expect(regelParameter('V2', 'einheiten_gruppe')).toBe('Stunde');
  });

  it('nennt einen fehlenden Parameter beim Namen, statt still mit 0 zu rechnen', () => {
    expect(() => regelZahl('G4', 'gibt-es-nicht')).toThrow(/gibt-es-nicht.*pruefregeln-parameter/);
  });

  it('liest die Suchwörter je Regel und findet Verweise samt Nummer', () => {
    const anlage = regelStichworte('V6').find((zeile) => zeile.wert === 'Anlage');
    expect(anlage).toBeDefined();
    const [treffer] = findeStichworte('Details siehe Anlage 3.', anlage!.pattern, null);
    expect(treffer.text).toBe('siehe Anlage 3');
    expect(regelStichworte('V9')).toEqual([]);
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
