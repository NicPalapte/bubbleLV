// Der eine Auswerter für `bubble-rule-v1` (Entscheidung 0081). Reine Funktionen, kein
// Zustand: Doc ruft sie im Browser, bauonto über `npm run`-Befehle — so kann die
// Auswertung nie auseinanderlaufen.

import type { TextRange } from '../model/lvDraft';
import { compileStichworte } from '../text/stichwort';
import { sentenceAround } from '../text/sentence';
import {
  blocksOf,
  type RuleBlock,
  type RuleCondition,
  type RuleField,
  type RuleLinkSame,
} from './rule';

/** Die Texte einer Position, gegen die eine Regel läuft. */
export interface RuleText {
  readonly kurztext: string;
  readonly langtext: string;
  /**
   * Normfundstellen je Text. Der Kern erkennt keine Normen selbst: die App hat dafür
   * ihren Extraktor, und zwei Erkenner würden auseinanderlaufen. Fehlt der Eintrag,
   * trifft der Baustein „Norm“ in diesem Text nichts.
   */
  readonly normen?: Partial<Record<RuleField, readonly TextRange[]>>;
}

/** Ein Treffer: Bereich, in dem die Bedingung erfüllt ist, und die Fundstellen darin. */
export interface RuleHit {
  readonly feld: RuleField;
  readonly start: number;
  readonly end: number;
  readonly marks: readonly TextRange[];
}

// Einheiten nur in ihrer Schreibweise — welche fachlich gleich sind, entscheidet die App.
const UNIT =
  'm³|m²|m3|m2|cbm|qm|lfdm|lfm|km|cm|mm|m|to|t|kg|Stück|Stck|Stk|St|psch|Std|h|l|ha|Wo|Mt';
// „1.050,5 m²“, „120 m“, „0,5 m3“; die Zahl beginnt nicht mitten in einem Wort.
const AMOUNT = new RegExp(
  `(?<![\\p{L}\\p{N}.,])(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d+)?\\s?(${UNIT})\\.?(?![\\p{L}\\p{N}])`,
  'gu',
);

/** Schreibweise einer Einheit für den Vergleich: „m³“ = „m3“, „St.“ = „st“. */
export function unitSpellingOf(raw: string): string {
  const plain = raw.trim().replace(/²/g, '2').replace(/³/g, '3').replace(/\.+$/, '').toLowerCase();
  return { cbm: 'm3', qm: 'm2', stück: 'st', stck: 'st', stk: 'st', lfdm: 'lfm' }[plain] ?? plain;
}

const patterns = new Map<string, RegExp | null>();

function patternOf(begriff: string): RegExp | null {
  let pattern = patterns.get(begriff);
  if (pattern === undefined) {
    pattern = begriff.trim() === '' ? null : compileStichworte([begriff]);
    patterns.set(begriff, pattern);
  }
  return pattern;
}

/** Fundstellen eines Bausteins in einem Text. */
export function findBlock(
  block: RuleBlock,
  text: string,
  normen: readonly TextRange[] = [],
): TextRange[] {
  const out: TextRange[] = [];
  if ('begriff' in block) {
    const pattern = patternOf(block.begriff);
    if (pattern === null) return out;
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      if (match[0].length > 0) out.push({ start, end: start + match[0].length });
    }
  } else if ('menge' in block) {
    const wanted = block.menge.einheit === undefined ? null : unitSpellingOf(block.menge.einheit);
    for (const match of text.matchAll(AMOUNT)) {
      if (wanted !== null && unitSpellingOf(match[2]) !== wanted) continue;
      out.push({ start: match.index, end: match.index + match[0].length });
    }
  } else {
    out.push(...normen);
  }
  return out;
}

const inside = (range: TextRange, area: TextRange): boolean =>
  range.start >= area.start && range.end <= area.end;

const overlaps = (a: TextRange, b: TextRange): boolean => a.start < b.end && b.start < a.end;

function regionAround(condition: RuleCondition, text: string, anchor: TextRange): TextRange {
  const { bereich } = condition;
  if (bereich === 'feld') return { start: 0, end: text.length };
  if (bereich === 'satz') return sentenceAround(text, anchor.start, anchor.end);
  return {
    start: Math.max(0, anchor.start - bereich.zeichen),
    end: Math.min(text.length, anchor.end + bereich.zeichen),
  };
}

function hitsInField(condition: RuleCondition, field: RuleField, input: RuleText): RuleHit[] {
  const text = field === 'kurztext' ? input.kurztext : input.langtext;
  const blocks = blocksOf(condition);
  if (text === '' || blocks.length === 0) return [];
  const normen = input.normen?.[field] ?? [];
  const found = blocks.map((block) => findBlock(block, text, normen));
  const excluded = (condition.nicht ?? []).flatMap((block) => findBlock(block, text, normen));
  const all = condition.alle !== undefined;
  // Ankerpunkte: bei „alle“ reicht der seltenste Baustein, bei „eines“ jeder.
  const anchors = all
    ? found.reduce((rarest, list) => (list.length < rarest.length ? list : rarest))
    : found.flat().sort((a, b) => a.start - b.start);

  const out: RuleHit[] = [];
  for (const anchor of anchors) {
    if (out.some((hit) => inside(anchor, hit))) continue;
    const region = regionAround(condition, text, anchor);
    const within = found.map((list) => list.filter((range) => inside(range, region)));
    const ok = all ? within.every((list) => list.length > 0) : within.some((l) => l.length > 0);
    if (!ok || excluded.some((range) => overlaps(range, region))) continue;
    const marks = within.flat().sort((a, b) => a.start - b.start);
    out.push({ feld: field, start: region.start, end: region.end, marks });
    if (condition.bereich === 'feld') break;
  }
  return out;
}

/** Alle Treffer einer Bedingung in den Texten einer Position, je Text nach Lage sortiert. */
export function matchCondition(condition: RuleCondition, input: RuleText): RuleHit[] {
  return condition.wo.flatMap((field) => hitsInField(condition, field, input));
}

/** Was der Auswerter von einer Position zum Verknüpfen braucht. */
export interface LinkCandidate {
  /** Knoten-ID der Sitzung oder Positions-Hash — der Aufrufer entscheidet. */
  readonly id: string;
  readonly text: RuleText;
  /** Schlüssel des Abschnitts, in dem die Position steht. */
  readonly abschnitt: string | null;
  readonly einheit: string | null;
}

export interface LinkSuggestion {
  readonly from: string;
  readonly to: string;
  readonly fromHit: RuleHit;
  readonly toHit: RuleHit;
}

/** So viele Paare liefert eine Regel höchstens — darüber ist sie zu allgemein. */
export const MAX_LINK_SUGGESTIONS = 500;

function groupKey(candidate: LinkCandidate, same: readonly RuleLinkSame[]): string | null {
  const parts: string[] = [];
  for (const entry of same) {
    const value =
      entry === 'abschnitt'
        ? candidate.abschnitt
        : candidate.einheit === null
          ? null
          : unitSpellingOf(candidate.einheit);
    if (value === null || value === '') return null;
    parts.push(value);
  }
  return parts.join('\u0000');
}

/**
 * Paare aus Positionen, die `from` treffen, und Positionen, die `to` treffen. Erst nach
 * `gleich` vorgruppiert, nie alle gegen alle (.claude/CLAUDE.md, Beziehungen). Jedes Paar
 * nur einmal, egal in welcher Richtung; eine Position nie mit sich selbst.
 */
export function suggestLinks(
  from: RuleCondition,
  to: RuleCondition,
  same: readonly RuleLinkSame[],
  candidates: readonly LinkCandidate[],
  limit = MAX_LINK_SUGGESTIONS,
): { readonly pairs: LinkSuggestion[]; readonly truncated: boolean } {
  const targets = new Map<string, Array<{ id: string; hit: RuleHit }>>();
  for (const candidate of candidates) {
    const key = groupKey(candidate, same);
    if (key === null) continue;
    const hit = matchCondition(to, candidate.text)[0];
    if (hit === undefined) continue;
    const list = targets.get(key) ?? [];
    list.push({ id: candidate.id, hit });
    targets.set(key, list);
  }
  const pairs: LinkSuggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = groupKey(candidate, same);
    const group = key === null ? undefined : targets.get(key);
    if (group === undefined) continue;
    const fromHit = matchCondition(from, candidate.text)[0];
    if (fromHit === undefined) continue;
    for (const target of group) {
      if (target.id === candidate.id) continue;
      const pair =
        candidate.id < target.id ? `${candidate.id}|${target.id}` : `${target.id}|${candidate.id}`;
      if (seen.has(pair)) continue;
      if (pairs.length >= limit) return { pairs, truncated: true };
      seen.add(pair);
      pairs.push({ from: candidate.id, to: target.id, fromHit, toHit: target.hit });
    }
  }
  return { pairs, truncated: false };
}
