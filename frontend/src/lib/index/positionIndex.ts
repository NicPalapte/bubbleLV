// Flacher Positions-Index — die Rechenbasis neben dem Baum. Der `LVNode`-Baum
// bleibt die Struktur, dieser Index trägt Filter, Summen und (ab WP-M)
// Beziehungen (.claude/CLAUDE.md#client-seitige-pipeline-kern).
//
// Warum: bis WP-I leitete jede Ansicht je Render und je Position die
// Facettenwerte neu ab (ein Array je Facette) und normalisierte den kompletten
// Langtext für die Suche. Bei ~10k Positionen sind das über 90.000
// Array-Allokationen und mehrere MB `toLowerCase` — pro Tastendruck. Der Index
// entsteht einmal je geladenem LV und hält alles vorberechnet vor.
//
// Die numerischen Spalten liegen als `Float64Array`, damit Summen und
// Wertebereiche ohne Objekt-Traversierung laufen (siehe summary.ts). Fehlende
// Werte stehen als `NaN` — 0 wäre eine erfundene Menge und würde Min/Max
// verfälschen.

import { matchFacts, positionFacts, type ActiveFilters, type PositionFacts } from '../matchPos';
import { collectPositions } from '../tree/buildTree';
import type { LVNode, PositionSummary } from '../../types/lvNode';

export interface PositionIndex {
  /** Anzahl Einträge; jeder Eintrag ist eine Position in Dokumentreihenfolge. */
  readonly size: number;
  /** Verweis auf den Baumknoten je Eintrag — Identität, keine Kopie. */
  readonly nodes: readonly LVNode[];
  readonly positions: readonly PositionSummary[];
  /** Vorberechnete Filtergrundlage je Eintrag. */
  readonly facts: readonly PositionFacts[];
  /** Menge je Eintrag; `NaN`, wo die Datei keine führt. */
  readonly quantity: Float64Array;
  /** Einheitspreis je Eintrag; `NaN`, wo die Datei keinen führt. */
  readonly unitPrice: Float64Array;
  /** Gesamtpreis je Eintrag (Menge × EP, fehlende Werte als 0). */
  readonly totalPrice: Float64Array;
  /** Eintragsnummer je Knoten-ID — Brücke vom Baum in den Index. */
  readonly slotOf: ReadonlyMap<string, number>;
}

export const EMPTY_POSITION_INDEX: PositionIndex = {
  size: 0,
  nodes: [],
  positions: [],
  facts: [],
  quantity: new Float64Array(0),
  unitPrice: new Float64Array(0),
  totalPrice: new Float64Array(0),
  slotOf: new Map(),
};

export function buildPositionIndex(root: LVNode): PositionIndex {
  const nodes = collectPositions(root).filter((node) => node.position !== null);
  const size = nodes.length;
  const positions = new Array<PositionSummary>(size);
  const facts = new Array<PositionFacts>(size);
  const quantity = new Float64Array(size);
  const unitPrice = new Float64Array(size);
  const totalPrice = new Float64Array(size);
  const slotOf = new Map<string, number>();

  for (let i = 0; i < size; i++) {
    const node = nodes[i];
    // `position` ist oben geprüft; der Nicht-Null-Zugriff spart 10k Prüfungen.
    const position = node.position as PositionSummary;
    positions[i] = position;
    facts[i] = positionFacts(position);
    quantity[i] = position.quantity ?? Number.NaN;
    unitPrice[i] = position.unitPrice ?? Number.NaN;
    totalPrice[i] = node.totalPrice;
    slotOf.set(node.id, i);
  }

  return { size, nodes, positions, facts, quantity, unitPrice, totalPrice, slotOf };
}

/**
 * Trefferbitmaske über alle Einträge (1 = Treffer). Ein einziger Durchlauf je
 * Filterwechsel statt einer Prüfung je Ansicht und Render.
 */
export function filterMask(index: PositionIndex, active: ActiveFilters): Uint8Array {
  const mask = new Uint8Array(index.size);
  if (!active.filtering) {
    mask.fill(1);
    return mask;
  }
  for (let i = 0; i < index.size; i++) {
    if (matchFacts(index.facts[i], active)) mask[i] = 1;
  }
  return mask;
}

/**
 * Filterprüfung je Positionsknoten, einmal vorberechnet. Knoten außerhalb des
 * Index — eine Ansicht zeigt einen Baum, der nicht der geladene ist (Tests,
 * eingebettete Vorschauen) — fallen auf die Ableitung je Aufruf zurück.
 */
export function createPositionFilter(
  index: PositionIndex,
  active: ActiveFilters,
): (node: LVNode) => boolean {
  if (!active.filtering) return (node) => node.position !== null;
  const mask = filterMask(index, active);
  return (node) => {
    if (node.position === null) return false;
    const slot = index.slotOf.get(node.id);
    if (slot !== undefined) return mask[slot] === 1;
    return matchFacts(positionFacts(node.position), active);
  };
}
