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
//
// Positionen sitzen **nicht** auf diesem Ring, sondern als dicht gepackte Wolke
// um ihren Abschnitt (WP-41-5, Issue #46). Ein Ring wächst linear mit der Anzahl
// der Geschwister — 92 Positionen ergaben einen Ringradius von rund 1.460 und
// damit einen unlesbaren Graphen. Die Wolke wächst mit der Wurzel der Anzahl,
// weil sie eine Fläche füllt statt einen Umfang.

import { CLUSTER_AT, RADII, SIZE_MAX_FACTOR, tierOf, type Tier } from './constants';
import type { LVNode } from '../../types/lvNode';

export type Density = 'normal' | 'cloud' | 'cluster';

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
  /** Gehört zur Positionswolke dieses Knotens — sonst `null`. */
  cloudOf: string | null;
  /** Nur für Cluster-Knoten: ID des Elternknotens und Anzahl der Kinder. */
  clusterOf: string | null;
  clusterCount: number;
}

/** Positionswolke eines Abschnitts — Grundlage für Halo und Detailstufe. */
export interface PlacedCloud {
  id: string;
  parentId: string;
  cx: number;
  cy: number;
  /** Radius, der alle Positionen der Wolke umschließt. */
  radius: number;
  count: number;
}

export interface RadialLayout {
  nodes: Map<string, PlacedNode>;
  clouds: Map<string, PlacedCloud>;
  /** Radius, der den ganzen Graphen umschließt — Grundlage für "Einpassen". */
  extent: number;
}

/**
 * Knoten, deren Kinder gezeigt werden. Baum und Graph teilen sich dieses Set
 * (Issue #18) — deshalb steht hier das Offene und nicht das Eingeklappte.
 */
export type ExpandedSet = ReadonlySet<string>;
/** Cluster-Bubbles, die der Nutzer aufgelöst hat — ihre Kinder werden gezeigt. */
export type ClusterSet = ReadonlySet<string>;
/**
 * Knoten, die das Layout überspringt — im Modus "Ausblenden" die Nicht-Treffer.
 * Übersprungene Knoten belegen keinen Platz, die Wolke schrumpft also auf die
 * Treffer zusammen, statt Löcher zu lassen.
 */
export type SkipFn = (node: LVNode) => boolean;

/** Luft um den Teilbaum eines Kindes herum. */
const GAP = 18;
/** Luft zwischen der Bubble eines Knotens und dem Kreis seiner Kinder. */
const PARENT_PAD = 30;
/** Luft zwischen der Bubble und dem inneren Rand ihrer Positionswolke. */
const CLOUD_PAD = 14;
/**
 * Platz je Position in der Wolke. Positionen skalieren nicht mit dem
 * Größenmodus (Issue #41), deshalb genügt hier der feste Radius ohne die
 * Reserve, mit der Lose und Abschnitte gerechnet werden.
 */
const POSITION_SLOT = RADII.position;
/**
 * Abstand der Sonnenblumen-Spirale. Muss über dem doppelten Positionsradius
 * liegen, sonst berühren sich benachbarte Positionen im dichtesten Bereich.
 */
const CLOUD_SPACING = 2.2 * POSITION_SLOT;
/** Goldener Winkel — verteilt die Punkte gleichmäßig statt in sichtbaren Armen. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/**
 * Kinder fächern sich in die Halbebene vom Elternknoten weg auf. Die Grenze von
 * π ist nicht kosmetisch: dadurch bleibt jeder Teilbaum jenseits seines Knotens
 * und kann nie auf die Bubble des Großelternknotens zurückfallen — deshalb
 * genügt als Abstand zum Elternknoten dessen Bubble statt des ganzen Teilbaums.
 */
const CHILD_SPAN = Math.PI;
/**
 * Ab so vielen Ring-Kindern lohnt der weite Fächer: der Ringradius folgt dann
 * der Bogenlänge, und die sinkt mit dem größeren Winkel (Issue #41, G10).
 */
const WIDE_FAN_AT = 4;
/** Zum Elternknoten hin bleibt beidseitig dieser Sektor frei. */
const BACK_GAP = Math.PI / 3;
const WIDE_SPAN = 2 * Math.PI - 2 * BACK_GAP;
/** Der Graph beginnt nach oben statt nach rechts. */
const START_ANGLE = -Math.PI / 2;

/** Kinder, die auf den Ring kommen (alles außer Positionen). */
function ringChildrenOf(node: LVNode, skip: SkipFn | undefined): LVNode[] {
  return node.children.filter(
    (child) => child.kind !== 'position' && (skip === undefined || !skip(child)),
  );
}

/** Kinder, die in die Wolke kommen. */
function cloudChildrenOf(node: LVNode, skip: SkipFn | undefined): LVNode[] {
  return node.children.filter(
    (child) => child.kind === 'position' && (skip === undefined || !skip(child)),
  );
}

export function classifyChildren(children: readonly LVNode[], clusterExpanded = false): Density {
  if (children.length === 0) return 'normal';
  if (children.every((child) => child.kind === 'position')) return 'cloud';
  if (children.length > CLUSTER_AT) return clusterExpanded ? 'normal' : 'cluster';
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
function bubbleRadius(tier: Tier): number {
  // Positionen skalieren nicht mit dem Größenmodus — ihr Platz ist fest.
  if (tier === 'position') return RADII.position;
  return RADII[tier] * SIZE_MAX_FACTOR;
}

/**
 * Radius, der `count` Positionen um eine Bubble mit Radius `inner` fasst.
 * Die Wolke füllt eine Fläche: jede Position belegt denselben Flächenanteil,
 * damit wächst der Radius mit √count statt linear.
 */
function cloudRadius(count: number, inner: number): number {
  if (count === 0) return inner;
  return Math.sqrt(inner * inner + count * CLOUD_SPACING * CLOUD_SPACING) + POSITION_SLOT;
}

/** Was das Layout je Knoten aus dem Messdurchgang behält. */
interface Measure {
  tier: Tier;
  density: Density;
  /** Radius der Bubble. */
  size: number;
  /** Radius, den der Ring umschließen muss — Bubble oder Positionswolke. */
  core: number;
  /** Radius des Kreises, auf dem die Ring-Kinder sitzen. */
  ring: number;
  /** Winkelbereich, über den sich die Ring-Kinder verteilen. */
  span: number;
  /** Radius, der den gesamten Teilbaum umschließt. */
  spread: number;
  /** Kinder auf dem Ring, in Zeichenreihenfolge. */
  ringChildren: LVNode[];
  /** Positionen in der Wolke, in Zeichenreihenfolge. */
  cloudChildren: LVNode[];
  /** Platzbedarf je Ring-Kind inkl. Luft, in Reihenfolge der Kinder. */
  childSpans: number[];
}

/**
 * Durchgang 1 (von unten nach oben): Platzbedarf jedes Teilbaums. Der Kreis der
 * Kinder muss zwei Bedingungen erfüllen — er darf die eigene Bubble (bzw. die
 * Positionswolke) nicht berühren, und sein Umfang muss die Teilbäume aller
 * Kinder nebeneinander aufnehmen. Aus beidem folgt der Kreisradius, und damit
 * die Abstände.
 */
function measure(
  node: LVNode,
  depth: number,
  expanded: ExpandedSet,
  clusters: ClusterSet,
  skip: SkipFn | undefined,
  out: Map<string, Measure>,
): number {
  const tier = tierOf(node, depth);
  const size = bubbleRadius(tier);
  const entry: Measure = {
    tier,
    density: 'normal',
    size,
    core: size,
    ring: 0,
    span: CHILD_SPAN,
    spread: size,
    ringChildren: [],
    cloudChildren: [],
    childSpans: [],
  };
  out.set(node.id, entry);

  if (!expanded.has(node.id) || node.children.length === 0) return size;

  entry.cloudChildren = cloudChildrenOf(node, skip);
  entry.core = cloudRadius(entry.cloudChildren.length, size + CLOUD_PAD);
  entry.spread = entry.core;

  const ringChildren = ringChildrenOf(node, skip);
  if (ringChildren.length === 0) {
    entry.density = entry.cloudChildren.length > 0 ? 'cloud' : 'normal';
    return entry.spread;
  }

  // Schwellwert steht in `classifyChildren` — eine Regel, eine Stelle.
  if (classifyChildren(ringChildren, clusters.has(node.id)) === 'cluster') {
    entry.density = 'cluster';
    entry.ringChildren = ringChildren;
    entry.ring = entry.core + RADII.cluster + PARENT_PAD;
    entry.spread = entry.ring + RADII.cluster + GAP;
    return entry.spread;
  }

  entry.density = 'normal';
  entry.ringChildren = ringChildren;

  const childBubble = bubbleRadius(tierOf(ringChildren[0], depth + 1));
  let sum = 0;
  let widestSpan = 0;
  let widestSpread = 0;
  for (const child of ringChildren) {
    const spread = measure(child, depth + 1, expanded, clusters, skip, out);
    const span = spread + GAP;
    entry.childSpans.push(span);
    sum += span;
    widestSpan = Math.max(widestSpan, span);
    widestSpread = Math.max(widestSpread, spread);
  }

  // Der weite Fächer lohnt erst ab mehreren Kindern. Eine Kette bekäme sonst
  // den vollen Kreis zugesprochen und müsste dafür den ganzen Teilbaum ihres
  // einzigen Kindes umrunden (siehe Ring-Bedingung unten).
  const wide = ringChildren.length >= (depth === 0 ? 2 : WIDE_FAN_AT);
  entry.span = wide ? (depth === 0 ? Math.PI * 2 : WIDE_SPAN) : CHILD_SPAN;

  // Zwei Bedingungen: die Kind-Bubbles müssen von der eigenen Bubble frei sein,
  // und der Umfang muss die Teilbäume nebeneinander aufnehmen. Für Letzteres
  // wird die Bogenlänge statt der Sehne gerechnet — die Näherung überschätzt
  // den Bedarf leicht und bleibt damit auf der sicheren Seite.
  //
  // Bei genau einem Kind gibt es nichts nebeneinander zu setzen: dann zählt nur
  // der Abstand zur eigenen Bubble. Sonst würde eine Kette (Projekt → Los →
  // Hauptabschnitt) auf die Breite ihres gesamten Teilbaums auseinandergezogen
  // und die erste echte Verzweigung läge weit außen (Issue #41, G1).
  const seats = ringChildren.length > 1 ? (2 * sum) / entry.span : 0;
  entry.ring = Math.max(entry.core + childBubble + PARENT_PAD, seats);

  // Beim weiten Fächer können Kinder seitlich am Elternknoten vorbei nach hinten
  // reichen. Dann genügt die Bubble als Abstand nicht mehr — der Ring muss den
  // größten Teilbaum tragen. Bei gleichmäßigen Geschwistern ist die Bedingung
  // ohnehin erfüllt; sie greift nur, wenn ein Kind alle anderen überragt.
  if (wide) {
    entry.ring = Math.max(entry.ring, entry.core + widestSpread + PARENT_PAD);
  }

  entry.spread = Math.max(entry.core, entry.ring + widestSpan);
  return entry.spread;
}

export function layoutRadial(
  root: LVNode,
  expanded: ExpandedSet,
  clusters: ClusterSet = new Set(),
  skip?: SkipFn,
): RadialLayout {
  const measures = new Map<string, Measure>();
  const extent = measure(root, 0, expanded, clusters, skip, measures);

  const nodes = new Map<string, PlacedNode>();
  const clouds = new Map<string, PlacedCloud>();

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
      cloudOf: null,
      clusterOf: null,
      clusterCount: 0,
    });

    // Positionswolke: Sonnenblumen-Anordnung um die eigene Bubble. Position i
    // liegt bei Radius √(innen² + i·c²) — gleicher Flächenanteil je Position —
    // und Winkel i·goldener Winkel.
    if (entry.cloudChildren.length > 0) {
      const inner = entry.size + CLOUD_PAD;
      entry.cloudChildren.forEach((child, index) => {
        const r = Math.sqrt(inner * inner + (index + 0.5) * CLOUD_SPACING * CLOUD_SPACING);
        const angle = out + index * GOLDEN_ANGLE;
        nodes.set(child.id, {
          id: child.id,
          node: child,
          tier: tierOf(child, depth + 1),
          cx: cx + Math.cos(angle) * r,
          cy: cy + Math.sin(angle) * r,
          angle,
          radius: Math.hypot(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r),
          depth: depth + 1,
          cloudOf: node.id,
          clusterOf: null,
          clusterCount: 0,
        });
      });
      clouds.set(node.id, {
        id: `cloud:${node.id}`,
        parentId: node.id,
        cx,
        cy,
        radius: entry.core,
        count: entry.cloudChildren.length,
      });
    }

    if (entry.ringChildren.length === 0) return;

    if (entry.density === 'cluster') {
      const id = `cluster:${node.id}`;
      const ccx = cx + Math.cos(out) * entry.ring;
      const ccy = cy + Math.sin(out) * entry.ring;
      nodes.set(id, {
        id,
        node: null,
        tier: 'cluster',
        cx: ccx,
        cy: ccy,
        angle: out,
        radius: Math.hypot(ccx, ccy),
        depth: depth + 1,
        cloudOf: null,
        clusterOf: node.id,
        clusterCount: entry.ringChildren.length,
      });
      return;
    }

    const sum = entry.childSpans.reduce((total, value) => total + value, 0);
    if (sum === 0) return;
    const total = Math.min(entry.span, (2 * sum) / entry.ring);

    let cursor = out - total / 2;
    entry.ringChildren.forEach((child, index) => {
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

  return { nodes, clouds, extent };
}

/** Alles bis unter Tiefe `depth` offen — der Rest bleibt eingeklappt. */
export function expandedToDepth(root: LVNode, depth: number): Set<string> {
  const expanded = new Set<string>();
  const visit = (node: LVNode, level: number): void => {
    if (level < depth && node.children.length > 0) expanded.add(node.id);
    for (const child of node.children) visit(child, level + 1);
  };
  visit(root, 0);
  return expanded;
}

/**
 * Knoten, deren Kinder zu einer Cluster-Bubble zusammengefasst würden —
 * „Alles ausklappen" löst auch diese auf (Issue #41). Positionen zählen nicht
 * mit: sie werden nie geclustert, sondern liegen in der Wolke (WP-41-5).
 */
export function allClusterParents(root: LVNode): Set<string> {
  const parents = new Set<string>();
  const visit = (node: LVNode): void => {
    if (classifyChildren(ringChildrenOf(node, undefined)) === 'cluster') parents.add(node.id);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return parents;
}

/** Jeder Knoten mit Kindern offen. */
export function allExpanded(root: LVNode): Set<string> {
  const expanded = new Set<string>();
  const visit = (node: LVNode): void => {
    if (node.children.length > 0) expanded.add(node.id);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return expanded;
}
