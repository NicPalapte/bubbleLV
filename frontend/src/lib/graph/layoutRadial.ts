// Layout des Bubble-Graphen (Ballon-Layout): jeder Knoten legt seine Kinder als
// Kreis um sich selbst — nicht um den Ursprung. Der Kreisradius folgt der Größe
// der Teilbäume, die Winkel ihrer Breite. Dadurch skalieren die Abstände mit dem
// LV, statt aus einer festen Ring-Tabelle zu kommen, und der Baum wächst
// organisch nach außen (Issue #11).
//
// Die Konstruktion garantiert Überschneidungsfreiheit: `spread` ist der Radius
// eines Kreises, der den gesamten Teilbaum eines Knotens umschließt; ein Knoten
// verteilt an seine Kinder disjunkte Winkelanteile, die genau diese Kreise
// aufnehmen.

import { CLUSTER_AT, DOT_AT, RADII, SIZE_MAX_FACTOR, tierOf, type Tier } from './constants';
import type { LVNode } from '../../types/lvNode';

export type Density = 'normal' | 'dots' | 'cluster';

export interface PlacedNode {
  id: string;
  node: LVNode | null;
  tier: Tier;
  cx: number;
  cy: number;
  /** Richtung, aus der der Knoten von seinem Elternknoten kommt. */
  angle: number;
  /** Abstand zum Ursprung. */
  radius: number;
  depth: number;
  /** Punkt-Darstellung statt Bubble (viele Geschwister). */
  dotted: boolean;
  /** Nur für Cluster-Knoten: ID des Elternknotens und Anzahl der Kinder. */
  clusterOf: string | null;
  clusterCount: number;
}

export interface RadialLayout {
  nodes: Map<string, PlacedNode>;
  /** Radius, der den ganzen Graphen umschließt — Grundlage für "Einpassen". */
  extent: number;
}

export type CollapsedMap = Readonly<Record<string, boolean>>;
/** Cluster-Bubbles, die der Nutzer aufgelöst hat — ihre Kinder werden gezeigt. */
export type ClusterMap = Readonly<Record<string, boolean>>;

const DOT_RADIUS = 7;
/** Luft um den Teilbaum eines Kindes herum. */
const GAP = 18;
/** Luft zwischen der Bubble eines Knotens und dem Kreis seiner Kinder. */
const PARENT_PAD = 30;
/**
 * Kinder fächern sich in die Halbebene vom Elternknoten weg auf. Die Grenze von
 * π ist nicht kosmetisch: dadurch bleibt jeder Teilbaum jenseits seines Knotens
 * und kann nie auf die Bubble des Großelternknotens zurückfallen — deshalb
 * genügt als Abstand zum Elternknoten dessen Bubble statt des ganzen Teilbaums.
 */
const CHILD_SPAN = Math.PI;
/** Der Graph beginnt nach oben statt nach rechts. */
const START_ANGLE = -Math.PI / 2;

export function classifyChildren(children: readonly LVNode[], clusterExpanded = false): Density {
  if (children.length === 0) return 'normal';
  if (children.length > CLUSTER_AT) return clusterExpanded ? 'dots' : 'cluster';
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

/**
 * Radius der Bubble selbst. Der Größenmodus streckt sie auf bis zum
 * `SIZE_MAX_FACTOR`-fachen Basisradius — das Layout muss den Maximalfall
 * tragen, sonst überlappen große Bubbles nach dem Umschalten.
 */
function bubbleRadius(tier: Tier, dotted: boolean): number {
  if (dotted) return DOT_RADIUS;
  return RADII[tier] * SIZE_MAX_FACTOR;
}

/** Was das Layout je Knoten aus dem Messdurchgang behält. */
interface Measure {
  tier: Tier;
  dotted: boolean;
  density: Density;
  /** Radius der Bubble. */
  size: number;
  /** Radius des Kreises, auf dem die Kinder sitzen. */
  ring: number;
  /** Radius, der den gesamten Teilbaum umschließt. */
  spread: number;
  /** Platzbedarf je Kind inkl. Luft, in Reihenfolge der Kinder. */
  childSpans: number[];
}

/**
 * Durchgang 1 (von unten nach oben): Platzbedarf jedes Teilbaums. Der Kreis der
 * Kinder muss zwei Bedingungen erfüllen — er darf die eigene Bubble nicht
 * berühren, und sein Umfang muss die Teilbäume aller Kinder nebeneinander
 * aufnehmen. Aus beidem folgt der Kreisradius, und damit die Abstände.
 */
function measure(
  node: LVNode,
  depth: number,
  dotted: boolean,
  collapsed: CollapsedMap,
  clusters: ClusterMap,
  out: Map<string, Measure>,
): number {
  const tier = tierOf(node, depth);
  const size = bubbleRadius(tier, dotted);
  const entry: Measure = {
    tier,
    dotted,
    density: 'normal',
    size,
    ring: 0,
    spread: size,
    childSpans: [],
  };
  out.set(node.id, entry);

  const children = node.children;
  if (collapsed[node.id] === true || children.length === 0) return size;

  entry.density = classifyChildren(children, clusters[node.id] === true);

  if (entry.density === 'cluster') {
    entry.ring = size + RADII.cluster + PARENT_PAD;
    entry.spread = entry.ring + RADII.cluster + GAP;
    return entry.spread;
  }

  const childDotted = entry.density === 'dots';
  const childBubble = bubbleRadius(tierOf(children[0], depth + 1), childDotted);
  let sum = 0;
  let widest = 0;
  for (const child of children) {
    const span = measure(child, depth + 1, childDotted, collapsed, clusters, out) + GAP;
    entry.childSpans.push(span);
    sum += span;
    widest = Math.max(widest, span);
  }

  // Zwei Bedingungen: die Kind-Bubbles müssen von der eigenen Bubble frei sein,
  // und der Umfang muss die Teilbäume nebeneinander aufnehmen. Für Letzteres
  // wird die Bogenlänge statt der Sehne gerechnet — die Näherung überschätzt
  // den Bedarf leicht und bleibt damit auf der sicheren Seite.
  const span = depth === 0 ? Math.PI * 2 : CHILD_SPAN;
  entry.ring = Math.max(size + childBubble + PARENT_PAD, (2 * sum) / span);
  entry.spread = entry.ring + widest;
  return entry.spread;
}

export function layoutRadial(
  root: LVNode,
  collapsed: CollapsedMap,
  clusters: ClusterMap = {},
): RadialLayout {
  const measures = new Map<string, Measure>();
  const extent = measure(root, 0, false, collapsed, clusters, measures);

  const nodes = new Map<string, PlacedNode>();

  // ── Durchgang 2 (von oben nach unten): Kinder auf den Kreis ihres
  // Elternknotens setzen, gefächert um die Richtung, aus der er selbst kommt.
  const place = (node: LVNode, depth: number, cx: number, cy: number, out: number): void => {
    const entry = measures.get(node.id);
    if (entry === undefined) return;

    nodes.set(node.id, {
      id: node.id,
      node,
      tier: entry.tier,
      cx,
      cy,
      angle: out,
      radius: Math.hypot(cx, cy),
      depth,
      dotted: entry.dotted,
      clusterOf: null,
      clusterCount: 0,
    });

    if (collapsed[node.id] === true) return;
    const children = node.children;
    if (children.length === 0) return;

    if (entry.density === 'cluster') {
      const id = `cluster:${node.id}`;
      nodes.set(id, {
        id,
        node: null,
        tier: 'cluster',
        cx: cx + Math.cos(out) * entry.ring,
        cy: cy + Math.sin(out) * entry.ring,
        angle: out,
        radius: Math.hypot(cx + Math.cos(out) * entry.ring, cy + Math.sin(out) * entry.ring),
        depth: depth + 1,
        dotted: false,
        clusterOf: node.id,
        clusterCount: children.length,
      });
      return;
    }

    const sum = entry.childSpans.reduce((total, value) => total + value, 0);
    if (sum === 0) return;
    const limit = depth === 0 ? Math.PI * 2 : CHILD_SPAN;
    const total = Math.min(limit, (2 * sum) / entry.ring);

    let cursor = out - total / 2;
    children.forEach((child, index) => {
      const slice = (entry.childSpans[index] / sum) * total;
      const angle = cursor + slice / 2;
      cursor += slice;
      place(
        child,
        depth + 1,
        cx + Math.cos(angle) * entry.ring,
        cy + Math.sin(angle) * entry.ring,
        angle,
      );
    });
  };
  place(root, 0, 0, 0, START_ANGLE);

  return { nodes, extent };
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
