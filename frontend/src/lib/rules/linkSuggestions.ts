// Vorschläge aktiver Verknüpfungsregeln je Position (Entscheidung 0081). Einmal je LV und
// Regelstand berechnet und zwischengespeichert, nie je Render: die Positionskarte liest
// nur nach. Vorgruppiert nach Abschnitt bzw. Einheit (`suggestLinks` im Kern).

import { ruleKey, suggestLinks, type Rule } from '@core';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';
import { isActive, linkCandidatesOf } from './rules';

export interface RuleLinkSuggestion {
  readonly other: string;
  readonly rule: Rule;
  /** `id@version` der Regel, für das Urteil. */
  readonly key: string;
}

export type LinkSuggestions = ReadonlyMap<string, readonly RuleLinkSuggestion[]>;

const EMPTY: LinkSuggestions = new Map();

const cache = new WeakMap<
  PositionIndex,
  { rules: readonly Rule[]; parents: ReadonlyMap<string, LVNode | null>; result: LinkSuggestions }
>();

const sameRules = (a: readonly Rule[], b: readonly Rule[]): boolean =>
  a.length === b.length && a.every((rule, i) => rule === b[i]);

/** Vorschläge je Knoten-ID, beide Richtungen; ohne aktive Verknüpfungsregel leer. */
export function linkSuggestionsOf(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  rules: readonly Rule[],
): LinkSuggestions {
  const linking = rules.filter((rule) => isActive(rule) && 'verknuepfen' in rule.wirkung);
  if (linking.length === 0) return EMPTY;
  const cached = cache.get(index);
  if (cached !== undefined && cached.parents === parents && sameRules(cached.rules, linking)) {
    return cached.result;
  }
  const candidates = linkCandidatesOf(index.nodes, parents);
  const out = new Map<string, RuleLinkSuggestion[]>();
  const add = (id: string, entry: RuleLinkSuggestion): void => {
    const list = out.get(id) ?? [];
    if (!list.some((other) => other.other === entry.other)) list.push(entry);
    out.set(id, list);
  };
  for (const rule of linking) {
    if (!('verknuepfen' in rule.wirkung)) continue;
    const { ziel, gleich } = rule.wirkung.verknuepfen;
    const key = ruleKey(rule);
    for (const pair of suggestLinks(rule.bedingung, ziel, gleich, candidates).pairs) {
      add(pair.from, { other: pair.to, rule, key });
      add(pair.to, { other: pair.from, rule, key });
    }
  }
  cache.set(index, { rules: linking, parents, result: out });
  return out;
}
