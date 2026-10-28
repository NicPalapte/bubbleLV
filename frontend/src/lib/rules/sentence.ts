// Eine Regel als deutscher Satz, wie der Regeleditor sie über den Bausteinen zeigt
// (Entscheidung 0081). Nur Anzeige — ausgewertet wird im Kern.

import type { Rule, RuleBlock, RuleCondition, RuleField, RuleHighlight, RuleLinkSame } from '@core';

export const HIGHLIGHT_LABELS: Readonly<Record<RuleHighlight, string>> = {
  wichtig: 'Wichtig',
  material: 'Material',
  masse: 'Maße',
};

export const FIELD_LABELS: Readonly<Record<RuleField, string>> = {
  kurztext: 'Kurztext',
  langtext: 'Langtext',
};

const SAME_WORDS: Readonly<Record<RuleLinkSame, string>> = {
  abschnitt: 'im selben Abschnitt',
  einheit: 'mit gleicher Einheit',
};

function blockWords(block: RuleBlock): string {
  if ('begriff' in block) return `„${block.begriff.trim() || '…'}“`;
  if ('menge' in block)
    return block.menge.einheit ? `eine Menge in ${block.menge.einheit}` : 'eine Menge';
  return 'eine Norm';
}

function conditionWords(condition: RuleCondition): string {
  const blocks = condition.alle ?? condition.eines ?? [];
  const joined = blocks.map(blockWords).join(condition.alle ? ' und ' : ' oder ');
  const nicht = (condition.nicht ?? []).map(blockWords);
  const where = condition.wo.map((field) => FIELD_LABELS[field]).join(' oder ');
  const range =
    condition.bereich === 'satz'
      ? 'im selben Satz'
      : condition.bereich === 'feld'
        ? ''
        : `höchstens ${condition.bereich.zeichen} Zeichen auseinander`;
  const verb = condition.alle !== undefined && blocks.length > 1 ? ' stehen' : ' steht';
  const without = nicht.length > 0 ? ` und dort nicht ${nicht.join(' oder ')}` : '';
  return `im ${where} ${joined}${range === '' ? '' : ` ${range}`}${without}${verb}`;
}

/** Die Regel als ein Satz, so wie der Editor sie über den Bausteinen zeigt. */
export function ruleSentence(rule: Rule): string {
  const when = `Wenn ${conditionWords(rule.bedingung)}`;
  if ('hervorheben' in rule.wirkung) {
    return `${when}, dann als „${HIGHLIGHT_LABELS[rule.wirkung.hervorheben]}“ hervorheben.`;
  }
  const { ziel, gleich } = rule.wirkung.verknuepfen;
  const same = gleich.map((entry) => SAME_WORDS[entry]).join(' und ');
  const target = same === '' ? 'Positionen' : `Positionen ${same}`;
  return `${when}, dann Verbindung vorschlagen zu ${target}, in deren ${conditionWords(ziel)}.`;
}
