// Gelernte Begriffe im Langtext (Entscheidung 0053, seit 0088 als Regeln).
//
// Ein gelernter Begriff ist eine eigene Regel `bubble-rule-v1`: ein Baustein „Begriff“,
// Suchort Langtext, Wirkung „hervorheben“ (Material, Maße, Wichtig oder „Nicht
// hervorheben“). Angewendet wird er wie jede Regel (`applyRules` in lib/rules/rules.ts).
// Begriffe, die ältere Versionen getrennt im Browser gespeichert haben, zieht
// `state/admin.tsx` beim Start einmal in eigene Regeln um.
//
// Schreibweise wie in den Materialtabellen (lib/classify/material/stichwort.ts):
// `#` = eine Zahl, `*` = beliebige Buchstaben, sonst wörtlich, ohne Groß/klein.
//
// Begriffe der Kategorie „Material" stehen auch im Filter „Material" (Entscheidung 0066).

import { blocksOf, ruleIdOf, RULE_SCHEMA, type Rule, type RuleHighlight } from '@core';
import { compileStichworte } from '../classify/material/stichwort';

/** Wie die Wirkung „hervorheben“; `aus` = nie hervorheben. */
export type TermCategory = RuleHighlight;

export const TERM_CATEGORIES: readonly TermCategory[] = ['material', 'masse', 'wichtig', 'aus'];

export const TERM_LABELS: Readonly<Record<TermCategory, string>> = {
  material: 'Material',
  masse: 'Maße',
  wichtig: 'Wichtig',
  aus: 'Nicht hervorheben',
};

export interface LearnedTerm {
  /** Begriff oder Muster, z. B. „Sichtbetonklasse SB#". */
  readonly begriff: string;
  readonly kategorie: TermCategory;
}

/** Gleicher Begriff ohne Rücksicht auf Groß/klein und Leerraum. */
export function sameTerm(a: string, b: string): boolean {
  const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Ziffernfolgen als `#`: „C30/37" → „C#/#". Für den Vorschlag „als Muster
 * lernen" — `null`, wenn der Begriff keine Zahl enthält.
 */
export function patternOf(text: string): string | null {
  const pattern = text.trim().replace(/\d+(?:[.,]\d+)?/g, '#');
  return pattern === text.trim() ? null : pattern;
}

// Ein Muster je Begriff, einmal übersetzt. `matchAll` arbeitet auf einer Kopie,
// das gemeinsame `g`-Muster behält also keinen Zustand zwischen Aufrufen.
const compiled = new Map<string, RegExp | null>();

function patternFor(begriff: string): RegExp | null {
  let pattern = compiled.get(begriff);
  if (pattern === undefined) {
    pattern = compileStichworte([begriff]);
    compiled.set(begriff, pattern);
  }
  return pattern;
}

/** Fundstellen eines Begriffs im Text; ein kaputtes Muster liefert keine. */
function matches(text: string, begriff: string): Array<{ start: number; end: number }> {
  const pattern = patternFor(begriff);
  if (pattern === null) return [];
  const out: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (match[0].length > 0) out.push({ start, end: start + match[0].length });
  }
  return out;
}

/** Kommt der Begriff im Text vor? Für den Filter „Material" (lib/index/learnedMaterials.ts). */
export function termFound(text: string, begriff: string): boolean {
  return matches(text, begriff).length > 0;
}

/** Ein Begriff als eigene Regel: im Langtext, sofort aktiv, Name = Begriff. */
export function termRule(term: LearnedTerm, taken: ReadonlySet<string>): Rule {
  const begriff = term.begriff.trim();
  return {
    schema: RULE_SCHEMA,
    id: ruleIdOf(begriff, taken),
    version: 1,
    name: begriff,
    bedingung: { alle: [{ begriff }], bereich: 'satz', wo: ['langtext'] },
    wirkung: { hervorheben: term.kategorie },
    geltung: 'unternehmen',
    status: 'freigegeben',
    herkunft: 'nutzer',
    bemerkung: 'Gelernter Begriff',
  };
}

/** Der Begriff einer Regel, die nur aus einem Begriff im Langtext besteht; sonst `null`. */
export function termOfRule(rule: Rule): LearnedTerm | null {
  if (!('hervorheben' in rule.wirkung)) return null;
  const { bedingung } = rule;
  if ((bedingung.nicht ?? []).length > 0) return null;
  if (bedingung.wo.length !== 1 || bedingung.wo[0] !== 'langtext') return null;
  const blocks = blocksOf(bedingung);
  if (blocks.length !== 1) return null;
  const [block] = blocks;
  return 'begriff' in block
    ? { begriff: block.begriff, kategorie: rule.wirkung.hervorheben }
    : null;
}

/**
 * „Immer hervorheben als …“: eigene Regel für den Begriff. Gibt es schon eine eigene Regel
 * mit genau diesem Begriff, behält sie ihre Kennung und bekommt die neue Kategorie.
 */
export function learnedRule(
  ownRules: readonly Rule[],
  term: LearnedTerm,
  taken: ReadonlySet<string>,
): Rule {
  const known = ownRules.find((rule) => {
    const own = termOfRule(rule);
    return own !== null && sameTerm(own.begriff, term.begriff);
  });
  const fresh = termRule(term, taken);
  return known === undefined ? fresh : { ...fresh, id: known.id, version: known.version + 1 };
}

/** Altbestand aus dem Browser als eigene Regeln; Kennungen ohne Doppelte. */
export function termsToRules(terms: readonly LearnedTerm[], ownRules: readonly Rule[]): Rule[] {
  const taken = new Set(ownRules.map((rule) => rule.id));
  const out: Rule[] = [];
  for (const term of terms) {
    if (term.begriff.trim() === '') continue;
    const known = [...ownRules, ...out].some((rule) => {
      const own = termOfRule(rule);
      return own !== null && sameTerm(own.begriff, term.begriff);
    });
    if (known) continue;
    const rule = termRule(term, taken);
    taken.add(rule.id);
    out.push(rule);
  }
  return out;
}

/** Aktive Begriffe der Kategorie „Material“ aus den Regeln, für den Filter „Material“. */
export function materialTermsOf(rules: readonly Rule[]): LearnedTerm[] {
  const out: LearnedTerm[] = [];
  for (const rule of rules) {
    if (rule.status !== 'freigegeben') continue;
    const term = termOfRule(rule);
    if (term !== null && term.kategorie === 'material') out.push(term);
  }
  return out;
}
