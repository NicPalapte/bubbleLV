// Lokaler Export der Prüf-Hinweise als Markdown (WP-P, Schritt 3).
//
// **Hinweise, keine Urteile** (.claude/CLAUDE.md): jede Regel nennt ihren
// Norm-Verweis, und ein Verweis, den der Owner noch nicht bestätigt hat, steht
// ausdrücklich als „zu bestätigen" da — auch im Export. Wer den Text
// weiterreicht, soll denselben Vorbehalt lesen wie in der Ansicht.
//
// Abgeschaltete Regeln kommen nicht vor: sie sind in allen Ansichten
// unsichtbar, und ein Export, der mehr zeigt als die Ansicht, wäre eine Falle.

import type { CheckResult, Flag, RuleStatus } from '../check/types';
import type { LVNode } from '../../types/lvNode';

export interface CheckReportInput {
  check: CheckResult;
  /** Knoten je ID — für OZ und Kurztext der Fundstelle. */
  nodes: ReadonlyMap<string, LVNode>;
  /** Abgeschaltete Regeln (filterState.mutedRules). */
  muted: ReadonlySet<string>;
  /** Fundstellen, die der aktive Filter durchlässt; `null` = kein Filter. */
  visible: ReadonlySet<string> | null;
  fileName: string;
  projectName: string | null;
}

function zeileZuFund(flag: Flag, nodes: ReadonlyMap<string, LVNode>): string {
  const node = nodes.get(flag.positionId) ?? null;
  const position = node?.position ?? null;
  const oz = position?.oz ?? flag.positionId;
  const text = position?.shortText ?? '';
  const stelle = flag.span === undefined ? '' : ` — Fundstelle: „${flag.span.label}"`;
  return `- **${oz}** ${text} · ${flag.title}${stelle}`;
}

function kopfZurRegel(rule: RuleStatus): string {
  const verweis =
    rule.ruleRef === ''
      ? ''
      : rule.refConfirmed
        ? ` · ${rule.ruleRef}`
        : ` · ${rule.ruleRef} (Norm-Verweis noch zu bestätigen)`;
  return `### ${rule.id} · ${rule.label}${verweis}`;
}

export function checkMarkdown({
  check,
  nodes,
  muted,
  visible,
  fileName,
  projectName,
}: CheckReportInput): string {
  const zeilen: string[] = [
    `# Prüf-Hinweise — ${projectName ?? fileName}`,
    '',
    `Datei: ${fileName}`,
    '',
    'Die folgenden Punkte sind **Hinweise, keine Urteile**: sie zeigen, wo ein Blick',
    'lohnt, und nennen die Regel, aus der sie stammen. Sie ersetzen keine Prüfung',
    'durch einen Menschen und sind kein Rechtsrat.',
    '',
  ];

  let gefunden = 0;
  for (const rule of check.rules) {
    if (muted.has(rule.id)) continue;
    const funde = check.flags.filter(
      (flag) => flag.id === rule.id && (visible === null || visible.has(flag.positionId)),
    );
    if (funde.length === 0) continue;
    gefunden += funde.length;
    zeilen.push(kopfZurRegel(rule), '', rule.hint, '');
    for (const flag of funde) zeilen.push(zeileZuFund(flag, nodes));
    zeilen.push('');
  }

  if (gefunden === 0) {
    zeilen.push('Keine Hinweise im aktuellen Filter.', '');
  } else {
    // Die Zahl steht am Ende: erst der Inhalt, dann die Bilanz.
    zeilen.push(`_${gefunden} ${gefunden === 1 ? 'Hinweis' : 'Hinweise'} insgesamt._`, '');
  }
  return zeilen.join('\n');
}
