// Vorschläge aktiver Verknüpfungsregeln je Position (Entscheidung 0081). Einmal je LV und
// Regelstand berechnet und zwischengespeichert, nie je Render: die Positionskarte liest
// nur nach. Vorgruppiert nach Abschnitt bzw. Einheit (`suggestLinks` im Kern).

import { MAX_LINK_SUGGESTIONS, positionLinkOf, ruleKey, suggestLinks, type Rule } from '@core';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';
import { isActive, linkCandidatesOf } from './rules';

export interface RuleLinkSuggestion {
  readonly other: string;
  readonly rule: Rule;
  /** `id@version` der Regel, für das Urteil. */
  readonly key: string;
}

export interface LinkSuggestions {
  /** Vorschläge je Knoten-ID. */
  readonly byId: ReadonlyMap<string, readonly RuleLinkSuggestion[]>;
  /** Regeln über der Obergrenze: ihre Paare sind nur ein Teil. */
  readonly truncated: readonly Rule[];
}

const EMPTY: LinkSuggestions = { byId: new Map(), truncated: [] };

const cache = new WeakMap<
  PositionIndex,
  {
    rules: readonly Rule[];
    parents: ReadonlyMap<string, LVNode | null>;
    limit: number;
    result: LinkSuggestions;
  }
>();

const sameRules = (a: readonly Rule[], b: readonly Rule[]): boolean =>
  a.length === b.length && a.every((rule, i) => rule === b[i]);

/** Vorschläge je Knoten-ID, beide Richtungen; ohne aktive Verknüpfungsregel leer. */
export function linkSuggestionsOf(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  rules: readonly Rule[],
  limit = MAX_LINK_SUGGESTIONS,
): LinkSuggestions {
  const linking = rules.filter((rule) => isActive(rule) && positionLinkOf(rule.wirkung) !== null);
  if (linking.length === 0) return EMPTY;
  const cached = cache.get(index);
  if (
    cached !== undefined &&
    cached.parents === parents &&
    cached.limit === limit &&
    sameRules(cached.rules, linking)
  ) {
    return cached.result;
  }
  const candidates = linkCandidatesOf(index.nodes, parents);
  const out = new Map<string, RuleLinkSuggestion[]>();
  const truncated: Rule[] = [];
  const add = (id: string, entry: RuleLinkSuggestion): void => {
    const list = out.get(id) ?? [];
    if (!list.some((other) => other.other === entry.other)) list.push(entry);
    out.set(id, list);
  };
  for (const rule of linking) {
    const link = positionLinkOf(rule.wirkung);
    if (link === null) continue;
    const { ziel, gleich } = link;
    const key = ruleKey(rule);
    const found = suggestLinks(rule.bedingung, ziel, gleich, candidates, limit);
    if (found.truncated) truncated.push(rule);
    for (const pair of found.pairs) {
      add(pair.from, { other: pair.to, rule, key });
      add(pair.to, { other: pair.from, rule, key });
    }
  }
  const result: LinkSuggestions = { byId: out, truncated };
  cache.set(index, { rules: linking, parents, limit, result });
  return result;
}
