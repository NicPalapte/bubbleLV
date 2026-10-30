// Wissen der Prüfregeln (Entscheidung 0085): Regeln in docs/domain/reference/regeln.json,
// Wortlisten und Einheiten-Gruppen in den CSV daneben. Die App liest sie direkt — es gibt
// keine zweite Kopie, die abweichen könnte.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { blocksOf } from '@core';
import { describe, expect, it } from 'vitest';
import { CHECK_RULES, codeOf } from '../../src/lib/check';
import { parseCsv, splitList } from '../../src/lib/csv';
import { builtinParameter, RULE_CONTEXT } from '../../src/lib/rules/rules';

describe('Prüfregeln im Grundstock', () => {
  it('führt alle zwölf Prüfregeln, jede mit Kürzel, Name und Hinweis', () => {
    expect(CHECK_RULES.map((rule) => codeOf(rule.id))).toEqual([
      'V1',
      'V2',
      'V3',
      'V4',
      'V5',
      'V6',
      'V7',
      'V8',
      'V9',
      'V10',
      'G3',
      'M1',
    ]);
    for (const rule of CHECK_RULES) {
      expect(rule.geltung).toBe('allgemein');
      expect(rule.wirkung.pruefhinweis.text, rule.id).not.toBe('');
    }
  });

  it('findet jede Wortliste und Einheiten-Gruppe, die eine Regel nennt, mit Einträgen', () => {
    for (const rule of CHECK_RULES) {
      for (const block of [...blocksOf(rule.bedingung), ...(rule.bedingung.nicht ?? [])]) {
        if ('liste' in block) {
          expect(RULE_CONTEXT.listen?.get(block.liste)?.length, block.liste).toBeGreaterThan(0);
        }
        if ('einheit' in block) {
          const gruppe = RULE_CONTEXT.einheitGruppen?.get(block.einheit.gruppe);
          expect(gruppe?.length, block.einheit.gruppe).toBeGreaterThan(0);
        }
      }
    }
  });

  it('liest Parameter eingebauter Bausteine aus der Regel', () => {
    expect(builtinParameter('offene-stelle', 'punktreihe-mindestlaenge')).toBe(5);
    expect(builtinParameter('bewehrung', 'positionen-im-titel')).toBe(3);
    expect(builtinParameter('gibt-es-nicht', 'x')).toBeUndefined();
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
    expect(RULE_CONTEXT.listen?.get('risiko')).toHaveLength(rows.length);
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
