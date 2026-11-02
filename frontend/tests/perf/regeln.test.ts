// Performance-Schranke für Regeln (Entscheidung 0081) bei 10.000 Positionen. Die
// Vorschläge aktiver Verbindungsregeln laufen beim ersten Öffnen einer Positionskarte
// auf dem UI-Thread, die Treffer-Vorschau bei jeder Änderung einer Regel im Editor.
// Beides muss im Ziel „Fenster öffnen < 200 ms" (docs/scope.md) bleiben; sonst gehört
// die Rechnung in den Worker. Eigene Prüfregeln (Entscheidung 0089) laufen nach dem Laden
// auf dem UI-Thread — nur sie, der Grundstock kommt aus dem Worker.

import { describe, expect, it } from 'vitest';
import { matchCondition, type Rule } from '@core';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { linkSuggestionsOf } from '../../src/lib/rules/linkSuggestions';
import { runChecks } from '../../src/lib/check';
import { summarize } from '../../src/lib/index/summary';
import { newRule, ruleTextOf } from '../../src/lib/rules/rules';
import { buildTree, indexParents } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';

const POSITIONS = 10_000;
/** Zielwert „Fenster öffnen < 200 ms" aus docs/scope.md. */
const WINDOW_BUDGET_MS = 200;
const RUNS = 5;

const tree = buildTree(syntheticDraft(POSITIONS));
const index = buildPositionIndex(tree);
const parents = indexParents(tree);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeMedian(run: () => unknown): number {
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  return median(samples);
}

const base = newRule(new Set(), [{ begriff: 'Wand' }], 'Wand zu Decke');

describe(`Regeln bei ${POSITIONS} Positionen`, () => {
  it('Vorschläge einer Verbindungsregel ohne Zwischenspeicher', () => {
    expect(index.size).toBe(POSITIONS);
    const ms = timeMedian(() => {
      // Jedes Mal eine neue Regel: der Zwischenspeicher greift nicht, gemessen wird der erste Lauf.
      const rule: Rule = {
        ...base,
        status: 'freigegeben',
        bedingung: { alle: [{ begriff: 'Wand' }], bereich: 'feld', wo: ['kurztext'] },
        wirkung: {
          verknuepfen: {
            ziel: { alle: [{ begriff: 'Decke' }], bereich: 'feld', wo: ['kurztext'] },
            gleich: ['abschnitt'],
          },
        },
      };
      expect(linkSuggestionsOf(index, parents, [rule]).byId.size).toBeGreaterThan(0);
    });
    expect(ms).toBeLessThan(WINDOW_BUDGET_MS);
  });

  it('Treffer-Vorschau einer Regel im Langtext', () => {
    const condition = {
      alle: [{ begriff: 'Herstellen' }, { begriff: 'Nebenleistungen' }],
      bereich: 'satz' as const,
      wo: ['langtext' as const],
    };
    const ms = timeMedian(() => {
      let hits = 0;
      for (const node of index.nodes) {
        if (node.position !== null && matchCondition(condition, ruleTextOf(node.position)).length)
          hits++;
      }
      expect(hits).toBe(POSITIONS);
    });
    expect(ms).toBeLessThan(WINDOW_BUDGET_MS);
  });

  it('Prüfung eigener Prüfregeln nach dem Laden', () => {
    const summary = summarize(index);
    const own = {
      ...base,
      status: 'freigegeben' as const,
      bedingung: {
        alle: [{ begriff: 'Herstellen' }, { feld: 'menge' as const, ist: 'leer' as const }],
        bereich: 'feld' as const,
        wo: ['langtext' as const],
      },
      wirkung: {
        pruefhinweis: { kategorie: 'risiko' as const, schwere: 'hinweis' as const, text: 'x' },
      },
    };
    const ms = timeMedian(() => runChecks(index, summary, [own, own, own], parents));
    expect(ms).toBeLessThan(WINDOW_BUDGET_MS);
  });
});
