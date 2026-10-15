// Kennzahl aus der Datei ohne Norm-Bezug: wo schreibt dieselbe Datei eine
// Einheit verschieden. Name und Hinweis stehen in
// docs/domain/reference/pruefregeln.csv.
//
// Ranglisten der teuersten und mengenstärksten Positionen (früher G1, G2) sind
// keine Prüfregel mehr: eine Rangliste ist keine Auffälligkeit. Die Auswertung
// im Überblick zeigt sie weiter, ohne sie zu bewerten.

import { canonicalUnit, unitSpelling } from '../../units';
import type { CheckContext, CheckRule, Fund } from '../types';

// ── G3 · Dieselbe Einheit, mehrere Schreibweisen ────────────────────────────

export const g3Einheitenschreibweise: CheckRule = {
  id: 'G3',
  check(context: CheckContext): Fund[] {
    // Je Vergleichsschlüssel sammeln, welche Schreibweisen tatsächlich vorkommen.
    const schreibweisen = new Map<string, Set<string>>();
    for (const position of context.index.positions) {
      const key = canonicalUnit(position.unit);
      const spelling = unitSpelling(position.unit);
      if (key === null || spelling === null) continue;
      const seen = schreibweisen.get(key) ?? new Set<string>();
      seen.add(position.unit ?? spelling);
      schreibweisen.set(key, seen);
    }

    const uneinheitlich = new Map<string, string[]>();
    for (const [key, seen] of schreibweisen) {
      if (seen.size > 1)
        uneinheitlich.set(
          key,
          [...seen].sort((a, b) => a.localeCompare(b, 'de')),
        );
    }
    if (uneinheitlich.size === 0) return [];

    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const key = canonicalUnit(context.index.positions[i].unit);
      const varianten = key === null ? undefined : uneinheitlich.get(key);
      if (varianten === undefined) continue;
      funde.push({
        positionId: context.index.nodes[i].id,
        title: `„${context.index.positions[i].unit}" — im LV auch als ${varianten
          .filter((variante) => variante !== context.index.positions[i].unit)
          .map((variante) => `„${variante}"`)
          .join(', ')}`,
      });
    }
    return funde;
  },
};
