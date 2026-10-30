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
  RULE_FIELDS,
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

/** Regel wirkt im LV: freigegeben. Entwürfe zeigen nur der Editor und seine Vorschau. */
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

const EDITABLE_BLOCKS = new Set(['begriff', 'menge', 'norm']);

/**
 * Kann der Editor die Regel bearbeiten? Nur Bausteine Begriff/Menge/Norm, nur Kurz- und
 * Langtext, Wirkung hervorheben oder Positionen verbinden. Alles andere (Entscheidung 0085)
 * zeigt er nur an, bis der Editor es kennt.
 */
export function isEditable(rule: Rule): boolean {
  const conditions = [rule.bedingung];
  const link = positionLinkOf(rule.wirkung);
  if (link !== null) conditions.push(link.ziel);
  else if (!('hervorheben' in rule.wirkung)) return false;
  return conditions.every(
    (condition) =>
      [...blocksOf(condition), ...(condition.nicht ?? [])].every((block) =>
        EDITABLE_BLOCKS.has(blockKindOf(block)),
      ) && condition.wo.every((field) => RULE_FIELDS.some((own) => own === field)),
  );
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

/**
 * Fundstellen aktiver Hervorhebungsregeln im Langtext, ohne Überschneidung mit
 * `spans` (Klassifizierung und gelernte Begriffe haben Vorrang).
 */
export function applyRules(
  position: PositionSummary,
  spans: readonly Span[],
  rules: readonly Rule[],
): Span[] {
  const out = [...spans];
  const input = ruleTextOf(position);
  for (const rule of rules) {
    if (!isActive(rule) || !('hervorheben' in rule.wirkung)) continue;
    if (!rule.bedingung.wo.includes('langtext')) continue;
    const condition: RuleCondition = { ...rule.bedingung, wo: ['langtext'] };
    for (const hit of matchCondition(condition, input, RULE_CONTEXT)) {
      for (const mark of hit.marks) {
        if (out.some((span) => span.start < mark.end && mark.start < span.end)) continue;
        out.push({
          key: rule.wirkung.hervorheben,
          start: mark.start,
          end: mark.end,
          label: rule.name,
        });
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Leere eigene Regel; `blocks` z. B. aus einer Markierung. */
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
    status: 'entwurf',
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
