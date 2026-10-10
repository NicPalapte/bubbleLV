// Hauptabschnitt einer Position und seine Farbe. Eine Stelle für Überblick und
// Graph: derselbe Abschnitt hat in der Treemap und an den Punkten denselben Ton
// (Entscheidung 0043). Der Hauptabschnitt steht in jeder Datei — anders als
// das Gewerk, das ohne Katalog fast immer fehlt.

import { CATEGORY_COLORS, NEUTRAL_COLOR } from '../colors';
import { headingOf } from './heading';
import type { PositionIndex } from '../index/positionIndex';
import type { LVNode } from '../../types/lvNode';

/** Schlüssel für Positionen, die direkt unter Los oder LV stehen. */
export const NO_SECTION_KEY = '';

/**
 * Hauptabschnitt einer Position: der oberste Abschnitt über ihr, Lose
 * übersprungen. `null`, wenn sie direkt unter Los oder LV steht.
 */
export function mainSectionOf(
  node: LVNode,
  parents: ReadonlyMap<string, LVNode | null>,
  cache: Map<string, LVNode | null>,
): LVNode | null {
  const parent = parents.get(node.id) ?? null;
  if (parent === null) return null;
  const known = cache.get(parent.id);
  if (known !== undefined) return known;
  let top: LVNode | null = null;
  for (let up: LVNode | null = parent; up !== null; up = parents.get(up.id) ?? null) {
    if (up.kind === 'section') top = up;
  }
  cache.set(parent.id, top);
  return top;
}

/**
 * Rang jedes Hauptabschnitts in LV-Reihenfolge, über die ganze Datei — nicht
 * über die Filtermenge, sonst rutschten Farben nach, wenn ein Abschnitt
 * herausfällt.
 */
export function sectionOrder(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
  cache: Map<string, LVNode | null>,
): Map<string, number> {
  const order = new Map<string, number>();
  for (let slot = 0; slot < index.size; slot++) {
    const key = mainSectionOf(index.nodes[slot], parents, cache)?.id ?? NO_SECTION_KEY;
    if (!order.has(key)) order.set(key, order.size);
  }
  return order;
}

/** Ton eines Hauptabschnitts aus seinem Rang; ohne Abschnitt farblos. */
export function sectionColor(key: string, order: number): string {
  return key === NO_SECTION_KEY ? NEUTRAL_COLOR : CATEGORY_COLORS[order % CATEGORY_COLORS.length];
}

export interface SectionColors {
  /** Ton je Indexeintrag. */
  readonly bySlot: readonly string[];
  /** Überschrift und Ton je Hauptabschnitt in LV-Reihenfolge — für die Legende. */
  readonly entries: ReadonlyArray<readonly [string, string]>;
}

export const EMPTY_SECTION_COLORS: SectionColors = { bySlot: [], entries: [] };

/** Einmal je geladenem LV: Ton je Position nach ihrem Hauptabschnitt. */
export function buildSectionColors(
  index: PositionIndex,
  parents: ReadonlyMap<string, LVNode | null>,
): SectionColors {
  const cache = new Map<string, LVNode | null>();
  const order = sectionOrder(index, parents, cache);
  const bySlot = new Array<string>(index.size);
  const entries: Array<readonly [string, string]> = [];
  const listed = new Set<string>();
  for (let slot = 0; slot < index.size; slot++) {
    const main = mainSectionOf(index.nodes[slot], parents, cache);
    const key = main?.id ?? NO_SECTION_KEY;
    const color = sectionColor(key, order.get(key) ?? 0);
    bySlot[slot] = color;
    if (main !== null && !listed.has(key)) {
      listed.add(key);
      entries.push([headingOf(main), color]);
    }
  }
  return { bySlot, entries };
}
