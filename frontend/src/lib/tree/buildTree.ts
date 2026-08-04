// LVDraft (klassifiziert) → LVNode-Baum. Reine Funktion, kein Import aus lib/gaeb
// (docs/architecture/pipeline.md#in-memory-baum). Ein Contract für Tree-Spalte,
// Bubble-Graph und Tabelle.

import type { LotDraft, LVDraft, PositionDraft, SectionDraft } from '../../types/lvDraft';
import type { LVNode } from '../../types/lvNode';

/**
 * IDs werden nach `kind` präfixiert, weil ein namenloser Wrapper-Abschnitt
 * dieselbe Nummer trägt wie sein Los ("001"). Bei einer trotzdem doppelten ID
 * hängt ein Zähler an — der Baum muss eindeutige React-Keys liefern.
 */
class IdFactory {
  private readonly used = new Set<string>();

  next(kind: string, code: string, fallback: string): string {
    const base = `${kind}:${code === '' ? fallback : code}`;
    if (!this.used.has(base)) {
      this.used.add(base);
      return base;
    }
    let counter = 2;
    while (this.used.has(`${base}#${counter}`)) counter++;
    const unique = `${base}#${counter}`;
    this.used.add(unique);
    return unique;
  }
}

/** `null` als 0 werten: x83-Dateien führen meist keine Einheitspreise. */
function lineTotal(position: PositionDraft): number {
  return (position.quantity ?? 0) * (position.unitPrice ?? 0);
}

function buildPosition(position: PositionDraft, ids: IdFactory, index: number): LVNode {
  return {
    id: ids.next('position', position.oz, `${index}`),
    kind: 'position',
    code: position.oz,
    label: position.shortText === '' ? null : position.shortText,
    positionCount: 1,
    totalPrice: lineTotal(position),
    children: [],
    position: {
      oz: position.oz,
      shortText: position.shortText,
      longText: position.longText,
      unit: position.unit,
      quantity: position.quantity,
      unitPrice: position.unitPrice,
      positionType: position.positionType,
      attributes: position.attributes,
    },
  };
}

function aggregate(children: LVNode[]): { positionCount: number; totalPrice: number } {
  let positionCount = 0;
  let totalPrice = 0;
  for (const child of children) {
    positionCount += child.positionCount;
    totalPrice += child.totalPrice;
  }
  return { positionCount, totalPrice };
}

function buildSection(section: SectionDraft, ids: IdFactory, index: number): LVNode {
  const id = ids.next('section', section.number, `${index}`);
  const children = [
    ...section.sections.map((child, i) => buildSection(child, ids, i)),
    ...section.positions.map((position, i) => buildPosition(position, ids, i)),
  ];
  return {
    id,
    kind: 'section',
    code: section.number,
    label: section.label,
    ...aggregate(children),
    children,
    position: null,
  };
}

function buildLot(lot: LotDraft, ids: IdFactory, index: number): LVNode {
  const id = ids.next('lot', lot.number, `${index}`);
  const children = lot.sections.map((section, i) => buildSection(section, ids, i));
  return {
    id,
    kind: 'lot',
    code: lot.number,
    label: lot.label,
    ...aggregate(children),
    children,
    position: null,
  };
}

export function buildTree(draft: LVDraft): LVNode {
  const ids = new IdFactory();
  const children = draft.lots.map((lot, index) => buildLot(lot, ids, index));
  return {
    id: 'project',
    kind: 'project',
    code: '',
    label: draft.projectName,
    ...aggregate(children),
    children,
    position: null,
  };
}

/** Alle Positionsknoten in Dokumentreihenfolge — Basis für Tabelle und Facetten. */
export function collectPositions(node: LVNode, into: LVNode[] = []): LVNode[] {
  if (node.kind === 'position') into.push(node);
  for (const child of node.children) collectPositions(child, into);
  return into;
}

/** Knoten-Index für Selektion und Drill-in. */
export function indexNodes(root: LVNode): Map<string, LVNode> {
  const map = new Map<string, LVNode>();
  const visit = (node: LVNode): void => {
    map.set(node.id, node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return map;
}

/** Elternzuordnung — für Breadcrumb, Spotlight und Drill-in aus dem Graphen. */
export function indexParents(root: LVNode): Map<string, LVNode | null> {
  const map = new Map<string, LVNode | null>();
  const visit = (node: LVNode, parent: LVNode | null): void => {
    map.set(node.id, parent);
    for (const child of node.children) visit(child, node);
  };
  visit(root, null);
  return map;
}
