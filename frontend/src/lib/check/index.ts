// Prüfregeln: Grundstock-Regeln mit der Wirkung „Prüfhinweis“ (Entscheidung 0085,
// docs/domain/reference/regeln.json). Ausgewertet wird mit dem einen Auswerter des Kerns
// (`matchCondition`); nur eingebaute Bausteine, die das ganze LV brauchen, rechnet die App
// selbst (builtins.ts).
//
// Läuft **einmal beim Laden** (lib/pipeline/runPipeline.ts), also im Worker,
// sobald dessen Schwelle greift. Nie im Render: eine Regel sieht das ganze LV
// und wäre je Ansicht zu teuer (.claude/CLAUDE.md#kritische-constraints).

import {
  blocksOf,
  factHolds,
  matchCondition,
  type Rule,
  type RuleBlock,
  type RuleCheckHint,
  type RuleContext,
  type RuleHit,
  type RuleText,
} from '@core';
import { CHECK_BUILTINS, type CheckBuiltin } from './builtins';
import { GRUNDSTOCK, RULE_CONTEXT, ruleTextOf } from '../rules/rules';
import { listFileOf } from '../rules/wissen';
import type { CheckContext, CheckResult, Flag, Fund, RuleStatus } from './types';
import type { PositionIndex } from '../index/positionIndex';
import type { LVSummary } from '../index/summary';
import type { Span } from '../classify';
import type { LVNode, PositionSummary } from '../../types/lvNode';

/** Eine Prüfregel: Regel mit Prüfhinweis. */
export type CheckRule = Rule & { readonly wirkung: { readonly pruefhinweis: RuleCheckHint } };

const isCheckRule = (rule: Rule): rule is CheckRule => 'pruefhinweis' in rule.wirkung;

/** Die Prüfregeln des Grundstocks, in der Reihenfolge der Datei. */
export const CHECK_RULES: readonly CheckRule[] = GRUNDSTOCK.filter(isCheckRule);

/** „v1-bedarfsposition“ → „V1“; Regeln ohne solches Kürzel bleiben ohne. */
export function codeOf(id: string): string {
  return /^([a-z]\d+)(?:-|$)/i.exec(id)?.[1].toUpperCase() ?? '';
}

/** Warum eine Regel nicht laufen kann — in einem Satz, den der Owner versteht. */
function missingOf(
  rule: CheckRule,
  context: RuleContext,
  builtins: ReadonlyMap<string, CheckBuiltin>,
): string | null {
  for (const block of blocksOf(rule.bedingung)) {
    if ('eingebaut' in block) {
      const builtin = builtins.get(block.eingebaut);
      return builtin === undefined ? 'Noch nicht umgesetzt.' : (builtin.missing?.() ?? null);
    }
    if ('liste' in block && (context.listen?.get(block.liste)?.length ?? 0) === 0) {
      return `Wortliste „${block.liste}“ in ${listFileOf(block.liste)} enthält noch keine Einträge.`;
    }
    if (
      'einheit' in block &&
      (context.einheitGruppen?.get(block.einheit.gruppe)?.length ?? 0) === 0
    ) {
      return (
        `Einheiten-Gruppe „${block.einheit.gruppe}“ fehlt in ` +
        'docs/domain/reference/einheiten-gruppen.csv.'
      );
    }
  }
  return null;
}

const ART_LABELS: Readonly<Record<PositionSummary['positionType'], string>> = {
  NORMAL: 'Normalposition',
  BEDARF: 'Bedarfsposition',
  ALTERNATIV: 'Alternativposition',
  ZULAGENPOSITION: 'Zulagenposition',
};

/** Was an der Position stimmt, z. B. „keine Menge“ oder „Einheit h (Stunde)“. */
function factLabel(block: RuleBlock, position: PositionSummary): string | null {
  if ('einheit' in block) return `Einheit ${position.unit ?? ''} (${block.einheit.gruppe})`;
  if (!('feld' in block)) return null;
  if (block.feld === 'art') return ART_LABELS[position.positionType];
  if (block.feld === 'menge') {
    return block.ist === 'leer' ? 'keine Menge' : `Menge ${String(position.quantity)}`;
  }
  return block.ist === 'leer' ? 'keine Einheit' : `Einheit ${position.unit ?? ''}`;
}

/** Titel und Fundstelle eines Treffers: gefundene Wörter, dann stimmende Angaben. */
function fundOf(
  rule: CheckRule,
  hits: readonly RuleHit[],
  input: RuleText,
  position: PositionSummary,
  context: RuleContext,
): Fund {
  const parts: string[] = [];
  const seen = new Set<string>();
  const add = (part: string): void => {
    const key = part.toLowerCase();
    if (part === '' || seen.has(key)) return;
    seen.add(key);
    parts.push(part);
  };
  let span: Span | undefined;
  for (const hit of hits) {
    if (hit.feld === 'position') continue;
    const text = hit.feld === 'kurztext' ? input.kurztext : input.langtext;
    for (const mark of hit.marks) {
      const label = text.slice(mark.start, mark.end).replace(/\s+/g, ' ');
      add(label);
      if (span === undefined && hit.feld === 'langtext') {
        span = { key: rule.id, start: mark.start, end: mark.end, label };
      }
    }
  }
  if (hits.some((hit) => hit.feld === 'position')) {
    for (const block of blocksOf(rule.bedingung)) {
      if (!factHolds(block, input.angaben, context)) continue;
      add(factLabel(block, position) ?? '');
    }
  }
  return { title: parts.join(', '), span };
}

/** Funde einer Regel je Position (Slot), ohne Regel-ID, Kategorie und Schwere. */
function findAll(
  rule: CheckRule,
  check: CheckContext,
  texts: readonly RuleText[],
  context: RuleContext,
  builtins: ReadonlyMap<string, CheckBuiltin>,
): Array<Fund & { slot: number }> {
  const { index } = check;
  const out: Array<Fund & { slot: number }> = [];
  const [first] = blocksOf(rule.bedingung);
  if (first !== undefined && 'eingebaut' in first) {
    const builtin = builtins.get(first.eingebaut);
    if (builtin === undefined) return out;
    const fundeOf = builtin.prepare(check, first.parameter ?? {});
    for (let slot = 0; slot < index.size; slot++) {
      for (const fund of fundeOf(slot)) out.push({ ...fund, slot });
    }
    return out;
  }
  for (let slot = 0; slot < index.size; slot++) {
    const hits = matchCondition(rule.bedingung, texts[slot], context);
    if (hits.length === 0) continue;
    out.push({ ...fundOf(rule, hits, texts[slot], index.positions[slot], context), slot });
  }
  return out;
}

/**
 * Alle Prüfregeln über einem geladenen LV auswerten.
 *
 * Reine Funktion: gleiche Eingabe, gleiches Ergebnis. Wirft nie — eine Regel,
 * die stolpert, darf den Import nicht anhalten; sie erscheint dann als inaktiv
 * mit der Fehlermeldung als Grund (Test: tests/check/rules.test.ts).
 *
 * Nur freigegebene Regeln laufen; `aus` und Entwürfe fehlen auch in der Liste. `rules`,
 * `context` und `builtins` weichen nur in Tests ab. Ohne `parents` gilt das ganze LV
 * als ein Abschnitt.
 */
export function runChecks(
  index: PositionIndex,
  summary: LVSummary,
  rules: readonly CheckRule[] = CHECK_RULES,
  parents: ReadonlyMap<string, LVNode | null> = new Map(),
  context: RuleContext = RULE_CONTEXT,
  builtins: ReadonlyMap<string, CheckBuiltin> = CHECK_BUILTINS,
): CheckResult {
  const check: CheckContext = { index, summary, parents };
  const flags: Flag[] = [];
  const statuses: RuleStatus[] = [];
  let texts: RuleText[] | null = null;

  for (const rule of rules) {
    if (rule.status !== 'freigegeben') continue;
    const hint = rule.wirkung.pruefhinweis;
    let grund: string | null = null;
    let found: Flag[] = [];

    try {
      // Auch die Vorprüfung liest Tabellen (z. B. Materialkatalog) und darf nicht werfen.
      grund = missingOf(rule, context, builtins);
      if (grund === null) {
        texts ??= index.positions.map(ruleTextOf);
        found = findAll(rule, check, texts, context, builtins).map(({ slot, ...fund }): Flag => ({
          ...fund,
          id: rule.id,
          category: hint.kategorie,
          severity: hint.schwere,
          positionId: index.nodes[slot].id,
        }));
      }
    } catch (error) {
      // Eine stolpernde Regel darf den Import nicht anhalten.
      grund = `Regel abgebrochen: ${error instanceof Error ? error.message : 'unbekannt'}`;
      found = [];
    }

    const active = grund === null;
    if (active) flags.push(...found);

    statuses.push({
      id: rule.id,
      code: codeOf(rule.id),
      label: rule.name,
      category: hint.kategorie,
      severity: hint.schwere,
      hint: hint.text,
      ruleRef: hint.norm?.verweis ?? '',
      refConfirmed: hint.norm?.stand === 'bestaetigt',
      active,
      inactiveReason: grund,
      count: active ? found.length : 0,
    });
  }

  return { flags, rules: statuses };
}

export { CHECK_BUILTINS, checkBewehrung } from './builtins';
export type { CheckBuiltin } from './builtins';
export { EMPTY_HINTS, groupByRule, hintsByPosition } from './hints';
export type { HintIndex, PositionHints } from './hints';
export { EMPTY_CHECK_RESULT } from './types';
export type {
  CheckContext,
  CheckResult,
  Flag,
  FlagCategory,
  FlagSeverity,
  Fund,
  RuleStatus,
} from './types';
