// Geld- und Mengentreiber (WP-K, Schritt 4). Keine VOB-Regeln, sondern
// Kennzahlen aus der Datei: welche Positionen tragen das Geld, welche die Menge,
// und wo schreibt dieselbe Datei eine Einheit verschieden.
//
// Bewusst **Rang statt Schwellwert**: „gehört zu den 10 teuersten" ist eine
// Tatsache über die Datei. „Anteil über 5 %" wäre eine Grenze, die sich niemand
// überlegt hat. Der Anteil steht trotzdem dabei — als Zahl, nicht als Urteil.
//
// Der EP-Ausreißer fehlt hier: er braucht eine Vergleichsgruppe und kommt
// deshalb erst mit WP-M (docs/implementation-plan.md#wp-m--beziehungen).

import { canonicalUnit, unitSpelling } from '../../units';
import type { CheckContext, CheckRule, Flag } from '../types';

/** So viele Positionen führen die jeweilige Rangliste an. */
const TOP = 10;

/**
 * Die `TOP` größten Werte einer Spalte, absteigend; `NaN` und 0 zählen nicht.
 *
 * Gibt es nicht mehr Kandidaten als Plätze, bleibt die Liste leer: „Rang 3 von
 * 4" ist keine Erkenntnis, sondern Rauschen. Eine Rangliste sagt erst etwas aus,
 * wenn sie auch jemanden auslässt.
 */
function topIndices(column: Float64Array, keep: (i: number) => boolean): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < column.length; i++) {
    if (Number.isFinite(column[i]) && column[i] > 0 && keep(i)) candidates.push(i);
  }
  if (candidates.length <= TOP) return [];
  candidates.sort((a, b) => column[b] - column[a]);
  return candidates.slice(0, TOP);
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return '—';
  const share = (part / whole) * 100;
  return share >= 1 ? `${Math.round(share)} %` : `${share.toFixed(1)} %`;
}

// ── G1 · Kostentreiber ──────────────────────────────────────────────────────

export const g1Kostentreiber: CheckRule = {
  id: 'G1',
  label: 'Kostentreiber',
  category: 'geld',
  severity: 'hinweis',
  hint: 'Die Positionen mit dem größten Anteil an der Gesamtsumme. Hier entscheidet sich das Angebot.',
  check(context: CheckContext): Flag[] {
    const gesamt = context.summary.totalPrice;
    if (gesamt <= 0) return [];
    return topIndices(context.index.totalPrice, () => true).map((i, rang): Flag => ({
      id: 'G1',
      category: 'geld',
      severity: 'hinweis',
      positionId: context.index.nodes[i].id,
      title: `Rang ${rang + 1} · ${percent(context.index.totalPrice[i], gesamt)} der Gesamtsumme`,
    }));
  },
};

// ── G2 · Mengentreiber ──────────────────────────────────────────────────────

export const g2Mengentreiber: CheckRule = {
  id: 'G2',
  label: 'Mengentreiber',
  category: 'menge',
  severity: 'hinweis',
  hint: 'Die mengenstärksten Positionen je Einheit. Verglichen wird nur innerhalb derselben Einheit — m³ gegen Stück zu stellen, ergäbe nichts.',
  check(context: CheckContext): Flag[] {
    // Je Einheit eine eigene Rangliste: eine Menge von 5.000 m³ und eine von
    // 5.000 Stück sind nicht vergleichbar.
    const einheiten = new Set<string>();
    for (const position of context.index.positions) {
      const einheit = canonicalUnit(position.unit);
      if (einheit !== null) einheiten.add(einheit);
    }

    const flags: Flag[] = [];
    for (const einheit of einheiten) {
      const ranked = topIndices(
        context.index.quantity,
        (i) => canonicalUnit(context.index.positions[i].unit) === einheit,
      );
      ranked.forEach((i, rang) => {
        flags.push({
          id: 'G2',
          category: 'menge',
          severity: 'hinweis',
          positionId: context.index.nodes[i].id,
          title: `Rang ${rang + 1} der Mengen in ${context.index.positions[i].unit ?? einheit}`,
        });
      });
    }
    return flags;
  },
};

// ── G3 · Dieselbe Einheit, mehrere Schreibweisen ────────────────────────────

export const g3Einheitenschreibweise: CheckRule = {
  id: 'G3',
  label: 'Einheit uneinheitlich geschrieben',
  category: 'menge',
  severity: 'hinweis',
  hint: 'Dieselbe Einheit steht in der Datei in mehreren Schreibweisen — meist ein Zeichen für zusammengeführte Teil-LVs.',
  check(context: CheckContext): Flag[] {
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

    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const key = canonicalUnit(context.index.positions[i].unit);
      const varianten = key === null ? undefined : uneinheitlich.get(key);
      if (varianten === undefined) continue;
      flags.push({
        id: 'G3',
        category: 'menge',
        severity: 'hinweis',
        positionId: context.index.nodes[i].id,
        title: `„${context.index.positions[i].unit}" — im LV auch als ${varianten
          .filter((variante) => variante !== context.index.positions[i].unit)
          .map((variante) => `„${variante}"`)
          .join(', ')}`,
      });
    }
    return flags;
  },
};
