// Radiales Tidy-Tree-Layout mit adaptiven Ring-Radien. Portiert aus
// `layoutRadial` in design/claude-design/lv-graph.jsx, gebunden an LVNode.

import { CLUSTER_AT, DOT_AT, RADII, tierOf, type Tier } from './constants';
import type { LVNode } from '../../types/lvNode';

export type Density = 'normal' | 'dots' | 'cluster';

export interface PlacedNode {
  id: string;
  node: LVNode | null;
  tier: Tier;
  cx: number;
  cy: number;
  angle: number;
  depth: number;
  /** Punkt-Darstellung statt Bubble (viele Geschwister). */
  dotted: boolean;
  /** Nur für Cluster-Knoten: ID des Elternknotens und Anzahl der Kinder. */
  clusterOf: string | null;
  clusterCount: number;
}

export interface RadialLayout {
  nodes: Map<string, PlacedNode>;
  rings: number[];
}

export type CollapsedMap = Readonly<Record<string, boolean>>;

export function classifyChildren(children: readonly LVNode[]): Density {
  if (children.length === 0) return 'normal';
  if (children.length > CLUSTER_AT) return 'cluster';
  if (children.length > DOT_AT) return 'dots';
  return 'normal';
}

/** Elternzuordnung über alle Knoten — für Spotlight und Kanten. */
export function walkParents(root: LVNode): Map<string, LVNode | null> {
  const parents = new Map<string, LVNode | null>();
  const visit = (node: LVNode, parent: LVNode | null): void => {
    parents.set(node.id, parent);
    for (const child of node.children) visit(child, node);
  };
  visit(root, null);
  return parents;
}

const MIN_RING = [0, 220, 420, 580, 740, 880, 1020, 1160];
const MAX_DEPTH = 7;

export function layoutRadial(root: LVNode, collapsed: CollapsedMap): RadialLayout {
  const nodes = new Map<string, PlacedNode>();
  const ringNeeds: Record<number, number> = {};

  // ── Durchgang 1: größte Winkeldichte je Tiefe ermitteln, damit Ringe wachsen.
  const plan = (node: LVNode, depth: number, wedgeStart: number, wedgeEnd: number): void => {
    if (collapsed[node.id] === true) return;
    const children = node.children;
    if (children.length === 0) return;
    const density = classifyChildren(children);
    if (density === 'cluster') return; // Cluster sitzt allein auf dem nächsten Ring.

    const per = (wedgeEnd - wedgeStart) / children.length;
    const sizePer = density === 'dots' ? 7 : RADII[tierOf(children[0], depth + 1)];
    const gap = density === 'dots' ? 4 : 12;
    const needed = (2 * sizePer + gap) / per;
    ringNeeds[depth + 1] = Math.max(ringNeeds[depth + 1] ?? 0, needed);
    children.forEach((child, index) => {
      plan(child, depth + 1, wedgeStart + index * per, wedgeStart + (index + 1) * per);
    });
  };
  plan(root, 0, 0, Math.PI * 2);

  const rings: number[] = [0];
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const min = MIN_RING[depth] ?? rings[depth - 1] + 140;
    const stepPad = rings[depth - 1] + 120;
    rings[depth] = Math.max(min, stepPad, ringNeeds[depth] ?? 0);
  }

  // ── Durchgang 2: Knoten platzieren.
  const place = (node: LVNode, depth: number, wedgeStart: number, wedgeEnd: number): void => {
    const angle = (wedgeStart + wedgeEnd) / 2;
    const radius = rings[Math.min(depth, MAX_DEPTH)] ?? 0;
    nodes.set(node.id, {
      id: node.id,
      node,
      tier: tierOf(node, depth),
      cx: Math.cos(angle) * radius,
      cy: Math.sin(angle) * radius,
      angle,
      depth,
      dotted: false,
      clusterOf: null,
      clusterCount: 0,
    });

    if (collapsed[node.id] === true) return;
    const children = node.children;
    if (children.length === 0) return;

    const density = classifyChildren(children);
    if (density === 'cluster') {
      const clusterRadius = rings[Math.min(depth + 1, MAX_DEPTH)] ?? radius + 140;
      const id = `cluster:${node.id}`;
      nodes.set(id, {
        id,
        node: null,
        tier: 'cluster',
        cx: Math.cos(angle) * clusterRadius,
        cy: Math.sin(angle) * clusterRadius,
        angle,
        depth: depth + 1,
        dotted: false,
        clusterOf: node.id,
        clusterCount: children.length,
      });
      return;
    }

    const per = (wedgeEnd - wedgeStart) / children.length;
    children.forEach((child, index) => {
      place(child, depth + 1, wedgeStart + index * per, wedgeStart + (index + 1) * per);
      if (density === 'dots') {
        const placed = nodes.get(child.id);
        if (placed !== undefined) placed.dotted = true;
      }
    });
  };
  place(root, 0, 0, Math.PI * 2);

  return { nodes, rings };
}

/** Alles ab Tiefe `fromDepth` mit Kindern einklappen. */
export function collapseFrom(root: LVNode, fromDepth: number): Record<string, boolean> {
  const collapsed: Record<string, boolean> = {};
  const visit = (node: LVNode, depth: number): void => {
    if (depth >= fromDepth && node.children.length > 0) collapsed[node.id] = true;
    for (const child of node.children) visit(child, depth + 1);
  };
  visit(root, 0);
  return collapsed;
}
