// Sichtbare Baumzeilen als flache Liste. Grundlage der Baumspalte: aus ihr
// ergibt sich, welche Zeilen gezeichnet werden (Virtualisierung) und welche
// Zeile die Tastatur als nächste ansteuert — beides ist über die frühere
// Rekursion nicht bestimmbar.
//
// Sichtbarkeit heißt hier dasselbe wie vorher in der Baumspalte: ein Knoten
// erscheint, wenn alle seine Vorfahren offen sind, und Nicht-Treffer fallen nur
// im Modus "Ausblenden" weg.

import { matchCount, type MatchIndex } from './matchCounts';
import type { LVNode } from '../../types/lvNode';

export interface VisibleRow {
  node: LVNode;
  /** 0 für die Kinder der Wurzel — die Wurzel selbst steht im Spaltenkopf. */
  depth: number;
  hasChildren: boolean;
  open: boolean;
  /** Passende Positionen unter diesem Knoten. */
  hits: number;
  /** Gefiltert und ohne Treffer (im Modus "Hervorheben" gedämpft sichtbar). */
  missed: boolean;
  /** 1-basierte Position unter den sichtbaren Geschwistern (ARIA). */
  posInSet: number;
  /** Anzahl sichtbarer Geschwister inkl. dieser Zeile (ARIA). */
  setSize: number;
}

/**
 * Alle sichtbaren Zeilen in Anzeigereihenfolge.
 *
 * @param root Projektknoten; seine eigene Zeile gehört nicht in die Liste.
 * @param open Offene Knoten (Aufklapp-Zustand plus Suchtreffer-Pfade).
 * @param matches Trefferzahlen je Knoten.
 * @param hideMissed Nicht-Treffer ganz weglassen statt dämpfen.
 */
export function flattenVisible(
  root: LVNode,
  open: ReadonlySet<string>,
  matches: MatchIndex,
  hideMissed: boolean,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  if (!open.has(root.id)) return rows;

  const visitLevel = (children: readonly LVNode[], depth: number): void => {
    // Erst die sichtbaren Geschwister zählen: aria-setsize meint die Menge, die
    // tatsächlich in der Spalte steht, nicht die im Baum vorhandene.
    const shown =
      hideMissed && matches.filtering
        ? children.filter((child) => matchCount(matches, child) > 0)
        : children;

    shown.forEach((node, index) => {
      const hits = matchCount(matches, node);
      const isOpen = open.has(node.id);
      rows.push({
        node,
        depth,
        hasChildren: node.children.length > 0,
        open: isOpen,
        hits,
        missed: matches.filtering && hits === 0,
        posInSet: index + 1,
        setSize: shown.length,
      });
      if (isOpen && node.children.length > 0) visitLevel(node.children, depth + 1);
    });
  };

  visitLevel(root.children, 0);
  return rows;
}

/** Zeilenindex je Knoten-ID — für Auswahl und Tastatursprünge. */
export function indexRows(rows: readonly VisibleRow[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row, index) => map.set(row.node.id, index));
  return map;
}

/**
 * Zeile des Elternknotens: die nächste Zeile oberhalb mit geringerer Tiefe.
 * `-1`, wenn die Zeile auf oberster Ebene steht.
 */
export function parentRowIndex(rows: readonly VisibleRow[], index: number): number {
  const depth = rows[index]?.depth ?? 0;
  if (depth === 0) return -1;
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].depth < depth) return i;
  }
  return -1;
}
