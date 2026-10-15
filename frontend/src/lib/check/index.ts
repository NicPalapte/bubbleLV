// Registry und Ausführung der Prüfregeln. Ein Modul je Regel, Registrierung wie
// bei den Rulesets der Klassifizierung — eine neue Regel kommt als Eintrag in
// `CHECK_RULES` dazu, ohne dass hier etwas anderes zu ändern wäre.
//
// Läuft **einmal beim Laden** (lib/pipeline/runPipeline.ts), also im Worker,
// sobald dessen Schwelle greift. Nie im Render: eine Regel sieht das ganze LV
// und wäre je Ansicht zu teuer (.claude/CLAUDE.md#kritische-constraints).

import { regelEintrag } from './referenz';
import { m1Bewehrung } from './rules/material';
import { g3Einheitenschreibweise } from './rules/treiber';
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
import type { LVNode } from '../../types/lvNode';

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
  g3Einheitenschreibweise,
  m1Bewehrung,
];

/** Warum eine Regel nicht läuft — in einem Satz, den der Owner versteht. */
function inactiveReason(rule: CheckRule): string | null {
  const eintrag = regelEintrag(rule.id);
  if (eintrag === undefined) {
    return `Kein Eintrag für ${rule.id} in docs/domain/reference/pruefregeln.csv.`;
  }
  if (eintrag.name === '' || eintrag.kategorie === null || eintrag.schwere === null) {
    return `Name, Kategorie oder Schwere für ${rule.id} fehlt in docs/domain/reference/pruefregeln.csv.`;
  }
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
 * `ruleSet` weicht nur in Tests vom ausgelieferten Katalog ab. Ohne `parents`
 * gilt das ganze LV als ein Abschnitt.
 */
export function runChecks(
  index: PositionIndex,
  summary: LVSummary,
  ruleSet: readonly CheckRule[] = CHECK_RULES,
  parents: ReadonlyMap<string, LVNode | null> = new Map(),
): CheckResult {
  const context: CheckContext = { index, summary, parents };
  const flags: Flag[] = [];
  const rules: RuleStatus[] = [];

  for (const rule of ruleSet) {
    const eintrag = regelEintrag(rule.id);
    // `aus` nimmt die Regel ganz aus der Prüfung — auch aus der Liste.
    if (eintrag?.status === 'aus') continue;
    let grund = inactiveReason(rule);
    let found: Flag[] = [];

    const category = eintrag?.kategorie ?? 'vob';
    const severity = eintrag?.schwere ?? 'hinweis';

    if (grund === null && rule.check !== undefined) {
      try {
        found = rule.check(context).map((fund): Flag => ({
          ...fund,
          id: rule.id,
          category,
          severity: fund.severity ?? severity,
        }));
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
      label: eintrag?.name || rule.id,
      category,
      severity,
      hint: eintrag?.hinweis ?? '',
      ruleRef: eintrag?.normVerweis ?? '',
      refConfirmed: eintrag?.status === 'bestaetigt',
      active,
      inactiveReason: grund,
      count: active ? found.length : 0,
    });
  }

  return { flags, rules };
}

export { EMPTY_HINTS, groupByRule, hintsByPosition } from './hints';
export type { HintIndex, PositionHints } from './hints';
export { EMPTY_CHECK_RESULT } from './types';
export type {
  CheckContext,
  CheckResult,
  CheckRule,
  Flag,
  FlagCategory,
  FlagSeverity,
  Fund,
  RuleStatus,
} from './types';
