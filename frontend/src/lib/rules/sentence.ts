// Eine Regel als deutscher Satz, wie der Regeleditor sie über den Bausteinen zeigt
// (Entscheidung 0081). Nur Anzeige — ausgewertet wird im Kern.

import {
  positionLinkOf,
  type Rule,
  type RuleBlock,
  type RuleCondition,
  type RuleField,
  type RuleHighlight,
  type RuleHintCategory,
  type RuleLinkSame,
} from '@core';

export const HIGHLIGHT_LABELS: Readonly<Record<RuleHighlight, string>> = {
  wichtig: 'Wichtig',
  material: 'Material',
  masse: 'Maße',
};

export const FIELD_LABELS: Readonly<Record<RuleField, string>> = {
  kurztext: 'Kurztext',
  langtext: 'Langtext',
  pdf: 'PDF',
};

export const HINT_LABELS: Readonly<Record<RuleHintCategory, string>> = {
  geld: 'Geld',
  menge: 'Menge',
  risiko: 'Risiko',
  norm: 'Norm',
  frist: 'Frist',
  vob: 'VOB',
};

const FACT_WORDS = { menge: 'die Menge', einheit: 'die Einheit', art: 'die Art' } as const;

const SAME_WORDS: Readonly<Record<RuleLinkSame, string>> = {
  abschnitt: 'im selben Abschnitt',
  einheit: 'mit gleicher Einheit',
};

function blockWords(block: RuleBlock): string {
  if ('begriff' in block) return `„${block.begriff.trim() || '…'}“`;
  if ('menge' in block)
    return block.menge.einheit ? `eine Menge in ${block.menge.einheit}` : 'eine Menge';
  if ('norm' in block) return 'eine Norm';
  if ('liste' in block) return `ein Wort aus der Liste „${block.liste}“`;
  if ('einheit' in block) return `die Einheit in der Gruppe „${block.einheit.gruppe}“`;
  if ('feld' in block) {
    const what = FACT_WORDS[block.feld];
    return block.ist === 'leer' ? `${what} leer` : `${what} ${block.ist.join(' oder ')}`;
  }
  return `die eingebaute Prüfung „${block.eingebaut}“`;
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
  if ('pruefhinweis' in rule.wirkung) {
    const hint = rule.wirkung.pruefhinweis;
    return `${when}, dann Prüfhinweis „${HINT_LABELS[hint.kategorie]}“: ${hint.text}`;
  }
  const link = positionLinkOf(rule.wirkung);
  if (link === null)
    return `${when}, dann die Stelle zum Verknüpfen mit einer Position vorschlagen.`;
  const { ziel, gleich } = link;
  const same = gleich.map((entry) => SAME_WORDS[entry]).join(' und ');
  const target = same === '' ? 'Positionen' : `Positionen ${same}`;
  return `${when}, dann Verbindung vorschlagen zu ${target}, in deren ${conditionWords(ziel)}.`;
}
