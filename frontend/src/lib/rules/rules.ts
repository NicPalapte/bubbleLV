// Regeln in der App (Entscheidung 0081): Grundstock aus dem Repo, eigene Regeln aus dem
// Browser, beide im Format `bubble-rule-v1` des Kerns. Hier steht nur, was die App
// drumherum braucht — Auswerten tut allein der Kern (`matchCondition`, `suggestLinks`).

import grundstockJson from '@reference/regeln.json?raw';
import {
  blockKindOf,
  blocksOf,
  matchCondition,
  parseRuleFile,
  positionLinkOf,
  ruleIdOf,
  RULE_SCHEMA,
  type LinkCandidate,
  type RulePositionKind,
  type Rule,
  type RuleBlock,
  type RuleCondition,
  type RuleContext,
  type RuleParam,
  type RuleText,
  type TextRange,
} from '@core';
import { attrSpans } from '../attributes';
import { WISSEN } from './wissen';
import type { Span } from '../classify';
import type { LVNode, PositionSummary } from '../../types/lvNode';

function readGrundstock(raw: string): Rule[] {
  try {
    // Nur `allgemein` gehört in den Grundstock, egal was in der Datei steht.
    return parseRuleFile(JSON.parse(raw)).map((rule) => ({ ...rule, geltung: 'allgemein' }));
  } catch {
    return [];
  }
}

/** Grundstock für alle Firmen: docs/domain/reference/regeln.json, einmal beim Laden gelesen. */
export const GRUNDSTOCK: readonly Rule[] = readGrundstock(grundstockJson);

/**
 * Inhalte für die Bausteine aus 0085: Wortlisten und Einheiten-Gruppen aus den CSV. Alle
 * Auswertungen der App nutzen diesen einen Kontext, damit die Regeln überall gleich wirken.
 */
export const RULE_CONTEXT: RuleContext = WISSEN;

/**
 * Parameter eines eingebauten Bausteins aus dem Grundstock, z. B. die Mindestlänge einer
 * Punktreihe für `offene-stelle`. `undefined`, wenn keine Regel ihn setzt.
 */
export function builtinParameter(name: string, key: string): RuleParam | undefined {
  for (const rule of GRUNDSTOCK) {
    const [block] = blocksOf(rule.bedingung);
    if (block !== undefined && 'eingebaut' in block && block.eingebaut === name) {
      return block.parameter?.[key];
    }
  }
  return undefined;
}

/**
 * Regel wirkt im LV: freigegeben. `aus` und Entwürfe älterer Versionen zeigen nur der Editor
 * und seine Vorschau; der Editor kennt seit 0089 nur noch an/aus.
 */
export const isActive = (rule: Rule): boolean => rule.status === 'freigegeben';

/** Texte einer Position für den Auswerter; Normen kommen vom Extraktor der App. */
export function ruleTextOf(position: PositionSummary): RuleText {
  const normen: TextRange[] = attrSpans(position.attributes)
    .filter((span) => span.key === 'normen')
    .map(({ start, end }) => ({ start, end }));
  return {
    kurztext: position.shortText,
    langtext: position.longText,
    normen: { langtext: normen },
    angaben: {
      menge: position.quantity,
      einheit: position.unit,
      art: KIND_OF[position.positionType],
    },
  };
}

const KIND_OF: Readonly<Record<PositionSummary['positionType'], RulePositionKind>> = {
  NORMAL: 'normal',
  ALTERNATIV: 'alternativ',
  BEDARF: 'bedarf',
  ZULAGENPOSITION: 'zulage',
};

/** Gruppe in der Liste des Regeleditors: nach Wirkung (Entscheidung 0089). */
export type RuleGroup = 'hervorheben' | 'pruefhinweis' | 'verknuepfen' | 'pdf';

export const RULE_GROUP_LABELS: Readonly<Record<RuleGroup, string>> = {
  hervorheben: 'Hervorheben',
  pruefhinweis: 'Prüfhinweise',
  verknuepfen: 'Verbindungen',
  pdf: 'PDF-Vorschläge',
};

export function ruleGroupOf(rule: Rule): RuleGroup {
  if ('hervorheben' in rule.wirkung) return 'hervorheben';
  if ('pruefhinweis' in rule.wirkung) return 'pruefhinweis';
  return positionLinkOf(rule.wirkung) === null ? 'pdf' : 'verknuepfen';
}

/**
 * Eigene Kopie einer Grundstock-Regel (Entscheidung 0089): gleiche Bedingung und Wirkung,
 * neue Kennung, gleich an. Das Original schaltet der Aufrufer ab, damit die Kopie es ersetzt.
 */
export function copyOf(source: Rule, taken: ReadonlySet<string>): Rule {
  const name = `${source.name} (eigene)`;
  return {
    ...source,
    id: ruleIdOf(name, taken),
    version: 1,
    name,
    geltung: 'unternehmen',
    status: 'freigegeben',
    herkunft: 'nutzer',
  };
}

/** Kandidaten fürs Verknüpfen; Abschnitt = Elternknoten der Position. */
export function linkCandidatesOf(
  nodes: readonly LVNode[],
  parents: ReadonlyMap<string, LVNode | null>,
): LinkCandidate[] {
  const out: LinkCandidate[] = [];
  for (const node of nodes) {
    if (node.position === null) continue;
    out.push({
      id: node.id,
      text: ruleTextOf(node.position),
      abschnitt: parents.get(node.id)?.id ?? null,
      einheit: node.position.unit,
    });
  }
  return out;
}

const overlaps = (a: TextRange, b: TextRange): boolean => a.start < b.end && b.start < a.end;

/**
 * Fundstellen aktiver Hervorhebungsregeln im Langtext, dazu `spans` (Erkennung der
 * Klassifizierung). `aus`-Regeln nehmen jede Fundstelle weg, die sie berühren. Sonst
 * haben `spans` Vorrang, dann längere Treffer: „Sichtbetonklasse SB2" vor „SB2" —
 * so wie früher die gelernten Begriffe (Entscheidung 0088).
 */
export function applyRules(
  position: PositionSummary,
  spans: readonly Span[],
  rules: readonly Rule[],
  context: RuleContext = RULE_CONTEXT,
): Span[] {
  const input = ruleTextOf(position);
  const blocked: TextRange[] = [];
  const marks: Span[] = [];
  for (const rule of rules) {
    if (!isActive(rule) || !('hervorheben' in rule.wirkung)) continue;
    if (!rule.bedingung.wo.includes('langtext')) continue;
    const key = rule.wirkung.hervorheben;
    const condition: RuleCondition = { ...rule.bedingung, wo: ['langtext'] };
    for (const hit of matchCondition(condition, input, context)) {
      for (const mark of hit.marks) {
        if (mark.end <= mark.start) continue;
        if (key === 'aus') blocked.push(mark);
        else marks.push({ key, start: mark.start, end: mark.end, label: rule.name });
      }
    }
  }
  const out = spans.filter((span) => !blocked.some((range) => overlaps(span, range)));
  // Stabil sortiert: bei gleicher Länge zählt die Reihenfolge der Regeln.
  marks.sort((a, b) => b.end - b.start - (a.end - a.start));
  for (const mark of marks) {
    if (blocked.some((range) => overlaps(mark, range))) continue;
    if (out.some((span) => overlaps(span, mark))) continue;
    out.push(mark);
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Leere eigene Regel, aus bis man sie anschaltet; `blocks` z. B. aus einer Markierung. */
export function newRule(
  taken: ReadonlySet<string>,
  blocks: readonly RuleBlock[] = [{ begriff: '' }],
  name = 'Neue Regel',
): Rule {
  return {
    schema: RULE_SCHEMA,
    id: ruleIdOf(name, taken),
    version: 1,
    name,
    bedingung: { alle: blocks, bereich: 'satz', wo: ['langtext'] },
    wirkung: { hervorheben: 'wichtig' },
    geltung: 'unternehmen',
    status: 'aus',
    herkunft: 'nutzer',
  };
}

const BLOCK_NAMES: Readonly<Record<ReturnType<typeof blockKindOf>, string>> = {
  begriff: 'Begriff',
  menge: 'Menge',
  norm: 'Norm',
  liste: 'Wortliste',
  einheit: 'Einheit',
  feld: 'Angabe',
  eingebaut: 'Eingebaut',
};

/** Name aus den Bausteinen, z. B. „Nachtrag + ausgeschlossen“. */
export function nameOf(blocks: readonly RuleBlock[]): string {
  const parts = blocks.map((block) =>
    'begriff' in block ? block.begriff : BLOCK_NAMES[blockKindOf(block)],
  );
  return parts.filter((part) => part.trim() !== '').join(' + ') || 'Neue Regel';
}
