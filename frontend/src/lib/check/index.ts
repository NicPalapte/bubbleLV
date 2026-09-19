// Registry und Ausführung der Prüfregeln. Ein Modul je Regel, Registrierung wie
// bei den Rulesets der Klassifizierung — eine neue Regel kommt als Eintrag in
// `CHECK_RULES` dazu, ohne dass hier etwas anderes zu ändern wäre.
//
// Läuft **einmal beim Laden** (lib/pipeline/runPipeline.ts), also im Worker,
// sobald dessen Schwelle greift. Nie im Render: eine Regel sieht das ganze LV
// und wäre je Ansicht zu teuer (.claude/CLAUDE.md#kritische-constraints).

import { regelEintrag } from './referenz';
import { g4Preisausreisser } from './rules/ausreisser';
import { g1Kostentreiber, g2Mengentreiber, g3Einheitenschreibweise } from './rules/treiber';
import {
  v10Homogenbereiche,
  v1Bedarfsposition,
  v2Stundenlohn,
  v3Produktname,
  v4Risikoformulierung,
  v5MengeFehlt,
  v6VerweisStattAngabe,
  v7Platzhalter,
  v8Nebenleistung,
  v9BesondereLeistung,
} from './rules/vob';
import type { CheckContext, CheckResult, CheckRule, Flag, RuleStatus } from './types';
import type { PositionIndex } from '../index/positionIndex';
import type { LVSummary } from '../index/summary';
import type { RelationResult } from '../relate';
import { EMPTY_RELATIONS } from '../relate';

export const CHECK_RULES: readonly CheckRule[] = [
  v1Bedarfsposition,
  v2Stundenlohn,
  v3Produktname,
  v4Risikoformulierung,
  v5MengeFehlt,
  v6VerweisStattAngabe,
  v7Platzhalter,
  v8Nebenleistung,
  v9BesondereLeistung,
  v10Homogenbereiche,
  g1Kostentreiber,
  g2Mengentreiber,
  g3Einheitenschreibweise,
  g4Preisausreisser,
];

/** Warum eine Regel nicht läuft — in einem Satz, den der Owner versteht. */
function inactiveReason(rule: CheckRule): string | null {
  const eintrag = regelEintrag(rule.id);
  if (eintrag === undefined) {
    return `Kein Eintrag für ${rule.id} in docs/domain/reference/pruefregeln.csv.`;
  }
  if (eintrag.status === 'aus') return 'In der Referenzdatei abgeschaltet.';
  if (rule.requires !== undefined && !rule.requires.available()) {
    return `Referenzdatei ${rule.requires.file} enthält noch keine Einträge.`;
  }
  if (rule.check === undefined) return 'Noch nicht umgesetzt.';
  return null;
}

/**
 * Alle Regeln über einem geladenen LV auswerten.
 *
 * Reine Funktion: gleiche Eingabe, gleiches Ergebnis. Wirft nie — eine Regel,
 * die stolpert, darf den Import nicht anhalten; sie erscheint dann als inaktiv
 * mit der Fehlermeldung als Grund (Test: tests/check/rules.test.ts).
 *
 * `ruleSet` weicht nur in Tests vom ausgelieferten Katalog ab.
 */
export function runChecks(
  index: PositionIndex,
  summary: LVSummary,
  relations: RelationResult = EMPTY_RELATIONS,
  ruleSet: readonly CheckRule[] = CHECK_RULES,
): CheckResult {
  const context: CheckContext = { index, summary, relations };
  const flags: Flag[] = [];
  const rules: RuleStatus[] = [];

  for (const rule of ruleSet) {
    const eintrag = regelEintrag(rule.id);
    let grund = inactiveReason(rule);
    let found: Flag[] = [];

    if (grund === null && rule.check !== undefined) {
      try {
        found = rule.check(context);
      } catch (error) {
        // Eine stolpernde Regel darf den Import nicht anhalten.
        grund = `Regel abgebrochen: ${error instanceof Error ? error.message : 'unbekannt'}`;
        found = [];
      }
    }

    const active = grund === null;
    if (active) flags.push(...found);

    rules.push({
      id: rule.id,
      label: rule.label,
      category: rule.category,
      severity: rule.severity,
      hint: rule.hint,
      ruleRef: eintrag?.normVerweis ?? '',
      refConfirmed: eintrag?.status === 'bestaetigt',
      active,
      inactiveReason: grund,
      count: active ? found.length : 0,
    });
  }

  return { flags, rules };
}

export { EMPTY_CHECK_RESULT } from './types';
export type {
  CheckContext,
  CheckResult,
  CheckRule,
  Flag,
  FlagCategory,
  FlagSeverity,
  RuleStatus,
} from './types';
